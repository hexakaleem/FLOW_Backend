export interface NotificationPreferencesDTO {
  email?: { enabled?: boolean; events?: string[] };
  push?: { enabled?: boolean; events?: string[] };
  inapp?: { enabled?: boolean; events?: string[] };
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  timezone?: string;
  avatar?: string;
  notificationPreferences?: NotificationPreferencesDTO;
}

export interface BusinessProfileDTO {
  companyName: string;
  mcNumber?: string;
  dotNumber?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  scacCode?: string;
  factoringCompany?: string;
}
