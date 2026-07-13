// Strict E.164 format: a leading +, then 1-15 digits, first digit 1-9.
// Country code is always mandatory since it must start with '+'.
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Normalizes a raw phone number by stripping all whitespace, then validates
 * it against strict E.164 format. Returns the normalized number, or null if
 * invalid.
 */
export function normalizeAndValidatePhone(raw: string): string | null {
  const normalized = raw.replace(/\s+/g, "");
  if (!E164_REGEX.test(normalized)) {
    return null;
  }
  return normalized;
}
