import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateCustomerDto } from './dto/create-customer.dto';
import type { CustomerResponseDto } from './dto/customer.response';
import { ImportCustomersDto } from './dto/import-customers.dto';
import type { ImportResultDto } from './dto/import-result.response';
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addOne(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return this.service.addOne(user, dto);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  import(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportCustomersDto,
  ): Promise<ImportResultDto> {
    return this.service.import(user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(user, id);
  }
}
