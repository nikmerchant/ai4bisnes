// Browser-safe SHA-256 used for protected content hashes.
export function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) words[i >> 2] = (words[i >> 2] || 0) | bytes[i] << (24 - (i % 4) * 8);
  const bitLength = bytes.length * 8;
  words[bitLength >> 5] = (words[bitLength >> 5] || 0) | 0x80 << (24 - bitLength % 32);
  words[((bitLength + 64 >> 9) << 4) + 15] = bitLength;
  const k: number[] = [];
  const h: number[] = [];
  const isPrime = (n: number) => { for (let f = 2; f * f <= n; f += 1) if (n % f === 0) return false; return true; };
  let prime = 2;
  while (k.length < 64) {
    if (isPrime(prime)) {
      if (h.length < 8) h.push((Math.sqrt(prime) * 0x100000000) | 0);
      k.push((Math.cbrt(prime) * 0x100000000) | 0);
    }
    prime += 1;
  }
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  let state = h.slice();
  for (let offset = 0; offset < words.length; offset += 16) {
    const w = words.slice(offset, offset + 16);
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15] | 0; const y = w[i - 2] | 0;
      const s0 = rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
      const s1 = rotr(17, y) ^ rotr(19, y) ^ (y >>> 10);
      w[i] = ((w[i - 16] | 0) + s0 + (w[i - 7] | 0) + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = state;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    state = state.map((v, i) => (v + [a, b, c, d, e, f, g, hh][i]) | 0);
  }
  return state.map((n) => (n >>> 0).toString(16).padStart(8, "0")).join("");
}
