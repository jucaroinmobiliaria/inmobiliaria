import { Controller, Get, Module } from "@nestjs/common";
import { type AuthUser, Auth, Me } from "../../common/decorators.js";
import type { DashboardSummary } from "../../contract.js";
import { InquiriesModule } from "../inquiries/inquiries.module.js";
import { VisitsModule } from "../visits/visits.module.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Auth() @Get("summary")
  summary(@Me() u: AuthUser): Promise<DashboardSummary> {
    return this.svc.summary(u);
  }
}

@Module({ imports: [InquiriesModule, VisitsModule], controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
