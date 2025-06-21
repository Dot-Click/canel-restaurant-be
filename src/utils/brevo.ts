interface BaseProps {
  verificationCode: string;
  userName: string;
}

export const signupTemplate = ({ userName, verificationCode }: BaseProps) => {
  return `<div>   
          <p style="font-size:20px">Hi ${userName},</p>
          <p>We're happy you signed up for Beat Feedback. To start exploring our app and neighborhood, please use the following verification code to proceed:</p>
          <p>Verification Code</p>
          <p style="background: #FD9ED7; width: fit-content; padding: 7px 10px; border-radius: 10px; font-size:20px; margin-top: -10px">${verificationCode}</p>
          <p>Welcome to Beat Feedback!</p>
          <p><span style="font-size:14px;">The verification code will expire in 5 minutes.&nbsp;</span></p>
          </div>`;
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
