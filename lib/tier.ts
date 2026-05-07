export function normalizeOpening(cr: number): number {
  if (cr >= 150) return 100;
  if (cr >= 100) return 90;
  if (cr >= 70) return 80;
  if (cr >= 40) return 70;
  if (cr >= 25) return 60;
  if (cr >= 10) return 45;
  return 35;
}

export function grossBand(value: number): number {
  if (value >= 1000) return 100;
  if (value >= 500) return 95;
  if (value >= 300) return 90;
  if (value >= 200) return 85;
  if (value >= 120) return 80;
  if (value >= 80) return 75;
  if (value >= 50) return 65;
  return 55;
}

export function determineTier(si: number): number {
  if (si >= 85) return 1;
  if (si >= 65) return 2;
  return 3;
}
