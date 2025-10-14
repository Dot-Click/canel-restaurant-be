import { env } from "@/utils/env.utils";

var CryptoJS = require("crypto-js");

// export function isEncrypted(val: string): boolean {
//   if (typeof val !== "string" || val.trim() === "") return false;

//   try {
//     const bytes = CryptoJS.AES.decrypt(val, env.MERCANTILE_ENCRYPTION_KEY);
//     const txt = bytes.toString(CryptoJS.enc.Utf8);
//     // If decrypt yields something non-empty, we guess it was encrypted
//     return txt !== "";
//   } catch (err) {
//     return false;
//   }
// }

export function encrypt(text: string) {
  var ciphertext = CryptoJS.AES.encrypt(
    text,
    env.MERCANTILE_ENCRYPTION_KEY
  ).toString();

  return ciphertext;
}

export function decrypt(encrypted: string) {
  if (!encrypted || typeof encrypted !== "string") return "";

  try {
    const bytes = CryptoJS.AES.decrypt(
      encrypted,
      env.MERCANTILE_ENCRYPTION_KEY
    );
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (originalText === "") {
      return encrypted;
    }

    return originalText;
  } catch (err) {
    console.error("Decrypt error:", err);
    return encrypted;
  }
}
