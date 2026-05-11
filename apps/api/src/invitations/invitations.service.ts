import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth-user.type';
import type { CreateInvitationDto } from './dto/create-invitation.dto';
import type { InvitationAcceptedDto } from './dto/invitation-accepted.response';
import type { InvitationCreatedDto } from './dto/invitation-created.response';
import type { InvitationDetailsDto } from './dto/invitation-details.response';
import { toInvitationCreated, toInvitationDetails } from './invitations.mapper';
import { InvitationsRepository } from './invitations.repository';

const INVITATION_TTL_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

@Injectable()
export class InvitationsService {
  constructor(private readonly repo: InvitationsRepository) {}

  async create(user: AuthUser, dto: CreateInvitationDto): Promise<InvitationCreatedDto> {
    const inviterMembership = await this.repo.findMembership(user.id, dto.locationId);
    if (!inviterMembership) {
      throw new ForbiddenException('You are not a member of this location');
    }
    if (inviterMembership.role !== 'admin') {
      throw new ForbiddenException('Only admins can invite teammates');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    const alreadyMember = await this.repo.findMemberByEmail(dto.locationId, normalizedEmail);
    if (alreadyMember) {
      throw new ConflictException(`${normalizedEmail} is already a member of this location`);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const existing = await this.repo.findPendingInvitation(dto.locationId, normalizedEmail);

    const invitation = existing
      ? await this.repo.updateInvitation(existing.id, {
          role: dto.role,
          token,
          expiresAt,
          invitedByUserId: inviterMembership.id,
        })
      : await this.repo.createInvitation({
          locationId: dto.locationId,
          email: normalizedEmail,
          role: dto.role,
          token,
          expiresAt,
          invitedByUserId: inviterMembership.id,
        });

    return toInvitationCreated(invitation, APP_URL);
  }

  async getByToken(token: string): Promise<InvitationDetailsDto> {
    const invitation = await this.repo.findByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    let status = invitation.status;
    if (status === 'pending' && isExpired(invitation.expiresAt)) {
      await this.repo.markStatus(invitation.id, 'expired');
      status = 'expired';
    }

    return toInvitationDetails(invitation, status);
  }

  async accept(user: AuthUser, token: string): Promise<InvitationAcceptedDto> {
    const invitation = await this.repo.findFullByToken(token);
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `This invitation is ${invitation.status} and can no longer be accepted`,
      );
    }
    if (isExpired(invitation.expiresAt)) {
      await this.repo.markStatus(invitation.id, 'expired');
      throw new BadRequestException('This invitation has expired');
    }
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        `This invitation was sent to ${invitation.email}; sign in with that email to accept`,
      );
    }

    return this.repo.runInTransaction(async (tx) => {
      const existing = await this.repo.findMembershipInTx(tx, invitation.locationId, user.id);
      if (!existing) {
        await this.repo.createMembershipInTx(tx, {
          locationId: invitation.locationId,
          authUserId: user.id,
          email: user.email,
          role: invitation.role,
        });
      }

      await this.repo.markAcceptedInTx(tx, invitation.id);

      return { locationId: invitation.locationId, role: invitation.role };
    });
  }
}
