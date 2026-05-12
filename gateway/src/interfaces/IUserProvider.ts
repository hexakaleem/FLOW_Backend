import { UpdateProfileDTO, BusinessProfileDTO } from '@flow/shared';

export interface IUserProvider {
  getProfile(userId: string): Promise<unknown>;
  updateProfile(userId: string, dto: UpdateProfileDTO): Promise<unknown>;
  createBusinessProfile(userId: string, dto: BusinessProfileDTO): Promise<unknown>;
}
