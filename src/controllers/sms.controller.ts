import { twilioClient } from "@/configs/mailgun.config";
import { Request, Response } from "express";

export const handler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Expect 'phoneNumbers' array instead of 'branchId'
  const { message, phoneNumbers } = req.body;

  // Validate the new payload
  if (!message || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return res.status(400).json({
      error: "Message and a non-empty array of phoneNumbers are required",
    });
  }

  try {
    const sanitizedPhoneNumbers = phoneNumbers.map((number: string) =>
      number.replace(/\s+/g, "").replace(/[^0-9+]/g, "")
    );

    const validPhoneNumbers = sanitizedPhoneNumbers.filter(
      (number) => number.length > 0
    );

    if (validPhoneNumbers.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid phone numbers were provided." });
    }

    const smsPromises = validPhoneNumbers.map((number) =>
      twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: number,
      })
    );

    const results = await Promise.allSettled(smsPromises);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to send SMS to ${validPhoneNumbers[index]}:`,
          result.reason
        );
      }
    });

    const successfulSends = results.filter(
      (r) => r.status === "fulfilled"
    ).length;

    res.status(200).json({
      message: "Broadcast initiated successfully.",
      totalAttempted: validPhoneNumbers.length,
      successfulSends,
    });
  } catch (error) {
    console.error("Broadcast failed:", error);
    res.status(500).json({ error: "An internal server error occurred." });
  }
};

//   } catch (error) {
//     console.error('Broadcast failed:', error);
//     res.status(500).json({ error: 'An internal server error occurred.' });
//   }
// }
