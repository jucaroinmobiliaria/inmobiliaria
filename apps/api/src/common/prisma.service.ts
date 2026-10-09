import { Global, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./config.js";
import { pgPoolConfig } from "./db-url.js";
import { PrismaClient } from "../generated/prisma/client.js";

export { Prisma } from "../generated/prisma/client.js";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg(pgPoolConfig(env.DATABASE_URL, { max: env.DB_POOL_MAX, idleTimeoutMillis: 20_000 })) });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
