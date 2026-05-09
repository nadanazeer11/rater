import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateInvitationDto } from './invitations.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.service.create(user, dto);
  }

  @Get('by-token/:token')
  async getByToken(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post('by-token/:token/accept')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async accept(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.service.accept(user, token);
  }
}
