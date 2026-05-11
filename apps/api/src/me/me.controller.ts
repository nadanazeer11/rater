import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import type { MeResponseDto } from './dto/me.response';
import { toMeResponse } from './me.mapper';
import { MeRepository } from './me.repository';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly repo: MeRepository) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    const memberships = await this.repo.findMembershipsWithLocation(user.id);
    return toMeResponse(user, memberships);
  }
}
