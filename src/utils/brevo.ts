interface BaseProps {
  verificationCode: string;
  userName: string;
  email: string;
}

import dotenv from "dotenv";

dotenv.config();
export const signupTemplate = ({
  userName,
  verificationCode,
  email,
}: BaseProps) => {
  const baseUrl = "http://localhost:5000/verify-email"; // 🔁 Replace with your actual domain
  const verifyLink = `${baseUrl}?email=${email}&otp=${verificationCode}`; // <-- Email should be inserted dynamically on server

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p style="font-size: 20px;">Hi ${userName},</p>
      <p>
        Thanks for signing up for <strong>Canel Restaurant</strong>! To verify your email address and activate your account, please click the button below or use the OTP code manually:
      </p>

      <p style="margin: 16px 0;">
        <a href="${verifyLink}" style="
          background: #FD9ED7;
          color: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 16px;
        ">Verify Email</a>
      </p>

      <p>Or manually enter this OTP code:</p>
      <p style="background: #FD9ED7; width: fit-content; padding: 10px 16px; border-radius: 10px; font-size: 24px;">
        ${verificationCode}
      </p>

      <p>This code expires in <strong>5 minutes</strong>. Please don’t share it with anyone.</p>
      <p style="font-size: 14px; color: #777;">If you didn’t sign up, just ignore this email.</p>
    </div>
  `;
};

export const generalVerificationTemplate = ({
  purpose,
  userName,
  verificationCode,
}: BaseProps & { purpose: string }) => {
  return `<div>
  
            <p style="font-size:20px">Hi ${userName},</p>
            <p>You're receiving this email because you requested to ${purpose} on Beat Feedback. Please use the following verification code to proceed:</p>
            <p>Verification Code</p>
            <p style="background: #FD9ED7; width: fit-content; padding: 7px 10px; border-radius: 10px; font-size:20px; margin-top: -10px">${verificationCode}</p>
            <p>If you did not make this request, please disregard this email.</p>
            <p style="margin-top: -13px">Best regards,</p>
            <p><span style="font-size:14px;">The verification code will expire in 5 minutes.&nbsp;</span></p>
  
            </div>`;
};
