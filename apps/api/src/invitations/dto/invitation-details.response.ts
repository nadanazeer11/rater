export class InvitationLocationDto {
  id!: string;
  name!: string;
  businessName!: string;
}

export class InvitationInviterDto {
  email!: string;
  name!: string | null;
}

export class InvitationDetailsDto {
  email!: string;
  role!: string;
  status!: string;
  expiresAt!: Date;
  location!: InvitationLocationDto;
  invitedBy!: InvitationInviterDto | null;
}
