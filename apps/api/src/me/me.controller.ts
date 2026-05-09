import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';

type MeResponse = AuthUser & { onboarded: boolean };

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const membershipCount = await this.prisma.locationUser.count({
      where: { authUserId: user.id },
    });

    return {
      id: user.id,
      email: user.email,
      onboarded: membershipCount > 0,
    };
  }
}
