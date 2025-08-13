// import fetch from "node-fetch";
// import { encrypt } from "../lib/crypto";
// import { env } from "@/utils/env.utils";

// export default async function payTDC({
//   data,
//   merchantId,
//   integratorId,
//   terminalId,
//   clientId,
// }: any) {
//   const body = {
//     merchant_identify: {
//       integratorId,
//       merchantId,
//       terminalId,
//     },
//     client_identify: {
//       ipaddress: data.ip || "127.0.0.1",
//       browser_agent: data.browser || "Chrome",
//       mobile: { manufacturer: data.manufacturer || "Unknown" },
//     },
//     transaction: {
//       trx_type: "compra",
//       payment_method: "tdc",
//       customer_id: data.customerId,
//       card_number: data.cardNumber,
//       expiration_date: data.expirationDate,
//       cvv: encrypt(data.cvv, env.MERCANTILE_SECRET_KEY),
//       currency: "ves",
//       amount: data.amount,
//       invoice_number: data.invoiceNumber,
//     },
//   };

//   console.log("this is the body:-", body);

//   const requestOptions = {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "X-IBM-Client-ID": clientId,
//     },
//     body: JSON.stringify(body),
//   };

//   const res = await fetch(
//     "https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/payment/pay",
//     requestOptions
//   );

//   const dataSecond = await res.json();
//   console.log("This is the response:-", dataSecond);
//   return dataSecond;
// }
