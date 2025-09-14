export interface PasswordRiskAnalysis {
  weakCredentials: number;
  reusedCredentials: number;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  weakPasswords: Array<{
    id: string;
    service_name: string;
    username: string;
    strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
    issues: string[];
    isAdvanced?: boolean;
    fieldName?: string;
  }>;
  reusedPasswords: Array<{
    password: string;
    count: number;
    services: Array<{
      id: string;
      service_name: string;
      username: string;
      isAdvanced?: boolean;
      fieldName?: string;
    }>;
  }>;
}

export interface AdvancedCredentialField {
  id: string
  name?: string
  value: string
  isMasked?: boolean
}

export interface Credential {
  id: string;
  user_id: string;
  service_name: string;
  service_url?: string;
  credential_type: 'basic' | 'advanced';
  username?: string;
  password?: string;
  custom_fields: AdvancedCredentialField[];
  notes?: string;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

// Common weak passwords list
const COMMON_WEAK_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  '123123', 'dragon', 'master', 'hello', 'freedom', 'whatever',
  'qazwsx', 'trustno1', 'jordan', 'jennifer', 'zxcvbnm', 'asdfgh',
  'hunter', 'buster', 'soccer', 'harley', 'ranger', 'jordan23',
  'fuckyou', '1234', 'shadow', 'superman', 'qwertyuiop', 'batman',
  'tigger', 'sunshine', 'iloveyou', '2000', 'charlie', 'robert',
  'thomas', 'hockey', 'ranger', 'daniel', 'starwars', 'klaster',
  '112233', 'george', 'computer', 'michelle', 'jessica', 'pepper',
  '12345', 'zaq1zaq1', 'jordan', 'love', 'baby', 'monkey', 'lovely',
  'shadow', 'ashley', 'ninja', 'michael', 'mustang', 'letmein',
  'baseball', 'master', 'hello', 'access', 'flower', '1234567890',
  'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael',
  'ninja', 'mustang', 'password1', 'qwerty123', 'admin', 'qwertyuiop'
];

// Password strength calculation
export function calculatePasswordStrength(password: string): {
  strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    issues.push('Too short (minimum 8 characters)');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character variety checks
  if (!/[a-z]/.test(password)) {
    issues.push('Missing lowercase letters');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    issues.push('Missing uppercase letters');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    issues.push('Missing numbers');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    issues.push('Missing special characters');
  } else {
    score += 1;
  }

  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    issues.push('Contains repeated characters');
    score -= 1;
  }

  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    issues.push('Contains common sequences');
    score -= 1;
  }

  // Common password check
  if (COMMON_WEAK_PASSWORDS.includes(password.toLowerCase())) {
    issues.push('Common weak password');
    score = 0;
  }

  // Dictionary word check (simple)
  const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'hello', 'test'];
  if (commonWords.some(word => password.toLowerCase().includes(word))) {
    issues.push('Contains common dictionary words');
    score -= 1;
  }

  // Determine strength level
  let strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score <= 1) {
    strength = 'very-weak';
  } else if (score <= 3) {
    strength = 'weak';
  } else if (score <= 5) {
    strength = 'medium';
  } else if (score <= 7) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return { strength, score, issues };
}

// Analyze password risk across all credentials
export function analyzePasswordRisk(credentials: Credential[]): PasswordRiskAnalysis {
  const weakPasswords: PasswordRiskAnalysis['weakPasswords'] = [];
  const passwordCounts = new Map<string, Array<{ id: string; service_name: string; username: string; isAdvanced?: boolean; fieldName?: string }>>();
  
  let weakCount = 0;

  // Analyze each credential
  credentials.forEach(credential => {
    // Analyze basic credentials with passwords
    if (credential.credential_type === 'basic' && credential.password && credential.username) {
      const analysis = calculatePasswordStrength(credential.password);
      
      // Check for weak passwords
      if (analysis.strength === 'very-weak' || analysis.strength === 'weak') {
        weakCount++;
        weakPasswords.push({
          id: credential.id,
          service_name: credential.service_name,
          username: credential.username,
          strength: analysis.strength,
          issues: analysis.issues
        });
      }

      // Track password reuse
      if (!passwordCounts.has(credential.password)) {
        passwordCounts.set(credential.password, []);
      }
      passwordCounts.get(credential.password)!.push({
        id: credential.id,
        service_name: credential.service_name,
        username: credential.username,
        isAdvanced: false
      });
    }
    
    // Analyze advanced credentials with masked fields
    if (credential.credential_type === 'advanced' && credential.custom_fields) {
      credential.custom_fields.forEach(field => {
        // Only analyze fields that are masked (likely passwords)
        if (field.isMasked && field.value) {
          const analysis = calculatePasswordStrength(field.value);
          
          // Check for weak passwords
          if (analysis.strength === 'very-weak' || analysis.strength === 'weak') {
            weakCount++;
            weakPasswords.push({
              id: `${credential.id}-${field.id}`,
              service_name: credential.service_name,
              username: credential.service_name, // Use service name for display
              strength: analysis.strength,
              issues: analysis.issues,
              isAdvanced: true,
              fieldName: field.name || 'Field' || 'Field' // Store the actual field name or default
            });
          }

          // Track password reuse
          if (!passwordCounts.has(field.value)) {
            passwordCounts.set(field.value, []);
          }
          passwordCounts.get(field.value)!.push({
            id: `${credential.id}-${field.id}`,
            service_name: credential.service_name,
            username: credential.service_name,
            isAdvanced: true,
            fieldName: field.name || 'Field'
          });
        }
      });
    }
  });

  // Find reused passwords
  const reusedPasswords: PasswordRiskAnalysis['reusedPasswords'] = [];
  passwordCounts.forEach((services, password) => {
    if (services.length > 1) {
      reusedPasswords.push({
        password: password,
        count: services.length,
        services: services
      });
    }
  });

  const reusedCount = reusedPasswords.reduce((sum, item) => sum + item.count - 1, 0);

  // Calculate risk score (0-1000)
  const weakScore = weakCount * 50; // 50 points per weak password
  const reusedScore = reusedCount * 30; // 30 points per reused password
  const totalCredentials = credentials.length;
  const riskScore = Math.min(1000, weakScore + reusedScore + (totalCredentials * 5)); // Base score for having credentials

  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  if (riskScore <= 200) {
    riskLevel = 'low';
  } else if (riskScore <= 500) {
    riskLevel = 'moderate';
  } else if (riskScore <= 800) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }

  return {
    weakCredentials: weakCount,
    reusedCredentials: reusedCount,
    riskScore: Math.round(riskScore),
    riskLevel,
    weakPasswords,
    reusedPasswords
  };
}

// Get risk level color
export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'low':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    case 'high':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
    case 'critical':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
  }
}

// Get risk level text
export function getRiskLevelText(riskLevel: string): string {
  switch (riskLevel) {
    case 'low':
      return 'Low Risk';
    case 'moderate':
      return 'Moderate Risk';
    case 'high':
      return 'High Risk';
    case 'critical':
      return 'Critical Risk';
    default:
      return 'Unknown Risk';
  }
}
