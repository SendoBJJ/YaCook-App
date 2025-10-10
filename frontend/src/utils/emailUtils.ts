/**
 * Normalize email address for consistent authentication
 * @param email Raw email input
 * @returns Normalized email (trimmed and lowercase)
 */
export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Normalize auth payload to ensure consistent format
 * @param email Raw email
 * @param password Raw password  
 * @returns Normalized auth payload
 */
export function normalizeAuthPayload(email: string, password: string) {
  return {
    email: normalizeEmail(email),
    password: (password || '').trim(),
  };
}