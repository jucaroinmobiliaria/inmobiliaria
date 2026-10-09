import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SupabaseAuthService } from "./supabase-auth.service.js";

@Module({ controllers: [AuthController], providers: [AuthService, SupabaseAuthService], exports: [AuthService] })
export class AuthModule {}
