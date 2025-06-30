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

// export const generalVerificationTemplate = ({
//   purpose,
//   userName,
//   verificationCode,
// }: BaseProps & { purpose: string }) => {
//   return `<div>

//             <p style="font-size:20px">Hi ${userName},</p>
//             <p>You're receiving this email because you requested to ${purpose} on Beat Feedback. Please use the following verification code to proceed:</p>
//             <p>Verification Code</p>
//             <p style="background: #FD9ED7; width: fit-content; padding: 7px 10px; border-radius: 10px; font-size:20px; margin-top: -10px">${verificationCode}</p>
//             <p>If you did not make this request, please disregard this email.</p>
//             <p style="margin-top: -13px">Best regards,</p>
//             <p><span style="font-size:14px;">The verification code will expire in 5 minutes.&nbsp;</span></p>

//             </div>`;
// };
