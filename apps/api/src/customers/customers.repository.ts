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

  async findActiveEmails(locationId: string, emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const rows = await this.prisma.customer.findMany({
      where: { locationId, deletedAt: null, email: { in: emails } },
      select: { email: true },
    });
    return new Set(rows.map((r) => r.email));
  }

  findActiveByEmail(locationId: string, email: string) {
    return this.prisma.customer.findFirst({
      where: { locationId, email, deletedAt: null },
      select: { id: true },
    });
  }

  create(data: Prisma.CustomerUncheckedCreateInput) {
    return this.prisma.customer.create({ data });
  }

  createMany(rows: Prisma.CustomerCreateManyInput[]) {
    return this.prisma.customer.createMany({ data: rows, skipDuplicates: true });
  }

  findById(id: string) {
    return this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, locationId: true },
    });
  }

  softDelete(id: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
