export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least one number');
  }

  // Calculate strength
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters

  let strength: PasswordValidation['strength'];
  if (score <= 1) strength = 'weak';
  else if (score === 2) strength = 'fair';
  else if (score === 3) strength = 'good';
  else strength = 'strong';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize user input to prevent XSS (extra layer of defense)
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
