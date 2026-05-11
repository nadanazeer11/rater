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
import { CreateInvitationDto } from './dto/create-invitation.dto';
import type { InvitationAcceptedDto } from './dto/invitation-accepted.response';
import type { InvitationCreatedDto } from './dto/invitation-created.response';
import type { InvitationDetailsDto } from './dto/invitation-details.response';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<InvitationCreatedDto> {
    return this.service.create(user, dto);
  }

  @Get('by-token/:token')
  getByToken(@Param('token') token: string): Promise<InvitationDetailsDto> {
    return this.service.getByToken(token);
  }

  @Post('by-token/:token/accept')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
  ): Promise<InvitationAcceptedDto> {
    return this.service.accept(user, token);
  }
}
