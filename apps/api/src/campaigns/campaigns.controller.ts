import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import type {
  CampaignDetailDto,
  CampaignSummaryDto,
} from './dto/campaign.response';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(AuthGuard)
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('locationId') locationId: string,
  ): Promise<CampaignSummaryDto[]> {
    return this.service.list(user, locationId);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<CampaignDetailDto> {
    return this.service.get(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignDetailDto> {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignDetailDto> {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.archive(user, id);
  }
}
