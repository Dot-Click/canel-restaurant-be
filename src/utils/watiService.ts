import axios from "axios";
import dotenv from "dotenv";
import { env } from "./env.utils";
import { database } from "@/configs/connection.config";

dotenv.config();

const WATI_API_ENDPOINT = env.WATI_WHATSAPP_ENDPOINT;
const WATI_ACCESS_TOKEN = env.WATI_WHATSAPP_ACCESS_TOKEN;

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

const WATI_BASE_URL = env.WATI_WHATSAPP_ENDPOINT!;
const WATI_API_KEY = env.WATI_WHATSAPP_ACCESS_TOKEN!;

export async function fetchAndSendNextCategoryPage(
  waNumber: string,
  page: number
) {
  const limitNum = 10;
  const offset = (page - 1) * limitNum;

  const categories = await database.query.category.findMany({
    columns: { id: true, name: true },
    limit: limitNum,
    offset,
    orderBy: (category, { asc }) => [asc(category.name)],
  });

  const hasMore = categories.length === limitNum;

  await sendCategoryList({
    to: waNumber,
    categories,
    page,
    hasMore,
  });
}

export async function sendProductsForCategory(
  waNumber: string,
  categoryId: string
) {
  // 1) Load the single category with its products
  const categoryWithProducts = await database.query.category.findFirst({
    where: (category, { eq, and }) =>
      and(eq(category.id, categoryId), eq(category.visibility, true)),
    with: {
      products: {
        with: {
          product: true,
        },
      },
    },
  });

  if (!categoryWithProducts) {
    await sendWatiSessionMessage({
      recipientPhoneNumber: waNumber,
      message: "No products found in this category.",
    });
    return;
  }

  const products = categoryWithProducts.products
    .map((cp) => cp.product)
    .filter(Boolean);

  if (!products.length) {
    await sendWatiSessionMessage({
      recipientPhoneNumber: waNumber,
      message: "No products found in this category.",
    });
    return;
  }

  // 3) Build a simple text list
  const textLines = products.map((p, i) => `${i + 1}. ${p.name} - ${p.price}`);
  const msg = `Products in this category:\n\n${textLines.join("\n")}`;

  await sendWatiSessionMessage({
    recipientPhoneNumber: waNumber,
    message: msg,
  });
}

export async function sendCategoryList(params: {
  to: string;
  categories: { id: string; name: string }[];
  page: number;
  hasMore: boolean;
}) {
  const { to, categories, page, hasMore } = params;

  const MAX_ROWS = 10;

  let rows = categories.map((c) => ({
    id: `${c.id}`,
    title: c.name.slice(0, 24),
    description: "",
  }));

  if (hasMore) {
    rows.push({
      id: `NEXT_PAGE_${page + 1}`,
      title: "See more",
      description: "",
    });
  }

  if (hasMore && rows.length >= MAX_ROWS) {
    rows = rows.slice(0, MAX_ROWS - 1);
    rows.push({
      id: `NEXT_PAGE_${page + 1}`,
      title: "See more",
      description: "",
    });
  } else {
    rows = rows.slice(0, MAX_ROWS);
  }

  const payload = {
    header: "",
    body: "Select a Category",
    footer: "",
    buttonText: "Open menu",
    sections: [
      {
        title: "Categorías",
        rows,
      },
    ],
  };

  await axios.post(
    `${WATI_BASE_URL}/api/v1/sendInteractiveListMessage?whatsappNumber=${to}`,
    payload,
    { headers: { Authorization: `Bearer ${WATI_API_KEY}` } }
  );
}

export async function downloadWatiMedia(fileName: string): Promise<Buffer> {
  if (!fileName) {
    throw new Error("fileName is required to download WATI media");
  }

  const url = `${WATI_BASE_URL}/api/v1/getMedia`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${WATI_API_KEY}`,
    },
    params: { fileName },
    responseType: "arraybuffer",
  });

  return Buffer.from(res.data);
}

export const statusTranslations: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  accepted_by_rider: "Aceptado por el repartidor",
  on_the_way: "En camino",
  out_for_delivery: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
  preparing: "Preparando",
  ready: "Listo",
};

export const getSpanishStatus = (status: string | null | undefined): string => {
  if (!status) return "Actualizado";
  return statusTranslations[status.toLowerCase()] || status;
};
