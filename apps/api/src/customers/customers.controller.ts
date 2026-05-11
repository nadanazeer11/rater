import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import type { CustomerResponseDto } from './dto/customer.response';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('locationId') locationId: string,
  ): Promise<CustomerResponseDto[]> {
    return this.service.list(user, locationId);
  }
}
