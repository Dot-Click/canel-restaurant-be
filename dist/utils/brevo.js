"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransacSms = exports.signupTemplate = void 0;
const brevo_config_1 = require("../configs/brevo.config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const signupTemplate = ({ userName, verificationCode, email, }) => {
    const baseUrl = `${process.env.FRONTEND_DOMAIN}/verify-email`;
    const verifyLink = `${baseUrl}?email=${email}&otp=${verificationCode}`;
    return `
     <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #111;">Welcome to Canel Restaurant!</h2>
      <p style="font-size: 18px;">Hi ${userName},</p>
      <p>
        An administrator has created an account for you on the <strong>Canel Restaurant</strong> platform. To get started, you need to verify your email address and set your password.
      </p>
      <p>
        Please click the button below to activate your account:
      </p>

      <p style="margin: 24px 0; text-align: center;">
        <a href="${verifyLink}" style="
          background-color: #7a9f8a;
          color: #d7ea86;
          padding: 12px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 16px;
        ">Activate Your Account</a>
      </p>

      <p>
        Your username is your email address: <strong>${email}</strong>.
      </p>
      <p style="font-size: 12px; color: #666;">
        If you weren't expecting this email, please contact your administrator. This link is valid for 24 hours.
      </p>
    </div>
  `;
};
exports.signupTemplate = signupTemplate;
const sendTransacSms = (_a) => __awaiter(void 0, [_a], void 0, function* ({ recipient, content }) {
    try {
        console.log(`Preparing to send SMS to ${recipient}`);
        yield brevo_config_1.brevoSmsApi.sendTransacSms({
            sender: process.env.BREVO_SMS_SENDER,
            recipient,
            content,
        });
        console.log("Successfully sent transactional SMS.");
    }
    catch (error) {
        console.error("Error sending transactional SMS:", error);
        throw new Error("Failed to send transactional SMS.");
    }
});
exports.sendTransacSms = sendTransacSms;
