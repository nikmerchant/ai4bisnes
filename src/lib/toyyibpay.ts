// Integrasi toyyibPay (FPX Malaysia). Aktif bila env berikut diset:
//   TOYYIBPAY_SECRET_KEY, TOYYIBPAY_CATEGORY_CODE, NEXT_PUBLIC_APP_URL
const API = "https://toyyibpay.com/index.php/api";

export function toyyibDikonfigurasi() {
  return Boolean(
    process.env.TOYYIBPAY_SECRET_KEY && process.env.TOYYIBPAY_CATEGORY_CODE
  );
}

export async function ciptaBil(opts: {
  namaBil: string;
  deskripsi: string;
  amaunRM: number;
  emel: string;
  rujukan: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const body = new URLSearchParams({
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY!,
    categoryCode: process.env.TOYYIBPAY_CATEGORY_CODE!,
    billName: opts.namaBil.slice(0, 30),
    billDescription: opts.deskripsi.slice(0, 100),
    billPriceSetting: "1",
    billPayorInfo: "1",
    billAmount: String(Math.round(opts.amaunRM * 100)), // dalam sen
    billReturnUrl: `${appUrl}/naik-taraf`,
    billCallbackUrl: `${appUrl}/api/bayaran/callback`,
    billExternalReferenceNo: opts.rujukan,
    billTo: "Pelanggan AI4Bisnes",
    billEmail: opts.emel,
    billPhone: "0000000000",
    billPaymentChannel: "2", // FPX + kad
  });

  const res = await fetch(`${API}/createBill`, { method: "POST", body });
  const data = await res.json();
  const billCode = Array.isArray(data) ? data[0]?.BillCode : null;
  if (!billCode) throw new Error("toyyibPay: gagal cipta bil");
  return { billCode, url: `https://toyyibpay.com/${billCode}` };
}

export async function bilTelahDibayar(billCode: string) {
  const body = new URLSearchParams({
    userSecretKey: process.env.TOYYIBPAY_SECRET_KEY!,
    billCode,
    billpaymentStatus: "1",
  });
  const res = await fetch(`${API}/getBillTransactions`, {
    method: "POST",
    body,
  });
  const data = await res.json().catch(() => []);
  return Array.isArray(data) && data.length > 0;
}
