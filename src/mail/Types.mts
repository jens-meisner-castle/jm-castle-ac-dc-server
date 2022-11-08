export type MailSendResponse =
  | { success: true; error?: never; repeatable?: never }
  | { success: false; error: string; repeatable: boolean };

export interface MailSender {
  disconnect: () => Promise<void>;
  send: (
    subject: string,
    content: string,
    to?: string[]
  ) => Promise<MailSendResponse>;
}
