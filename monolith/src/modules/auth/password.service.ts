import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export class PasswordService {
  static hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateOTP(): { code: string; hash: Promise<string> } {
    const code = randomInt(100000, 999999).toString();
    const hash = bcrypt.hash(code, 8);
    return { code, hash };
  }

  static validateOTP(input: string, storedHash: string): Promise<boolean> {
    return bcrypt.compare(input, storedHash);
  }
}
