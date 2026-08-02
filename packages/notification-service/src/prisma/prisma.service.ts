import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected to Supabase PostgreSQL database.');
    } catch (error) {
      this.logger.warn(`Prisma database connection skipped (falling back to memory repository): ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
