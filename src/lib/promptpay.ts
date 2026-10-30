/**
 * Thai QR Payment (PromptPay) payload generator — EMVCo Merchant-Presented QR.
 * Supports: mobile number (10 digits), national ID / tax ID (13 digits),
 * e-wallet ID (15 digits). Amount is embedded so the customer can't mistype it.
 */

function tlv(id: string, value: string) {
  return id + value.length.toString().padStart(2, "0") + value;
}

export function crc16(data: string) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function promptPayPayload(target: string, amount?: number) {
  const id = target.replace(/\D/g, "");
  let account: string;
  if (id.length === 10) {
    account = tlv("01", ("0000000000000" + "66" + id.slice(1)).slice(-13)); // mobile
  } else if (id.length === 13) {
    account = tlv("02", id); // national ID / tax ID
  } else if (id.length === 15) {
    account = tlv("03", id); // e-wallet
  } else {
    throw new Error("PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก, เลขบัตร/ภาษี 13 หลัก หรือ e-Wallet 15 หลัก");
  }

  const hasAmount = typeof amount === "number" && amount > 0;
  const body =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") + // 12 = dynamic (single use, with amount)
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("58", "TH") +
    tlv("53", "764") + // THB
    (hasAmount ? tlv("54", amount!.toFixed(2)) : "") +
    "6304";
  return body + crc16(body);
}
