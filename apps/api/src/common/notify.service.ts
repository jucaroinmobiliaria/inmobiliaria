import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { MailerService, mailLayout } from "./mailer.service.js";
import { env } from "./config.js";

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Si se indica, además se envía por correo a esta persona. */
  email?: { to: string; subject?: string; cta?: string };
}

@Injectable()
export class NotifyService {
  private readonly logger = new Logger("Notify");
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /** Crea la notificación en la app y (opcional) envía correo. Nunca lanza. */
  async notify(n: NotifyInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId: n.userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null },
      });
    } catch (err) {
      this.logger.warn(`No se pudo crear la notificación ${n.type}: ${(err as Error).message}`);
    }
    if (n.email) {
      const url = n.link ? `${env.webUrl}${n.link}` : env.webUrl;
      const subject = n.email.subject ?? n.title;
      await this.mailer.send({
        to: n.email.to,
        subject,
        text: `${n.title}${n.body ? `\n\n${n.body}` : ""}\n\n${url}`,
        html: mailLayout(n.title, n.body ? [n.body] : [], { label: n.email.cta ?? `Ver en ${env.SITE_NAME}`, url }),
      });
    }
  }
}
