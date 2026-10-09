import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./common/auth.guard.js";
import { CommonModule } from "./common/common.module.js";
import { AllExceptionsFilter } from "./common/exception.filter.js";
import { PrismaModule } from "./common/prisma.service.js";
import { AppThrottlerGuard } from "./common/throttle.guard.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { AiModule } from "./modules/ai/ai.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { DashboardModule } from "./modules/dashboard/dashboard.module.js";
import { FavoritesModule } from "./modules/favorites/favorites.module.js";
import { InquiriesModule } from "./modules/inquiries/inquiries.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { ReportsModule } from "./modules/reports/reports.module.js";
import { SavedSearchesModule } from "./modules/saved-searches/saved-searches.module.js";
import { VisitsModule } from "./modules/visits/visits.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { HealthController } from "./health.controller.js";
import { PublicationsModule } from "./modules/publications/publications.module.js";
import { SeoModule } from "./modules/seo/seo.module.js";
import { StatsModule } from "./modules/stats/stats.service.js";
import { StorageModule } from "./modules/storage/storage.service.js";
import { UploadsController } from "./modules/storage/uploads.controller.js";

@Module({
  imports: [
    ThrottlerModule.forRoot({ throttlers: [{ name: "default", ttl: 60_000, limit: 120 }] }),
    PrismaModule,
    CommonModule,
    StatsModule,
    StorageModule,
    CatalogModule,
    AuthModule,
    PublicationsModule,
    SeoModule,
    FavoritesModule,
    SavedSearchesModule,
    NotificationsModule,
    InquiriesModule,
    VisitsModule,
    ReportsModule,
    DashboardModule,
    AiModule,
    AdminModule,
  ],
  controllers: [HealthController, UploadsController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Orden: primero throttler (por IP), luego sesión/roles.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
