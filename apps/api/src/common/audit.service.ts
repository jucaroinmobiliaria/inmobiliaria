import { Injectable, Logger } from "@nestjs/common";
import { type Prisma, PrismaService } from "./prisma.service.js";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger("Audit");
  constructor(private readonly prisma: PrismaService) {}

  /** Nunca lanza: un fallo de auditoría no debe romper la operación principal. */
  async log(e: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { actorId: e.actorId ?? null, action: e.action, entity: e.entity, entityId: e.entityId ?? null, meta: e.meta ?? undefined },
      });
    } catch (err) {
      this.logger.warn(`No se pudo registrar auditoría ${e.action}: ${(err as Error).message}`);
    }
  }
}
