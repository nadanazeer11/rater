import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  findAnyMembership(authUserId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId },
      select: { id: true },
    });
  }

  createBusinessInTx(tx: Tx, data: Prisma.BusinessCreateInput) {
    return tx.business.create({ data });
  }

  createLocationInTx(tx: Tx, data: Prisma.LocationUncheckedCreateInput) {
    return tx.location.create({ data });
  }

  createMembershipInTx(tx: Tx, data: Prisma.LocationUserUncheckedCreateInput) {
    return tx.locationUser.create({ data });
  }
}
