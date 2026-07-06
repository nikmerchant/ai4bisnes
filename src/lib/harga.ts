// Harga langganan (RM). Ubah di sini sahaja — semua UI dan bil ikut nilai ini.
// Harga "founding member" — dikunci pada price_rm dalam subscriptions semasa bayar.
// Strategi Good-Better-Best: jurang Pro→Max sengaja kecil (1.4x) supaya Max
// nampak jelas berbaloi ("tambah RM20 dapat coach penuh"). Harga founding —
// pelan: naik ke 79/99 selepas ada bukti & testimoni (pelanggan lama grandfather).
export const HARGA = {
  pro: { bulanan: 49, tahunan: 490 }, // tahunan = 10 bulan (jimat 2 bulan)
  max: { bulanan: 69, tahunan: 690 },
} as const;

// Had tempat harga founding member — bilangan sebenar diambil dari
// RPC founding_count() (kira subscriptions price_rm founding, tak boleh dipalsukan).
export const SLOT_FOUNDING = 50;

export type TierBayar = keyof typeof HARGA;
export type Tempoh = keyof (typeof HARGA)["pro"];

export const NAMA_TIER: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  max: "Max",
};
