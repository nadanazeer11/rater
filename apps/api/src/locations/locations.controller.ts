import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateLocationDto } from './dto/create-location.dto';
import type { LocationResponseDto, SenderSettingsDto } from './dto/location.response';
import { UpdateSenderSettingsDto } from './dto/update-sender-settings.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(AuthGuard)
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.service.createForCurrentBusiness(user, dto);
  }

  @Get(':id/sender-settings')
  getSenderSettings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<SenderSettingsDto> {
    return this.service.getSenderSettings(user, id);
  }

  @Patch(':id/sender-settings')
  updateSenderSettings(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSenderSettingsDto,
  ): Promise<SenderSettingsDto> {
    return this.service.updateSenderSettings(user, id, dto);
  }
}
