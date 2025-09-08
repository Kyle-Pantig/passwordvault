import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  isLimited: boolean
  remainingAttempts: number
  lockoutUntil?: string
  nextAttemptAllowed?: string
  delayMs?: number
}

export interface RateLimitCheck {
  ipLimited: RateLimitResult
  emailLimited: RateLimitResult
  isBlocked: boolean
  maxDelayMs: number
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return '127.0.0.1' // fallback for local development
}

/**
 * Check rate limiting using direct database queries (simpler approach)
 */
export async function checkRateLimit(
  ip: string,
  email: string
): Promise<RateLimitCheck> {
  try {
    const supabase = await createClient()
    
    // Check both IP and email attempts in parallel
    const [ipResult, emailResult] = await Promise.all([
      supabase
        .from('login_attempts_ip')
        .select('*')
        .eq('ip_address', ip)
        .single(),
      supabase
        .from('login_attempts_email')
        .select('*')
        .eq('email', email)
        .single()
    ])
    
    const { data: ipData, error: ipError } = ipResult
    const { data: emailData, error: emailError } = emailResult
    
    const now = new Date()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const ipMaxAttempts = 5
    const emailMaxAttempts = 3
    
    // Progressive lockout durations
    const getLockoutDuration = (attemptCount: number) => {
      if (attemptCount >= 6) return 30 * 60 * 1000 // 30 minutes for 6+ attempts (locked)
      if (attemptCount === 5) return 5 * 60 * 1000  // 5 minutes for 5th attempt (disabled)
      if (attemptCount === 3) return 1 * 60 * 1000  // 1 minute for 3rd attempt (disabled)
      return 0 // No lockout for other attempts
    }
    
    // Check if account should be locked/disabled based on attempt count
    const shouldBeLocked = (attemptCount: number) => {
      return attemptCount >= 6 // Only lock for 6+ attempts
    }
    
    const shouldBeDisabled = (attemptCount: number) => {
      return attemptCount === 3 || attemptCount === 5 // Disable for 3rd attempt and 5th attempt only
    }
    
    // Process IP rate limiting
    let ipLimited: RateLimitResult = {
      isLimited: false,
      remainingAttempts: ipMaxAttempts
    }
    
    if (ipData && !ipError) {
      const lastAttempt = new Date(ipData.last_attempt).getTime()
      const isWithinWindow = (now.getTime() - lastAttempt) <= windowMs
      
      if (ipData.is_locked && ipData.lockout_until) {
        const lockoutUntil = new Date(ipData.lockout_until).getTime()
        if (now.getTime() < lockoutUntil) {
          ipLimited = {
            isLimited: true,
            remainingAttempts: 0,
            lockoutUntil: ipData.lockout_until,
            nextAttemptAllowed: ipData.lockout_until
          }
        } else {
          // Lockout expired, reset (don't await - fire and forget)
          supabase
            .from('login_attempts_ip')
            .delete()
            .eq('ip_address', ip)
            .then(() => {}) // Fire and forget
        }
      } else if (isWithinWindow && shouldBeLocked(ipData.attempt_count)) {
        // Lock for 6+ attempts
        let lockoutUntil = ipData.lockout_until
        
        // Only set new lockout if one doesn't exist or has expired
        if (!lockoutUntil || new Date(lockoutUntil).getTime() <= now.getTime()) {
          const lockoutDuration = getLockoutDuration(ipData.attempt_count)
          lockoutUntil = new Date(now.getTime() + lockoutDuration).toISOString()
          
          supabase
            .from('login_attempts_ip')
            .update({
              is_locked: true,
              lockout_until: lockoutUntil
            })
            .eq('ip_address', ip)
            .then(() => {}) // Fire and forget
        }
        
        ipLimited = {
          isLimited: true,
          remainingAttempts: 0,
          lockoutUntil: lockoutUntil,
          nextAttemptAllowed: lockoutUntil
        }
      } else if (isWithinWindow && shouldBeDisabled(ipData.attempt_count)) {
        // Disable for 3rd attempt and 5th attempt only
        let lockoutUntil = ipData.lockout_until
        
        // Only set new lockout if one doesn't exist or has expired
        if (!lockoutUntil || new Date(lockoutUntil).getTime() <= now.getTime()) {
          const lockoutDuration = getLockoutDuration(ipData.attempt_count)
          lockoutUntil = new Date(now.getTime() + lockoutDuration).toISOString()
          
          supabase
            .from('login_attempts_ip')
            .update({
              is_locked: false, // Not locked, just disabled
              lockout_until: lockoutUntil
            })
            .eq('ip_address', ip)
            .then(() => {}) // Fire and forget
        }
        
        ipLimited = {
          isLimited: true,
          remainingAttempts: 0,
          lockoutUntil: lockoutUntil,
          nextAttemptAllowed: lockoutUntil
        }
      } else if (isWithinWindow && !shouldBeLocked(ipData.attempt_count) && !shouldBeDisabled(ipData.attempt_count)) {
        // Clear lockout for attempts that shouldn't be locked or disabled (like 4th attempt)
        if (ipData.lockout_until) {
          supabase
            .from('login_attempts_ip')
            .update({
              is_locked: false,
              lockout_until: null
            })
            .eq('ip_address', ip)
            .then(() => {}) // Fire and forget
        }
        
        // Only add delay after 2+ attempts, and make it shorter
        const delayMs = ipData.attempt_count >= 2 ? Math.min((ipData.attempt_count - 1) * 1000, 3000) : 0
        ipLimited = {
          isLimited: false,
          remainingAttempts: 0, // Don't show remaining attempts
          delayMs: delayMs
        }
      } else if (isWithinWindow) {
        // Only add delay after 2+ attempts, and make it shorter
        const delayMs = ipData.attempt_count >= 2 ? Math.min((ipData.attempt_count - 1) * 1000, 3000) : 0
        ipLimited = {
          isLimited: false,
          remainingAttempts: 0, // Don't show remaining attempts
          delayMs: delayMs
        }
      } else {
        // Outside window, reset (don't await - fire and forget)
        supabase
          .from('login_attempts_ip')
          .delete()
          .eq('ip_address', ip)
          .then(() => {}) // Fire and forget
      }
    }
    
    // Process email rate limiting
    let emailLimited: RateLimitResult = {
      isLimited: false,
      remainingAttempts: emailMaxAttempts
    }
    
    if (emailData && !emailError) {
      const lastAttempt = new Date(emailData.last_attempt).getTime()
      const isWithinWindow = (now.getTime() - lastAttempt) <= windowMs
      
      if (emailData.is_locked && emailData.lockout_until) {
        const lockoutUntil = new Date(emailData.lockout_until).getTime()
        if (now.getTime() < lockoutUntil) {
          emailLimited = {
            isLimited: true,
            remainingAttempts: 0,
            lockoutUntil: emailData.lockout_until,
            nextAttemptAllowed: emailData.lockout_until
          }
        } else {
          // Lockout expired, reset (don't await - fire and forget)
          supabase
            .from('login_attempts_email')
            .delete()
            .eq('email', email)
            .then(() => {}) // Fire and forget
        }
      } else if (isWithinWindow && shouldBeLocked(emailData.attempt_count)) {
        // Lock for 6+ attempts
        let lockoutUntil = emailData.lockout_until
        
        // Only set new lockout if one doesn't exist or has expired
        if (!lockoutUntil || new Date(lockoutUntil).getTime() <= now.getTime()) {
          const lockoutDuration = getLockoutDuration(emailData.attempt_count)
          lockoutUntil = new Date(now.getTime() + lockoutDuration).toISOString()
          
          supabase
            .from('login_attempts_email')
            .update({
              is_locked: true,
              lockout_until: lockoutUntil
            })
            .eq('email', email)
            .then(() => {}) // Fire and forget
        }
        
        emailLimited = {
          isLimited: true,
          remainingAttempts: 0,
          lockoutUntil: lockoutUntil,
          nextAttemptAllowed: lockoutUntil
        }
      } else if (isWithinWindow && shouldBeDisabled(emailData.attempt_count)) {
        // Disable for 3rd attempt and 5th attempt only
        let lockoutUntil = emailData.lockout_until
        
        // Only set new lockout if one doesn't exist or has expired
        if (!lockoutUntil || new Date(lockoutUntil).getTime() <= now.getTime()) {
          const lockoutDuration = getLockoutDuration(emailData.attempt_count)
          lockoutUntil = new Date(now.getTime() + lockoutDuration).toISOString()
          
          supabase
            .from('login_attempts_email')
            .update({
              is_locked: false, // Not locked, just disabled
              lockout_until: lockoutUntil
            })
            .eq('email', email)
            .then(() => {}) // Fire and forget
        }
        
        emailLimited = {
          isLimited: true,
          remainingAttempts: 0,
          lockoutUntil: lockoutUntil,
          nextAttemptAllowed: lockoutUntil
        }
      } else if (isWithinWindow && !shouldBeLocked(emailData.attempt_count) && !shouldBeDisabled(emailData.attempt_count)) {
        // Clear lockout for attempts that shouldn't be locked or disabled (like 4th attempt)
        if (emailData.lockout_until) {
          supabase
            .from('login_attempts_email')
            .update({
              is_locked: false,
              lockout_until: null
            })
            .eq('email', email)
            .then(() => {}) // Fire and forget
        }
        
        // Only add delay after 2+ attempts, and make it shorter
        const delayMs = emailData.attempt_count >= 2 ? Math.min((emailData.attempt_count - 1) * 2000, 5000) : 0
        emailLimited = {
          isLimited: false,
          remainingAttempts: 0, // Don't show remaining attempts
          delayMs: delayMs
        }
      } else if (isWithinWindow) {
        // Only add delay after 2+ attempts, and make it shorter
        const delayMs = emailData.attempt_count >= 2 ? Math.min((emailData.attempt_count - 1) * 2000, 5000) : 0
        emailLimited = {
          isLimited: false,
          remainingAttempts: 0, // Don't show remaining attempts
          delayMs: delayMs
        }
      } else {
        // Outside window, reset (don't await - fire and forget)
        supabase
          .from('login_attempts_email')
          .delete()
          .eq('email', email)
          .then(() => {}) // Fire and forget
      }
    }
    
    const isBlocked = ipLimited.isLimited || emailLimited.isLimited
    const maxDelayMs = Math.max(ipLimited.delayMs || 0, emailLimited.delayMs || 0)
    
    return {
      ipLimited,
      emailLimited,
      isBlocked,
      maxDelayMs
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open - allow the request if rate limiting fails
    return {
      ipLimited: { isLimited: false, remainingAttempts: 5 },
      emailLimited: { isLimited: false, remainingAttempts: 3 },
      isBlocked: false,
      maxDelayMs: 0
    }
  }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(ip: string, email: string): Promise<void> {
  try {
    const supabase = await createClient()
    const now = new Date().toISOString()
    
    // Check both records in parallel
    const [ipResult, emailResult] = await Promise.all([
      supabase
        .from('login_attempts_ip')
        .select('attempt_count')
        .eq('ip_address', ip)
        .single(),
      supabase
        .from('login_attempts_email')
        .select('attempt_count')
        .eq('email', email)
        .single()
    ])
    
    const { data: existingIp } = ipResult
    const { data: existingEmail } = emailResult
    
    // Update both records in parallel
    const updatePromises = []
    
    if (existingIp) {
      updatePromises.push(
        supabase
          .from('login_attempts_ip')
          .update({
            attempt_count: existingIp.attempt_count + 1,
            last_attempt: now,
            updated_at: now
          })
          .eq('ip_address', ip)
      )
    } else {
      updatePromises.push(
        supabase
          .from('login_attempts_ip')
          .insert({
            ip_address: ip,
            attempt_count: 1,
            first_attempt: now,
            last_attempt: now,
            is_locked: false,
            lockout_until: null
          })
      )
    }
    
    if (existingEmail) {
      updatePromises.push(
        supabase
          .from('login_attempts_email')
          .update({
            attempt_count: existingEmail.attempt_count + 1,
            last_attempt: now,
            updated_at: now
          })
          .eq('email', email)
      )
    } else {
      updatePromises.push(
        supabase
          .from('login_attempts_email')
          .insert({
            email: email,
            attempt_count: 1,
            first_attempt: now,
            last_attempt: now,
            is_locked: false,
            lockout_until: null
          })
      )
    }
    
    // Execute all updates in parallel
    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Failed to record login attempt:', error)
  }
}

/**
 * Reset login attempts after successful login
 */
export async function resetLoginAttempts(ip: string, email: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Reset both IP and email attempts in parallel
    await Promise.all([
      supabase
        .from('login_attempts_ip')
        .delete()
        .eq('ip_address', ip),
      supabase
        .from('login_attempts_email')
        .delete()
        .eq('email', email)
    ])
  } catch (error) {
    console.error('Failed to reset login attempts:', error)
  }
}

/**
 * Format rate limit message for user display
 */
export function formatRateLimitMessage(check: RateLimitCheck): string {
  if (check.ipLimited.isLimited && check.emailLimited.isLimited) {
    const lockoutTime = check.ipLimited.lockoutUntil || check.emailLimited.lockoutUntil
    if (lockoutTime) {
      const lockoutDate = new Date(lockoutTime)
      const now = new Date()
      const minutesLeft = Math.ceil((lockoutDate.getTime() - now.getTime()) / (1000 * 60))
      if (minutesLeft >= 30) {
        return `Account locked due to too many attempts. Please try again in ${minutesLeft} minutes.`
      } else {
        return `Account temporarily disabled. Please try again in ${minutesLeft} minutes.`
      }
    }
    return 'Account temporarily disabled. Please try again later.'
  }
  
  if (check.ipLimited.isLimited) {
    const lockoutTime = check.ipLimited.lockoutUntil
    if (lockoutTime) {
      const lockoutDate = new Date(lockoutTime)
      const now = new Date()
      const minutesLeft = Math.ceil((lockoutDate.getTime() - now.getTime()) / (1000 * 60))
      if (minutesLeft < 1) {
        return `Account temporarily disabled. Please try again in less than a minute.`
      } else if (minutesLeft === 1) {
        return `Account temporarily disabled. Please try again in 1 minute.`
      } else if (minutesLeft === 5) {
        return `Account temporarily disabled. Please try again in 5 minutes.`
      } else if (minutesLeft >= 30) {
        return `Account locked due to too many attempts. Please try again in ${minutesLeft} minutes.`
      } else {
        return `Account temporarily disabled. Please try again in ${minutesLeft} minutes.`
      }
    }
    return 'Account temporarily disabled. Please try again later.'
  }
  
  if (check.emailLimited.isLimited) {
    const lockoutTime = check.emailLimited.lockoutUntil
    if (lockoutTime) {
      const lockoutDate = new Date(lockoutTime)
      const now = new Date()
      const minutesLeft = Math.ceil((lockoutDate.getTime() - now.getTime()) / (1000 * 60))
      if (minutesLeft < 1) {
        return `Account temporarily disabled. Please try again in less than a minute.`
      } else if (minutesLeft === 1) {
        return `Account temporarily disabled. Please try again in 1 minute.`
      } else if (minutesLeft === 5) {
        return `Account temporarily disabled. Please try again in 5 minutes.`
      } else if (minutesLeft >= 30) {
        return `Account locked due to too many attempts. Please try again in ${minutesLeft} minutes.`
      } else {
        return `Account temporarily disabled. Please try again in ${minutesLeft} minutes.`
      }
    }
    return 'Account temporarily disabled. Please try again later.'
  }
  
  // No delay messages - silent rate limiting
  return ''
}

/**
 * Get remaining attempts message
 */
export function getRemainingAttemptsMessage(check: RateLimitCheck): string {
  const minAttempts = Math.min(
    check.ipLimited.remainingAttempts,
    check.emailLimited.remainingAttempts
  )
  
  if (minAttempts <= 0) {
    return 'No attempts remaining. Please wait before trying again.'
  }
  
  if (minAttempts === 1) {
    return '1 attempt remaining before temporary lockout.'
  }
  
  return `${minAttempts} attempts remaining before temporary lockout.`
}
