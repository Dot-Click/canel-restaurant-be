import { Request, Response } from "express";
import { env } from "@/utils/env.utils";
import status from "http-status";

// export const handler = async (req: Request, res: Response) => {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   // Expect 'phoneNumbers' array instead of 'branchId'
//   const { message, phoneNumbers } = req.body;

//   // Validate the new payload
//   if (!message || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
//     return res.status(400).json({
//       error: "Message and a non-empty array of phoneNumbers are required",
//     });
//   }

//   try {
//     const sanitizedPhoneNumbers = phoneNumbers.map((number: string) =>
//       number.replace(/\s+/g, "").replace(/[^0-9+]/g, "")
//     );

//     const validPhoneNumbers = sanitizedPhoneNumbers.filter(
//       (number) => number.length > 0
//     );

//     if (validPhoneNumbers.length === 0) {
//       return res
//         .status(400)
//         .json({ error: "No valid phone numbers were provided." });
//     }

//     const smsPromises = validPhoneNumbers.map((number) =>
//       twilioClient.messages.create({
//         body: message,
//         from: process.env.TWILIO_PHONE_NUMBER!,
//         to: number,
//       })
//     );

//     const results = await Promise.allSettled(smsPromises);

//     results.forEach((result, index) => {
//       if (result.status === "rejected") {
//         console.error(
//           `Failed to send SMS to ${validPhoneNumbers[index]}:`,
//           result.reason
//         );
//       }
//     });

//     const successfulSends = results.filter(
//       (r) => r.status === "fulfilled"
//     ).length;

//     res.status(200).json({
//       message: "Broadcast initiated successfully.",
//       totalAttempted: validPhoneNumbers.length,
//       successfulSends,
//     });
//   } catch (error) {
//     console.error("Broadcast failed:", error);
//     res.status(500).json({ error: "An internal server error occurred." });
//   }
// };

export const scheduleWatiBroadcast = async (req: Request, res: Response) => {
  const { message, clients } = req.body;

  if (!message || !clients) {
    return res.status(400).json({
      success: false,
      message: "Missing 'message' or 'clients' in request body.",
    });
  }

  if (!Array.isArray(clients) || clients.length === 0) {
    return res.status(400).json({
      success: false,
      message: "'clients' must be a non-empty array.",
    });
  }

  const apiUrl = `${env.WATI_WHATSAPP_ENDPOINT}/api/v1/broadcast/scheduleBroadcast`;

  const scheduleDate = new Date();
  scheduleDate.setSeconds(scheduleDate.getSeconds() + 15);
  const scheduleAtISO = scheduleDate.toISOString();

  const watiRequestBody = {
    broadcastName: `Custom Broadcast - ${new Date().toISOString()}`,
    templateName: "broadcast_messages",
    scheduledAt: scheduleAtISO,
    receivers: clients.map((client) => ({
      whatsappNumber: client.phone,
      customParams: [
        {
          name: "name",
          value: client.name,
        },
        {
          name: "body",
          value: message,
        },
      ],
    })),
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WATI_WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(watiRequestBody),
    });

    if (apiResponse.ok) {
      const successData = await apiResponse.json();

      console.log("WATI broadcast scheduled successfully:", successData);

      return res.status(200).json({
        success: true,
        message: "Broadcast scheduled successfully!",
        data: successData,
      });
    } else {
      const errorData = await apiResponse.json();

      console.error("WATI API Error:", errorData);

      return res.status(status.OK).json({
        success: false,
        message: "Failed to schedule broadcast via WATI.",
        error: errorData,
      });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "An internal server error occurred." });
  }
};

//   } catch (error) {
//     console.error('Broadcast failed:', error);
//     res.status(500).json({ error: 'An internal server error occurred.' });
//   }
// }
