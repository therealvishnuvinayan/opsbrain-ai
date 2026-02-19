import bcrypt from "bcryptjs";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export { MIN_PASSWORD_LENGTH };
