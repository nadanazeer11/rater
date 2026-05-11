import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class LocationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findAdminMembership(authUserId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, role: 'admin' },
      select: { location: { select: { businessId: true } } },
    });
  }

  findActiveByPlaceId(businessId: string, googlePlaceId: string) {
    return this.prisma.location.findFirst({
      where: { businessId, googlePlaceId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  createLocationInTx(tx: Tx, data: Prisma.LocationUncheckedCreateInput) {
    return tx.location.create({ data });
  }

  createMembershipInTx(tx: Tx, data: Prisma.LocationUserUncheckedCreateInput) {
    return tx.locationUser.create({ data });
  }
}
