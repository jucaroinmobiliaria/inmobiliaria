import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { type AuthUser, AuthLimit, Auth, Me, Public } from "../../common/decorators.js";
import { ZodPipe } from "../../common/zod.js";
import type { SessionUser } from "../../contract.js";
import { AuthService, type ReqMeta } from "./auth.service.js";
import {
  type ChangePasswordDto, type ForgotDto, type LoginDto, type RegisterDto, type ResetDto, type UpdateMeDto,
  changePasswordSchema, forgotSchema, loginSchema, registerSchema, resetSchema, updateMeSchema,
} from "./dto.js";

const metaOf = (req: Request): ReqMeta => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @AuthLimit() @Post("register") @HttpCode(201)
  async register(@Body(new ZodPipe(registerSchema)) dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ user: SessionUser }> {
    const { user, tokens } = await this.auth.register(dto, metaOf(req));
    this.auth.setCookies(res, tokens);
    return { user };
  }

  @Public() @AuthLimit() @Post("login") @HttpCode(200)
  async login(@Body(new ZodPipe(loginSchema)) dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ user: SessionUser }> {
    const { user, tokens } = await this.auth.login(dto, metaOf(req));
    this.auth.setCookies(res, tokens);
    return { user };
  }

  @Public() @AuthLimit() @Post("refresh") @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ user: SessionUser }> {
    const raw = (req.cookies as Record<string, string | undefined> | undefined)?.refresh_token;
    try {
      const { user, tokens } = await this.auth.refresh(raw, metaOf(req));
      this.auth.setCookies(res, tokens);
      return { user };
    } catch (e) {
      this.auth.clearCookies(res);
      throw e;
    }
  }

  @Public() @Post("logout") @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ ok: true }> {
    await this.auth.logout((req.cookies as Record<string, string | undefined> | undefined)?.refresh_token);
    this.auth.clearCookies(res);
    return { ok: true };
  }

  @Auth() @Get("me")
  async me(@Me() u: AuthUser): Promise<{ user: SessionUser }> {
    return { user: await this.auth.sessionUser(u.id) };
  }

  @Auth() @Patch("me")
  async updateMe(@Me() u: AuthUser, @Body(new ZodPipe(updateMeSchema)) dto: UpdateMeDto): Promise<{ user: SessionUser }> {
    return { user: await this.auth.updateMe(u.id, dto) };
  }

  @Auth() @AuthLimit() @Post("change-password") @HttpCode(200)
  async changePassword(@Me() u: AuthUser, @Body(new ZodPipe(changePasswordSchema)) dto: ChangePasswordDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ ok: true }> {
    const tokens = await this.auth.changePassword(u.id, dto, metaOf(req));
    this.auth.setCookies(res, tokens);
    return { ok: true };
  }

  @Public() @AuthLimit() @Post("forgot") @HttpCode(200)
  async forgot(@Body(new ZodPipe(forgotSchema)) dto: ForgotDto): Promise<{ ok: true }> {
    await this.auth.forgot(dto.email);
    return { ok: true };
  }

  @Public() @AuthLimit() @Post("reset") @HttpCode(200)
  async reset(@Body(new ZodPipe(resetSchema)) dto: ResetDto): Promise<{ ok: true }> {
    await this.auth.reset(dto);
    return { ok: true };
  }
}
