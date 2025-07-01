// src/configs/brevo.config.ts

// --- FIX 1: Use NAMED IMPORTS ---
// --- FIX 2: Use the exact class names with all-caps 'SMS' as suggested by TypeScript ---
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  ContactsApi,
  ContactsApiApiKeys,
  TransactionalSMSApi, // This is the correct name
  TransactionalSMSApiApiKeys, // This is the correct name
} from "@sendinblue/client";
import { config } from "dotenv";
config();

// --- API for sending Transactional Emails (No changes needed) ---
export const brevoTransactionApi = new TransactionalEmailsApi();
brevoTransactionApi.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

// --- API for managing Contacts (No changes needed) ---
export const brevoContactsApi = new ContactsApi();
brevoContactsApi.setApiKey(
  ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);

// --- API for sending Transactional SMS (Corrected) ---
// We now use the directly imported and correctly cased `TransactionalSMSApi` class.
export const brevoSmsApi = new TransactionalSMSApi();
brevoSmsApi.setApiKey(
  TransactionalSMSApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!
);
