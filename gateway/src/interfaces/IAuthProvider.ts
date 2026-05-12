import { JwtClaims } from '@flow/shared';

export interface IAuthProvider {
  introspect(token: string): Promise<JwtClaims>;
  getPermissions(userId: string): Promise<string[]>;
}
