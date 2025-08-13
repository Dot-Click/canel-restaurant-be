import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WATI_API_ENDPOINT = process.env.WATI_WHATSAPP_ENDPOINT;
const WATI_ACCESS_TOKEN = process.env.WATI_WHATSAPP_ACCESS_TOKEN;

interface TemplateParameter {
  name: string;
  value: string;
}

interface SendTemplateMessageParams {
  recipientPhoneNumber: string;
  templateName: string;
  parameters: TemplateParameter[];
}

export const sendWatiTemplateMessage = async ({
  recipientPhoneNumber,
  templateName,
  parameters,
}: SendTemplateMessageParams): Promise<void> => {
  const url = `${WATI_API_ENDPOINT}/api/v2/sendTemplateMessage`;

  console.log("--- WATI Request Details ---");
  console.log("Endpoint:", url);
  console.log("Template Name:", templateName);
  console.log("Parameters:", parameters);
  console.log("Access Token Loaded:", !!WATI_ACCESS_TOKEN);
  console.log("--------------------------");

  try {
    await axios.post(
      url,
      {
        template_name: templateName,
        broadcast_name: `new_chat_v1_130820251910`,
        parameters: parameters,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WATI_ACCESS_TOKEN}`,
        },
        params: {
          whatsappNumber: recipientPhoneNumber,
        },
      }
    );
    console.log(
      `WATI template message '${templateName}' sent successfully to ${recipientPhoneNumber}.`
    );
  } catch (error) {
    console.error("--- WATI API REQUEST FAILED ---");
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error("WATI Server Response Status:", error.response.status);
        console.error(
          "WATI Server Response Data:",
          JSON.stringify(error.response.data, null, 2)
        );
      } else if (error.request) {
        console.error(
          "Request failed. No response was received from WATI:",
          error.request
        );
      } else {
        console.error("Axios setup error:", error.message);
      }
    } else {
      console.error("An unexpected non-Axios error occurred:", error);
    }
    throw new Error("Failed to send WhatsApp template message via WATI.");
  }
};

export const sendWatiSessionMessage = async ({
  recipientPhoneNumber,
  message,
}: any) => {
  const url = `${process.env.WATI_WHATSAPP_ENDPOINT}/v1/sendSessionMessage/${recipientPhoneNumber}`;

  try {
    const res = await axios.post(
      url,
      { messageText: message },
      {
        headers: {
          Authorization: `Bearer ${process.env.WATI_WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

    console.log("This is the Response:", res);

    console.log(`WATI session message sent to ${recipientPhoneNumber}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error sending WATI session message:", error);
    } else {
      console.error("An unexpected error occurred:", error);
    }
  }
};
