export interface PasswordOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
  excludeSimilar?: boolean;
  excludeAmbiguous?: boolean;
}

export interface GeneratedPassword {
  password: string;
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const SIMILAR_CHARS = 'il1Lo0O'; // Characters that look similar
const AMBIGUOUS_CHARS = '{}[]()/\\\'"`~,;.<>'; // Characters that might be ambiguous

export function generateStrongPassword(options: PasswordOptions = {}): GeneratedPassword {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = true,
    excludeAmbiguous = true
  } = options;

  let charset = '';
  
  if (includeUppercase) {
    charset += UPPERCASE;
  }
  if (includeLowercase) {
    charset += LOWERCASE;
  }
  if (includeNumbers) {
    charset += NUMBERS;
  }
  if (includeSymbols) {
    charset += SYMBOLS;
  }

  // Remove similar characters if requested
  if (excludeSimilar) {
    SIMILAR_CHARS.split('').forEach(char => {
      charset = charset.replace(new RegExp(char, 'g'), '');
    });
  }

  // Remove ambiguous characters if requested
  if (excludeAmbiguous) {
    AMBIGUOUS_CHARS.split('').forEach(char => {
      charset = charset.replace(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    });
  }

  if (charset.length === 0) {
    throw new Error('No character set available for password generation');
  }

  // Ensure at least one character from each required category
  let password = '';
  const requiredChars = [];
  
  if (includeUppercase) {
    const char = UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)];
    requiredChars.push(char);
  }
  if (includeLowercase) {
    const char = LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)];
    requiredChars.push(char);
  }
  if (includeNumbers) {
    const char = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    requiredChars.push(char);
  }
  if (includeSymbols) {
    const char = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    requiredChars.push(char);
  }

  // Add required characters
  password = requiredChars.join('');

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  password = password.split('').sort(() => Math.random() - 0.5).join('');

  // Calculate strength
  const strength = calculatePasswordStrength(password);

  return {
    password,
    strength: strength.strength,
    score: strength.score
  };
}

function calculatePasswordStrength(password: string): {
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
} {
  let score = 0;

  // Length scoring
  if (password.length >= 12) {
    score += 3;
  } else if (password.length >= 8) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Bonus for length
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Penalty for patterns
  if (/(.)\1{2,}/.test(password)) score -= 1;
  if (/123|abc|qwe|asd|zxc/i.test(password)) score -= 1;

  // Determine strength
  let strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score <= 2) {
    strength = 'very-weak';
  } else if (score <= 4) {
    strength = 'weak';
  } else if (score <= 6) {
    strength = 'medium';
  } else if (score <= 8) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return { strength, score };
}

// Preset configurations for different use cases
export const PASSWORD_PRESETS = {
  basic: {
    length: 12,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
    excludeSimilar: true,
    excludeAmbiguous: true
  },
  strong: {
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true,
    excludeAmbiguous: true
  },
  maximum: {
    length: 24,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false
  },
  api: {
    length: 32,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true,
    excludeAmbiguous: true
  }
};
