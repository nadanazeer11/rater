import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@rater/db';
import type { AuthUser } from '../auth/auth-user.type';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { CustomerResponseDto } from './dto/customer.response';
import type { ImportCustomersDto } from './dto/import-customers.dto';
import type { ImportResultDto } from './dto/import-result.response';
import { toCustomerResponse } from './customers.mapper';
import { CustomersRepository } from './customers.repository';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
function normOptional(raw: string | undefined): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  private async assertMember(user: AuthUser, locationId: string): Promise<void> {
    if (!locationId) throw new BadRequestException('locationId is required.');
    const membership = await this.repo.findMembership(user.id, locationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this location.');
    }
  }

  async list(user: AuthUser, locationId: string): Promise<CustomerResponseDto[]> {
    await this.assertMember(user, locationId);
    const customers = await this.repo.listActiveByLocation(locationId);
    return customers.map(toCustomerResponse);
  }

  async addOne(user: AuthUser, dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    await this.assertMember(user, dto.locationId);
    const email = normEmail(dto.email);
    const existing = await this.repo.findActiveByEmail(dto.locationId, email);
    if (existing) {
      throw new ConflictException(`${email} is already a customer of this location.`);
    }
    const created = await this.repo.create({
      locationId: dto.locationId,
      email,
      name: normOptional(dto.name),
      phone: normOptional(dto.phone),
      importSource: 'manual',
    });
    return toCustomerResponse(created);
  }

  async import(user: AuthUser, dto: ImportCustomersDto): Promise<ImportResultDto> {
    await this.assertMember(user, dto.locationId);

    const received = dto.rows.length;
    let skippedInvalid = 0;
    let skippedDuplicates = 0;

    const seen = new Set<string>();
    const candidates: { email: string; name: string | null; phone: string | null }[] = [];
    for (const row of dto.rows) {
      const email = normEmail(row.email ?? '');
      if (!EMAIL_RE.test(email)) {
        skippedInvalid += 1;
        continue;
      }
      if (seen.has(email)) {
        skippedDuplicates += 1;
        continue;
      }
      seen.add(email);
      candidates.push({ email, name: normOptional(row.name), phone: normOptional(row.phone) });
    }

    const existingEmails = await this.repo.findActiveEmails(
      dto.locationId,
      candidates.map((c) => c.email),
    );
    const now = new Date();
    const toInsert: Prisma.CustomerCreateManyInput[] = [];
    for (const c of candidates) {
      if (existingEmails.has(c.email)) {
        skippedDuplicates += 1;
        continue;
      }
      toInsert.push({
        locationId: dto.locationId,
        email: c.email,
        name: c.name,
        phone: c.phone,
        importSource: 'csv',
        importedAt: now,
      });
    }

    const result = await this.repo.createMany(toInsert);
    const imported = result.count;
    // If createMany skipped any rows on the unique constraint (a concurrent
    // insert), fold the difference into "already existed".
    skippedDuplicates += toInsert.length - imported;

    return { received, imported, skippedDuplicates, skippedInvalid };
  }

  async remove(user: AuthUser, customerId: string): Promise<void> {
    const customer = await this.repo.findById(customerId);
    if (!customer) throw new NotFoundException('Customer not found.');
    await this.assertMember(user, customer.locationId);
    await this.repo.softDelete(customerId);
  }
}
