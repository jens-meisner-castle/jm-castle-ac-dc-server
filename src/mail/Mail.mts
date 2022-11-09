import { MailingSpec } from "jm-castle-ac-dc-types/dist/All.mjs";
import { SmtpMailSender } from "./smtp/SmtpMailSender.mjs";
import { MailSender } from "./Types.mjs";

export const getMailSender = (spec: MailingSpec): MailSender => {
  return new SmtpMailSender(spec);
};
