import { Injectable } from '@nestjs/common';
import { Prisma } from '@rater/db';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(authUserId: string, locationId: string) {
    return this.prisma.locationUser.findFirst({
      where: { authUserId, locationId },
      select: { id: true, role: true },
    });
  }

  listActiveByLocation(locationId: string) {
    return this.prisma.customer.findMany({
      where: { locationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveByEmail(locationId: string, email: string) {
    return this.prisma.customer.findFirst({
      where: { locationId, email, deletedAt: null },
      select: { id: true },
    });
  }

  async findManyByEmails(locationId: string, emails: string[]) {
    if (emails.length === 0) return [];
    return this.prisma.customer.findMany({
      where: { locationId, deletedAt: null, email: { in: emails } },
      select: { id: true, email: true },
    });
  }

  create(data: Prisma.CustomerUncheckedCreateInput) {
    return this.prisma.customer.create({ data });
  }
}
