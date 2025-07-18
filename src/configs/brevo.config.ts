import { env } from "@/utils/env.utils";
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  ContactsApi,
  ContactsApiApiKeys,
  TransactionalSMSApi,
  TransactionalSMSApiApiKeys,
} from "@sendinblue/client";
import { config } from "dotenv";
config();

export const brevoTransactionApi = new TransactionalEmailsApi();
brevoTransactionApi.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  env.BREVO_API_KEY!
);

export const brevoContactsApi = new ContactsApi();
brevoContactsApi.setApiKey(ContactsApiApiKeys.apiKey, env.BREVO_API_KEY!);

export const brevoSmsApi = new TransactionalSMSApi();
brevoSmsApi.setApiKey(TransactionalSMSApiApiKeys.apiKey, env.BREVO_API_KEY!);
