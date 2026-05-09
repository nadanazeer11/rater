import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), join(__dirname, '../../../.env.local')],
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    MeModule,
  ],
})
export class AppModule {}
