/**
 * §13.1.3 — Password Strength Scoring (zxcvbn-style)
 *
 * Lightweight entropy-based password strength evaluator.
 * Returns a score 0–4 (matching zxcvbn semantics) plus feedback.
 *
 * 0 = Too guessable (risky)
 * 1 = Very guessable
 * 2 = Somewhat guessable (OK for most)
 * 3 = Safely unguessable
 * 4 = Very unguessable
 *
 * No external dependency — runs server-side for API validation
 * and can be mirrored client-side for real-time meter.
 */

// Common weak passwords (top 200 list subset)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
  'dragon', 'letmein', 'login', 'princess', 'solo', 'passw0rd', 'starwars',
  'admin', 'welcome', 'iloveyou', 'sunshine', 'password1', 'password123',
  'football', 'shadow', 'trustno1', '1234567890', 'batman', 'access', 'hello',
  'charlie', 'donald', '654321', 'baseball', 'michael', 'thomas', 'robert',
]);

interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  entropy: number;
  feedback: string[];
  crackTime: string;   // Human-readable estimate
}

/**
 * Evaluate password strength.
 */
export function evaluatePasswordStrength(
  password: string,
  userInputs: string[] = []
): PasswordStrengthResult {
  const feedback: string[] = [];

  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters');
  }
  if (password.length < 12) {
    feedback.push('Consider using 12+ characters for better security');
  }

  // Character class analysis
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const charClasses = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (!hasUpper) feedback.push('Add uppercase letters');
  if (!hasLower) feedback.push('Add lowercase letters');
  if (!hasDigit) feedback.push('Add numbers');
  if (!hasSpecial) feedback.push('Add special characters (!@#$%^&*)');

  // Common password check
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    feedback.push('This is a commonly used password');
    return { score: 0, entropy: 0, feedback, crackTime: 'instant' };
  }

  // Check against user inputs (email, name, etc.)
  for (const input of userInputs) {
    if (input && lower.includes(input.toLowerCase())) {
      feedback.push('Password should not contain your personal information');
      break;
    }
  }

  // Repetition / sequential patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeated characters (e.g., "aaa")');
  }
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    feedback.push('Avoid sequential characters (e.g., "abc", "123")');
  }

  // Entropy calculation
  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 33;
  if (charsetSize === 0) charsetSize = 26; // fallback

  const entropy = Math.log2(Math.pow(charsetSize, password.length));

  // Score mapping
  let score: 0 | 1 | 2 | 3 | 4;
  let crackTime: string;

  if (entropy < 28 || password.length < 8) {
    score = 0; crackTime = 'instant';
  } else if (entropy < 36) {
    score = 1; crackTime = 'minutes to hours';
  } else if (entropy < 50) {
    score = 2; crackTime = 'days to months';
  } else if (entropy < 65) {
    score = 3; crackTime = 'years';
  } else {
    score = 4; crackTime = 'centuries';
  }

  // Adjust score down for patterns
  if (charClasses < 3 && score > 2) score = 2;
  if (COMMON_PASSWORDS.has(lower)) score = 0;

  if (score >= 3 && feedback.length <= 1) {
    feedback.length = 0; // Clear minor feedback for strong passwords
    feedback.push('Strong password');
  }

  return { score, entropy: Math.round(entropy), feedback, crackTime };
}

/**
 * Check if a password meets the minimum security policy.
 * Returns null if valid, or an error message string.
 */
export function validatePasswordPolicy(
  password: string,
  minScore: 0 | 1 | 2 | 3 | 4 = 2,
  userInputs: string[] = []
): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  const result = evaluatePasswordStrength(password, userInputs);
  if (result.score < minScore) {
    return `Password too weak (score ${result.score}/${minScore}). ${result.feedback.join('. ')}`;
  }

  return null;
}
