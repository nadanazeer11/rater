export class InvitationCreatedDto {
  id!: string;
  email!: string;
  role!: string;
  expiresAt!: Date;
  shareUrl!: string;
}
