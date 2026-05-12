import { JwtClaims } from '@flow/shared';
import { BaseAdapter } from './BaseAdapter';
import { IAuthProvider } from '../interfaces/IAuthProvider';

export class AuthAdapter extends BaseAdapter implements IAuthProvider {
  async introspect(token: string): Promise<JwtClaims> {
    return this.post<JwtClaims>('/auth/introspect', { token });
  }

  async getPermissions(userId: string): Promise<string[]> {
    const response = await this.get<{ permissions: string[] }>(`/users/${userId}/permissions`);
    return response.permissions;
  }
}
