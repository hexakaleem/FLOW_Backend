import { UpdateProfileDTO, BusinessProfileDTO } from '@flow/shared';
import { BaseAdapter } from './BaseAdapter';
import { IUserProvider } from '../interfaces/IUserProvider';

export class UserAdapter extends BaseAdapter implements IUserProvider {
  async getProfile(userId: string): Promise<unknown> {
    return this.get(`/users/${userId}`);
  }

  async updateProfile(userId: string, dto: UpdateProfileDTO): Promise<unknown> {
    return this.patch(`/users/${userId}`, dto);
  }

  async createBusinessProfile(userId: string, dto: BusinessProfileDTO): Promise<unknown> {
    return this.post(`/users/${userId}/business-profile`, dto);
  }
}
