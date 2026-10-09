import { Injectable } from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerRequest } from "@nestjs/throttler";
import { env } from "./config.js";

/** ThrottlerGuard que aplica RATE_LIMIT_FACTOR (1 en producción) sobre los límites declarados. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    return super.handleRequest({ ...props, limit: Math.max(1, Math.round(props.limit * env.rateLimitFactor)) });
  }
}
