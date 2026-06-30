import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import type { InvitationStatus } from '@rater/types';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

export type InvitationByTokenRow = Prisma.InvitationGetPayload<{
  select: {
    id: true;
    email: true;
    role: true;
    status: true;
    expiresAt: true;
    location: {
      select: { id: true; name: true; business: { select: { name: true } } };
    };
    invitedBy: { select: { email: true; name: true } };
  };
}>;

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true, role: true },
    });
  }

  findMemberByEmail(locationId: string, email: string) {
    return this.prisma.locationUser.findFirst({
      where: { locationId, email },
      select: { id: true },
    });
  }

  findPendingInvitation(locationId: string, email: string) {
    return this.prisma.invitation.findFirst({
      where: { locationId, email, status: 'pending' },
      select: { id: true },
    });
  }

  createInvitation(data: Prisma.InvitationUncheckedCreateInput) {
    return this.prisma.invitation.create({ data });
  }

  updateInvitation(id: string, data: Prisma.InvitationUncheckedUpdateInput) {
    return this.prisma.invitation.update({ where: { id }, data });
  }

  findByToken(token: string): Promise<InvitationByTokenRow | null> {
    return this.prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        location: {
          select: { id: true, name: true, business: { select: { name: true } } },
        },
        invitedBy: { select: { email: true, name: true } },
      },
    });
  }

  findFullByToken(token: string) {
    return this.prisma.invitation.findUnique({ where: { token } });
  }

  markStatus(id: string, status: InvitationStatus, acceptedAt?: Date) {
    return this.prisma.invitation.update({
      where: { id },
      data: { status, ...(acceptedAt ? { acceptedAt } : {}) },
    });
  }

  findMembershipInTx(tx: Tx, locationId: string, authUserId: string) {
    return tx.locationUser.findFirst({
      where: { locationId, authUserId },
      select: { id: true },
    });
  }

  createMembershipInTx(tx: Tx, data: Prisma.LocationUserUncheckedCreateInput) {
    return tx.locationUser.create({ data });
  }

  markAcceptedInTx(tx: Tx, id: string) {
    return tx.invitation.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
  }
}
