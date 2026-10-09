import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditService } from "./audit.service.js";
import { env } from "./config.js";
import { MailerService } from "./mailer.service.js";
import { NotifyService } from "./notify.service.js";
import { SupabaseService } from "./supabase.service.js";

@Global()
@Module({
  imports: [JwtModule.register({ global: true, secret: env.JWT_SECRET, signOptions: { expiresIn: 1800 } })],
  providers: [MailerService, AuditService, NotifyService, SupabaseService],
  exports: [MailerService, AuditService, NotifyService, SupabaseService, JwtModule],
})
export class CommonModule {}
