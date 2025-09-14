import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'default-key-change-in-production'

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
}

export function decrypt(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    
    // Check if decryption was successful
    if (!decrypted) {
      console.error('Decryption failed - empty result for:', encryptedText.substring(0, 20) + '...')
      throw new Error('Decryption failed - empty result')
    }
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    console.error('Encrypted text (first 50 chars):', encryptedText.substring(0, 50))
    console.error('Encryption key length:', ENCRYPTION_KEY.length)
    throw error
  }
}

// Safe decrypt function that returns a fallback value instead of throwing
export function safeDecrypt(encryptedText: string, fallback: string = '[Decryption Error]'): string {
  try {
    return decrypt(encryptedText)
  } catch (error) {
    console.warn('Safe decrypt failed, using fallback:', fallback)
    return fallback
  }
}
