import { createTransport, Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { MailSender, MailSendResponse } from "../Types.mjs";

/**
 * gmx: Zugriff aktivieren: https://hilfe.gmx.net/pop-imap/einschalten.html
 */
export interface SmtpMailSenderOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  defaultReceivers?: string[];
}

export class SmtpMailSender implements MailSender {
  constructor(options: SmtpMailSenderOptions) {
    const { host, port, user, password, defaultReceivers } = options;
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.defaultReceivers = defaultReceivers;
    this.transporter = createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: {
        user: this.user,
        pass: this.password,
      },
    });
    return this;
  }
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private defaultReceivers: string[] | undefined;
  public disconnect = async () => {
    if (this.transporter) {
      this.transporter.close();
    }
  };
  public send = async (
    subject: string,
    content: string,
    to?: string[] | undefined
  ): Promise<MailSendResponse> => {
    try {
      const receivers = to || this.defaultReceivers;
      if (receivers) {
        const response = await this.transporter.sendMail({
          from: this.user,
          to: receivers,
          subject,
          text: content,
        });
        const { rejected } = response;
        if (rejected.length) {
          const error = `Bad mail <send>: Some receivers are invalid: ${rejected
            .map((rej) => (typeof rej === "string" ? rej : rej.address))
            .join(", ")}`;
          return { success: false, error, repeatable: false };
        } else {
          return { success: true };
        }
      } else {
        const error = `Received <send> without any receiver and default receivers are not specified. Subject: ${subject}`;
        return { error, success: false, repeatable: false };
      }
    } catch (error) {
      return {
        error: `Catched error when sending mail(s): ${error.toString()}`,
        success: false,
        repeatable: true,
      };
    }
  };
}
