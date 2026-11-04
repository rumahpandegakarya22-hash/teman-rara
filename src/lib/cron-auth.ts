/** Bandingkan secret tanpa berhenti di byte pertama yang beda (anti timing attack). */
export function cocokSecret(diberi: string | null, benar: string | undefined): boolean {
  if (!diberi || !benar) return false;
  const enc = new TextEncoder();
  const a = enc.encode(diberi);
  const b = enc.encode(benar);
  let beda = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) beda |= (a[i] ?? 0) ^ b[i];
  return beda === 0;
}
