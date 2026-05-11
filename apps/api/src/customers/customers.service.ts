import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.type';
import type { CustomerResponseDto } from './dto/customer.response';
import { toCustomerResponse } from './customers.mapper';
import { CustomersRepository } from './customers.repository';

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
}
