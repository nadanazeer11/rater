import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInvitationDto } from './invitations.dto';

const INVITATION_TTL_DAYS = 7;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function generateToken(): string {
  // ~32 chars, URL-safe.
  return randomBytes(24).toString('base64url');
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateInvitationDto) {
    const inviterMembership = await this.prisma.locationUser.findFirst({
      where: { authUserId: user.id, locationId: dto.locationId },
      select: { id: true, role: true },
    });

    if (!inviterMembership) {
      throw new ForbiddenException('You are not a member of this location');
    }
    if (inviterMembership.role !== 'admin') {
      throw new ForbiddenException('Only admins can invite teammates');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    const alreadyMember = await this.prisma.locationUser.findFirst({
      where: { locationId: dto.locationId, email: normalizedEmail },
      select: { id: true },
    });
    if (alreadyMember) {
      throw new ConflictException(
        `${normalizedEmail} is already a member of this location`,
      );
    }

    const token = generateToken();
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    // Replace any existing pending invite for the same (locationId, email)
    // so admins can re-send without hitting unique conflicts.
    const existing = await this.prisma.invitation.findFirst({
      where: {
        locationId: dto.locationId,
        email: normalizedEmail,
        status: 'pending',
      },
      select: { id: true },
    });

    const invitation = existing
      ? await this.prisma.invitation.update({
          where: { id: existing.id },
          data: {
            role: dto.role,
            token,
            expiresAt,
            invitedByUserId: inviterMembership.id,
          },
        })
      : await this.prisma.invitation.create({
          data: {
            locationId: dto.locationId,
            email: normalizedEmail,
            role: dto.role,
            token,
            expiresAt,
            invitedByUserId: inviterMembership.id,
          },
        });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      shareUrl: `${APP_URL}/invite/${invitation.token}`,
    };
  }

  async getByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        location: {
          select: {
            id: true,
            name: true,
            business: { select: { name: true } },
          },
        },
        invitedBy: { select: { email: true, name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    let status = invitation.status;
    if (status === 'pending' && isExpired(invitation.expiresAt)) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      status = 'expired';
    }

    return {
      email: invitation.email,
      role: invitation.role,
      status,
      expiresAt: invitation.expiresAt,
      location: {
        id: invitation.location.id,
        name: invitation.location.name,
        businessName: invitation.location.business.name,
      },
      invitedBy: invitation.invitedBy
        ? {
            email: invitation.invitedBy.email,
            name: invitation.invitedBy.name,
          }
        : null,
    };
  }

  async accept(user: AuthUser, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'pending') {
      throw new BadRequestException(
        `This invitation is ${invitation.status} and can no longer be accepted`,
      );
    }
    if (isExpired(invitation.expiresAt)) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('This invitation has expired');
    }
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException(
        `This invitation was sent to ${invitation.email}; sign in with that email to accept`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.locationUser.findFirst({
        where: {
          locationId: invitation.locationId,
          authUserId: user.id,
        },
        select: { id: true },
      });

      if (!existing) {
        await tx.locationUser.create({
          data: {
            locationId: invitation.locationId,
            authUserId: user.id,
            email: user.email,
            role: invitation.role,
          },
        });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      return {
        locationId: invitation.locationId,
        role: invitation.role,
      };
    });
  }
}
