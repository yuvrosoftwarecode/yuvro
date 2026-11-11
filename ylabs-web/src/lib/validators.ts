/**
 * Validates international phone format.
 * Must start with `+` followed by country code and digits (e.g. +14155552671).
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return true; // optional
  const phoneRegex = /^\+[1-9]\d{6,14}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validates that website URL starts with https://
 */
export function isValidWebsite(url: string): boolean {
  if (!url || url.trim() === "") return true; // optional
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates username format according to GitHub-style rules:
 * - 3 to 39 characters
 * - Alphanumeric characters (small letters, capital letters, numbers) or single hyphens
 * - Cannot begin or end with a hyphen
 * - Cannot contain consecutive hyphens
 */
export function validateUsernameFormat(
  username: string,
  options: { minLen?: number; maxLen?: number } = {}
): { isValid: boolean; error?: string } {
  const minLen = options.minLen ?? 3;
  const maxLen = options.maxLen ?? 39;

  if (!username) {
    return { isValid: false, error: "Username is required." };
  }
  const trimmed = username.trim();
  if (trimmed.length < minLen) {
    return { isValid: false, error: `Username must be at least ${minLen} characters.` };
  }
  if (trimmed.length > maxLen) {
    return { isValid: false, error: `Username must be ${maxLen} characters or fewer.` };
  }
  if (/^[-_.]/.test(trimmed) || /[-_.]$/.test(trimmed)) {
    return { isValid: false, error: "Username cannot begin or end with a hyphen." };
  }
  if (/[-_.]{2,}/.test(trimmed)) {
    return { isValid: false, error: "Username cannot contain consecutive hyphens." };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen.",
    };
  }
  return { isValid: true };
}

/**
 * Validates username boolean check (3-30 chars).
 */
export function isValidUsername(username: string): boolean {
  return validateUsernameFormat(username, { minLen: 3, maxLen: 30 }).isValid;
}

/**
 * Validates that end year is greater than or equal to start year
 */
export function isValidYearRange(startYear?: number, endYear?: number): boolean {
  if (!startYear || !endYear) return true;
  return endYear >= startYear;
}

/**
 * Validates password rules:
 * - 8+ characters
 * - At least one uppercase letter
 * - At least one number
 * - Must differ from current password (if current provided)
 */
export function validatePassword(
  newPass: string,
  currentPass?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!newPass || newPass.length < 8) {
    errors.push("Must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(newPass)) {
    errors.push("Must contain at least one uppercase letter");
  }
  if (!/[0-9]/.test(newPass)) {
    errors.push("Must contain at least one number");
  }
  if (currentPass && newPass === currentPass) {
    errors.push("New password must differ from current password");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates password strength score, label, and checklist requirements:
 * - hasLength: >= 8 characters
 * - hasLetter: contains at least one letter
 * - hasNumber: contains at least one number
 * - score: 0 to 3
 * - label: "Weak" | "Fair" | "Strong"
 */
export function getPasswordStrength(pw: string) {
  const hasLength = pw.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);

  let score = 0;
  if (hasLength) score++;
  if (hasLetter && hasNumber) score++;
  if (pw.length >= 10 && /[^a-zA-Z0-9]/.test(pw)) score++;

  let label = "";
  if (pw.length > 0) {
    if (score <= 1) label = "Weak";
    else if (score === 2) label = "Fair";
    else label = "Strong";
  }

  return { score, label, hasLength, hasLetter, hasNumber };
}
