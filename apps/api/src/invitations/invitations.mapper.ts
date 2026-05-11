import { InvitationCreatedDto } from './dto/invitation-created.response';
import { InvitationDetailsDto } from './dto/invitation-details.response';
import type { InvitationByTokenRow } from './invitations.repository';

export function toInvitationDetails(
  row: InvitationByTokenRow,
  status: string,
): InvitationDetailsDto {
  return {
    email: row.email,
    role: row.role,
    status,
    expiresAt: row.expiresAt,
    location: {
      id: row.location.id,
      name: row.location.name,
      businessName: row.location.business.name,
    },
    invitedBy: row.invitedBy
      ? { email: row.invitedBy.email, name: row.invitedBy.name }
      : null,
  };
}

export function toInvitationCreated(
  invitation: { id: string; email: string; role: string; expiresAt: Date; token: string },
  appUrl: string,
): InvitationCreatedDto {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    shareUrl: `${appUrl}/invite/${invitation.token}`,
  };
}
