import dotenv from "dotenv";

dotenv.config();

interface BaseProps {
  verificationCode: string;
  userName: string;
  email: string;
}

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

export const resetPasswordTemplate = ({
  userName,
  resetLink,
}: {
  userName: string;
  resetLink: string;
}) => {
  const primaryColor = "#3B5545";
  const accentColor = "#4C9F7B";

  // const logoUrl = env.LOGO_IMAGE_URL;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333333;
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
        }
        .content {
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .button {
            background-color: ${accentColor};
            color: #ffffff;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
        }
        .footer {
            text-align: center;
            padding-top: 20px;
            font-size: 12px;
            color: #888888;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <div class="container" style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
        <div class="header" style="text-align: center; padding-bottom: 20px;">
            <img src="/images/Logos/logo.png" alt="Canel Restaurant Logo" style="max-width: 120px;" />
        </div>
        <div class="content" style="background-color: #ffffff; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h1 style="color: ${primaryColor}; font-size: 24px;">Password Reset Request</h1>
            <p style="font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
            <p style="font-size: 16px; line-height: 1.6;">We received a request to reset your password. If this wasn't you, you can safely ignore this email.</p>
            <p style="font-size: 16px; line-height: 1.6;">Click the button below to set a new password:</p>
            <a href="${resetLink}" class="button" style="background-color: ${accentColor}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">Reset Your Password</a>
            <p style="font-size: 14px; color: #888888; margin-top: 30px;">This link will expire in 1 hour.</p>
        </div>
        <div class="footer" style="text-align: center; padding-top: 20px; font-size: 12px; color: #888888;">
            <p>Thank you for choosing Canel Restaurant.</p>
            <p>© ${new Date().getFullYear()} Canel Restaurant. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};

interface OrderItem {
  name: string;
  quantity: number;
  selectedAddons?: string[];
}

interface OrderConfirmationProps {
  userName: string;
  orderId: string;
  orderDate: string;
  orderType: "pickup" | "delivery";
  shippingAddress?: string;
  items: OrderItem[];
  // Removed subtotal, discount, shippingCost, total to match your controller
}

// ---- Template ----

export const orderPlacementTemplate = ({
  userName,
  orderId,
  orderDate,
  orderType,
  shippingAddress,
  items,
}: OrderConfirmationProps) => {
  const primaryColor = "#3B5545";
  const accentColor = "#4C9F7B";
  const lightGray = "#eeeeee";

  // Generate HTML for the list of items
  const itemsHtml = items
    .map((item) => {
      const addonsHtml =
        item.selectedAddons && item.selectedAddons.length > 0
          ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">+ ${item.selectedAddons.join(
              ", "
            )}</div>`
          : "";

      return `
      <tr style="border-bottom: 1px solid ${lightGray};">
        <td style="padding: 12px 0;">
          <strong style="color: #333;">${item.name}</strong>
          ${addonsHtml}
        </td>
        <td style="padding: 12px 0; text-align: right; color: #555;">x${item.quantity}</td>
      </tr>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; }
        .content { background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .button { background-color: ${accentColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <div class="container" style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
        
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 20px;">
            <img src="${
              process.env.FRONTEND_DOMAIN
            }/images/Logos/logo.png" alt="Canel Restaurant" style="max-width: 100px;" />
        </div>

        <!-- Main Content -->
        <div class="content" style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            
            <h1 style="color: ${primaryColor}; font-size: 24px; text-align: center; margin-top: 0;">Order Confirmed!</h1>
            <p style="font-size: 16px; line-height: 1.6; text-align: center;">
                Hi ${userName}, thank you for your order. We've received it and are getting it ready.
            </p>

            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; color: #555;">Order ID</p>
                <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">#${orderId}</p>
                <p style="margin: 5px 0 0; font-size: 12px; color: #888;">${orderDate}</p>
            </div>

            <!-- Order Details Table -->
            <h3 style="color: ${primaryColor}; border-bottom: 2px solid ${accentColor}; padding-bottom: 8px; margin-top: 30px;">Order Summary</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th align="left" style="color: #888; font-size: 12px; text-transform: uppercase; padding-bottom: 8px;">Item</th>
                        <th align="right" style="color: #888; font-size: 12px; text-transform: uppercase; padding-bottom: 8px;">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- Customer Details -->
            <div style="margin-top: 30px; border-top: 1px dashed #ddd; padding-top: 20px;">
                <h4 style="color: ${primaryColor}; margin-bottom: 10px;">Customer Details</h4>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Type:</strong> ${
                  orderType === "delivery" ? "Delivery" : "Store Pickup"
                }</p>
                ${
                  orderType === "delivery" && shippingAddress
                    ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Address:</strong> ${shippingAddress}</p>`
                    : ""
                }
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-top: 40px;">
                <a href="${
                  process.env.FRONTEND_DOMAIN
                }/orders/${orderId}" class="button" style="background-color: ${accentColor}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Order Status</a>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; font-size: 12px; color: #888888;">
            <p>Need help? Contact us at support@canelrestaurant.com</p>
            <p>© ${new Date().getFullYear()} Canel Restaurant. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
};
