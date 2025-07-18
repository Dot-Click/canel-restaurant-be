import { sign, verify, SignOptions } from "jsonwebtoken";
import { env } from "./env.utils";

export const generateJwt = (
  payload: any,
  expiresIn?: SignOptions["expiresIn"]
) => {
  return sign(payload, env.JWT_SECRET!, {
    expiresIn: expiresIn ?? 5 * 60,
  });
};

export const verifyJwt = <T = {}>(token: string) => {
  return verify(token, env.JWT_SECRET!) as T;
};
