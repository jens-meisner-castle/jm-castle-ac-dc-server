import { MailingSpec } from "../Types.mjs";
import { SmtpMailSender } from "./smtp/SmtpMailSender.mjs";
import { MailSender } from "./Types.mjs";

export const getMailSender = (spec: MailingSpec): MailSender => {
  return new SmtpMailSender(spec);
};
