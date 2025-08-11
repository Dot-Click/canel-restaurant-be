import Crypto from "crypto";

export const encrypt = (message: any, key: any) => {
  const algorythm = "aes-128-ecb";

  const hash = Crypto.createHash("sha256");
  hash.update(key);

  const keyString = hash.copy().digest("hex");
  const firstHalf = keyString.toString().slice(0, keyString.length / 2);
  const keyHex = Buffer.from(firstHalf, "hex");

  const cipher = Crypto.createCipheriv(algorythm, keyHex, null);

  let ciphertext = cipher.update(message, "utf8", "base64");
  ciphertext += cipher.final("base64");

  return ciphertext;
};

export const decrypt = (message: any, key: any) => {
  const algorythm = "aes-128-ecb";
  const hash = Crypto.createHash("sha256");
  hash.update(key);

  const keyString = hash.copy().digest("hex");
  const firstHalf = keyString.toString().slice(0, keyString.length / 2);
  const keyHex = Buffer.from(firstHalf, "hex");

  const decipher = Crypto.createDecipheriv(algorythm, keyHex, null);

  let deciphertext = decipher.update(message, "base64", "utf8");
  deciphertext += decipher.final("utf8");

  return deciphertext;
};
