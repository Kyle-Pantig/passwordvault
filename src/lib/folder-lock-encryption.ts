import crypto from 'crypto'

// Generate a random salt
export function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Derive key from password using PBKDF2
export function deriveKey(password: string, salt: string): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256')
}

// Encrypt data using AES-256-GCM
export function encryptFolderLockData(data: string, password: string, salt: string): string {
  const key = deriveKey(password, salt)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('folder-lock', 'utf8'))
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Combine IV, authTag, and encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

// Decrypt data using AES-256-GCM
export function decryptFolderLockData(encryptedData: string, password: string, salt: string): string {
  try {
    const key = deriveKey(password, salt)
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAAD(Buffer.from('folder-lock', 'utf8'))
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    // This is expected when using wrong passcode - don't log as error
    throw new Error('Invalid passcode')
  }
}

// Validate passcode format
export function validatePasscodeFormat(passcode: string, lockType: 'passcode_4' | 'passcode_6' | 'password'): boolean {
  switch (lockType) {
    case 'passcode_4':
      return /^\d{4}$/.test(passcode)
    case 'passcode_6':
      return /^\d{6}$/.test(passcode)
    case 'password':
      return passcode.length >= 4 // Minimum 4 characters for password
    default:
      return false
  }
}

// Hash passcode for storage (one-way hash for verification)
export function hashPasscode(passcode: string, salt: string): string {
  return crypto.pbkdf2Sync(passcode, salt, 100000, 64, 'sha256').toString('hex')
}

// Verify passcode against hash
export function verifyPasscode(passcode: string, hash: string, salt: string): boolean {
  const computedHash = hashPasscode(passcode, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'))
}
