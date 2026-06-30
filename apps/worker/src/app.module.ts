import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from './mailer/mailer.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ScrapeModule } from './scrape/scrape.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../../.env'),
        join(__dirname, '../../../.env.local'),
      ],
    }),
    PrismaModule,
    ScrapeModule,
    MailerModule,
    SchedulerModule,
  ],
})
export class AppModule {}
