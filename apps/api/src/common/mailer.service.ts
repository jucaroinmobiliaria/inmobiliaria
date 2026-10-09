import { Injectable, Logger } from "@nestjs/common";
import { env } from "./config.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Plantilla HTML mínima y sobria para los correos transaccionales. */
export function mailLayout(title: string, paragraphs: string[], cta?: { label: string; url: string }): string {
  const brand = env.SITE_NAME;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f1e8;font-family:Georgia,serif;color:#1a1814">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdfb;border-radius:16px;padding:28px">
<tr><td><div style="font-weight:700;font-size:22px;color:#145c4c;letter-spacing:-0.02em">${esc(brand)}</div><div style="font-size:10px;letter-spacing:0.22em;color:#6b4e16;margin-top:2px">INMUEBLES</div><h1 style="font-family:Arial,sans-serif;font-size:20px;margin:16px 0 8px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;margin:0 0 12px">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:20px 0"><a href="${esc(cta.url)}" style="background:#145c4c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:600;font-family:Arial,sans-serif">${esc(cta.label)}</a></p>` : ""}
<p style="font-family:Arial,sans-serif;font-size:12px;color:#746c62;margin-top:24px">Recibes este correo porque tienes una cuenta en ${esc(brand)}.</p>
</td></tr></table></td></tr></table></body></html>`;
}

/** Driver de consola por defecto; Resend (por fetch) si hay RESEND_API_KEY y MAIL_FROM. Nunca lanza. */
@Injectable()
export class MailerService {
  private readonly logger = new Logger("Mailer");

  get driver(): "resend" | "console" {
    return env.RESEND_API_KEY && env.MAIL_FROM ? "resend" : "console";
  }

  async send(msg: MailMessage): Promise<boolean> {
    if (this.driver === "console") {
      this.logger.log(`[correo → ${msg.to}] ${msg.subject}\n${msg.text}`);
      return true;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.MAIL_FROM, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`Resend respondió ${res.status} al enviar "${msg.subject}"`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(`No se pudo enviar el correo "${msg.subject}": ${(err as Error).message}`);
      return false;
    }
  }
}
