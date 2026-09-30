import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares plaintext password with stored bcrypt hash in constant time
 */
export async function verifyPassword(
  plainText: string,
  hashedText: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hashedText);
}
