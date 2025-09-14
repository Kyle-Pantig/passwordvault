const CryptoJS = require('crypto-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔑 Testing encryption key consistency...')

// Test the encryption key
const encryptionKey = process.env.ENCRYPTION_KEY
console.log(`Server-side key: ${encryptionKey}`)
console.log(`Key length: ${encryptionKey ? encryptionKey.length : 'undefined'}`)

// Test encryption/decryption
if (encryptionKey) {
  const testText = 'test message'
  const encrypted = CryptoJS.AES.encrypt(testText, encryptionKey).toString()
  console.log(`Encrypted: ${encrypted}`)
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey).toString(CryptoJS.enc.Utf8)
    console.log(`Decrypted: ${decrypted}`)
    console.log(`Match: ${testText === decrypted}`)
  } catch (error) {
    console.log(`Decryption error: ${error.message}`)
  }
} else {
  console.log('❌ No encryption key found!')
}

// Test with the specific failing encrypted text
const failingText = 'U2FsdGVkX18Qt2u6lkNc4kFTwtkB3X3pGXJeO1eZLK4='
console.log(`\n🔍 Testing failing encrypted text: ${failingText}`)

if (encryptionKey) {
  try {
    const decrypted = CryptoJS.AES.decrypt(failingText, encryptionKey).toString(CryptoJS.enc.Utf8)
    console.log(`Decrypted: ${decrypted}`)
  } catch (error) {
    console.log(`Decryption error: ${error.message}`)
  }
}
