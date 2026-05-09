import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateLocationDto } from './locations.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLocationDto) {
    return this.service.createForCurrentBusiness(user, dto);
  }
}
