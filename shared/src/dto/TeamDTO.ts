export interface InviteMemberDTO {
  email: string;
  roleId: string;
}

export interface AcceptInviteDTO {
  token: string;
}

export interface CreateRoleDTO {
  name: string;
  permissions: string[];
}

export interface UpdateRoleDTO {
  permissions: string[];
}

export interface UpdateMemberDTO {
  roleId: string;
}
