import { createHmac, timingSafeEqual } from "node:crypto";

type MomoConfig = {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  ipnUrl: string;
  redirectUrl: string;
};

export function getMomoConfig(): MomoConfig | null {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const endpoint = process.env.MOMO_ENDPOINT;
  const ipnUrl = process.env.MOMO_IPN_URL;
  const redirectUrl = process.env.MOMO_REDIRECT_URL;

  if (!partnerCode || !accessKey || !secretKey || !endpoint || !ipnUrl || !redirectUrl) {
    return null;
  }

  return { partnerCode, accessKey, secretKey, endpoint, ipnUrl, redirectUrl };
}

export function hmacSha256(secret: string, raw: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function safeSignatureEqual(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(expected) || !/^[a-f0-9]{64}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export function createMomoRequestSignature(input: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}) {
  const raw =
    `accessKey=${input.accessKey}&amount=${input.amount}&extraData=${input.extraData}` +
    `&ipnUrl=${input.ipnUrl}&orderId=${input.orderId}&orderInfo=${input.orderInfo}` +
    `&partnerCode=${input.partnerCode}&redirectUrl=${input.redirectUrl}` +
    `&requestId=${input.requestId}&requestType=${input.requestType}`;

  return hmacSha256(input.secretKey, raw);
}

export function verifyMomoCallback(body: Record<string, unknown>, config: MomoConfig) {
  const fields = {
    amount: String(body.amount ?? ""),
    extraData: String(body.extraData ?? ""),
    message: String(body.message ?? ""),
    orderId: String(body.orderId ?? ""),
    orderInfo: String(body.orderInfo ?? ""),
    orderType: String(body.orderType ?? ""),
    partnerCode: String(body.partnerCode ?? ""),
    payType: String(body.payType ?? ""),
    requestId: String(body.requestId ?? ""),
    responseTime: String(body.responseTime ?? ""),
    resultCode: String(body.resultCode ?? ""),
    transId: String(body.transId ?? "")
  };

  const raw =
    `accessKey=${config.accessKey}&amount=${fields.amount}&extraData=${fields.extraData}` +
    `&message=${fields.message}&orderId=${fields.orderId}&orderInfo=${fields.orderInfo}` +
    `&orderType=${fields.orderType}&partnerCode=${fields.partnerCode}&payType=${fields.payType}` +
    `&requestId=${fields.requestId}&responseTime=${fields.responseTime}` +
    `&resultCode=${fields.resultCode}&transId=${fields.transId}`;

  const expected = hmacSha256(config.secretKey, raw);
  return safeSignatureEqual(expected, String(body.signature ?? ""));
}
