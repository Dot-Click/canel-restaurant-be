import { database } from "@/configs/connection.config";
import { orderItems, orders } from "@/schema/schema";
import { sendWatiSessionMessage } from "./watiService";

const userSessions = new Map<string, { state: string; order: any }>();

export const handleIncomingMessage = async ({ senderId, messageText }: any) => {
  let session = userSessions.get(senderId) || {
    state: "GREETING",
    order: { items: [], customerId: senderId },
  };

  //   console.log("this is the SESSION:-", session);

  let replyText = "";

  switch (session.state) {
    case "GREETING":
      console.log(session.state);
      replyText =
        "Welcome to Canel Restaurant! Say 'menu' to see our delicious food or 'status' to check an order.";
      session.state = "AWAITING_COMMAND";
      break;

    case "AWAITING_COMMAND":
      if (messageText.toLowerCase().includes("menu")) {
        const items = await database.select().from(orderItems).limit(10);
        replyText =
          "Here's our menu:\n" +
          items
            .map((i) => `➡️ ${i.id}. ${i.productName} - $${i.price}`)
            .join("\n");
        replyText +=
          "\n\nPlease type the number of the item you'd like to order.";
        session.state = "ORDERING";
      } else {
        replyText =
          "Sorry, I didn't get that. You can say 'menu' to start an order.";
      }
      break;

    case "ORDERING":
      const itemId = parseInt(messageText);
      session.order.items.push({ id: itemId });
      replyText = `Great choice! Item ${itemId} added to your order. Add another item number, or say 'checkout' to finish.`;
      session.state = "CHECKOUT_PROMPT";
      break;

    case "CHECKOUT_PROMPT":
      if (messageText.toLowerCase().includes("checkout")) {
        const finalOrder = await database
          .insert(orders)
          .values({
            status: "pending",
            source: "chatbot",
            // customerPhoneNumber: session.order.customerId,
            // totalPrice: TotalPrice,
            name: "WhatsApp User",
            location: "WhatsApp",
            phoneNumber: session.order.customerId,
          })
          .returning();

        replyText = `✅ Your order #${finalOrder[0].id} is confirmed! We will notify you with updates. Thank you!`;
        userSessions.delete(senderId);
      } else {
        const itemId = parseInt(messageText);
        session.order.items.push({ id: itemId });
        replyText = `Item ${itemId} added! Anything else, or are you ready to 'checkout'?`;
      }
      break;

    default:
      replyText =
        "Sorry, I'm a bit confused. Let's start over. Say 'menu' to see our food selection.";
      userSessions.delete(senderId);
  }

  if (userSessions.has(senderId) || session.state !== "GREETING") {
    userSessions.set(senderId, session);
  }

  await sendWatiSessionMessage({
    recipientPhoneNumber: senderId,
    message: replyText,
  });
};
