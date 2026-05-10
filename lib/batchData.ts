export interface BatchData {
  batchId: string;
  productName: string;
  variety: string;
  source: string;
  farm: string;
  pondId: string;
  location: string;
  district: string;
  waterSource: string;
  coords: string;
  harvestDate: string;
  processingDate: string;
  labDate: string;
  packagedDate: string;
  labStatus: "Passed" | "Failed" | "Pending";
  labName: string;
  antibioticResult: string;
  heavyMetals: string;
  microbialCount: string;
  fssaiCompliant: string;
  tempRange: string;
  tempScore: number;
  storageFacility: string;
}

export const BATCH_DATA: Record<string, BatchData> = {
  "NS-240801-A": {
    batchId: "NS-240801-A",
    productName: "Normal Shrimp",
    variety: "Litopenaeus vannamei (Pacific White)",
    source: "Ganapavaram",
    farm: "Coastal Blue Aqua Farm",
    pondId: "POND-GNP-004",
    location: "Ganapavaram, Andhra Pradesh",
    district: "Krishna District",
    waterSource: "Brackish water, canal fed",
    coords: "16.4201° N, 80.9935° E",
    harvestDate: "01 Aug 2024",
    processingDate: "02 Aug 2024",
    labDate: "03 Aug 2024",
    packagedDate: "04 Aug 2024",
    labStatus: "Passed",
    labName: "Eurofins Food Testing India, Hyderabad",
    antibioticResult: "Not Detected (< 0.001 ppm)",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 1×10⁵ CFU/g — Safe",
    fssaiCompliant: "Yes — Reg. 10013022000041",
    tempRange: "0°C to 4°C",
    tempScore: 98,
    storageFacility: "DAKH Cold Room, Ganapavaram",
  },
  "CR-240801-A": {
    batchId: "CR-240801-A",
    productName: "Chitti Royyalu",
    variety: "Penaeus indicus (Indian White Prawn)",
    source: "Bhimavaram",
    farm: "Sri Lakshmi Village Pond Farm",
    pondId: "POND-BHM-012",
    location: "Bhimavaram, Andhra Pradesh",
    district: "West Godavari District",
    waterSource: "Traditional brackish pond, tidal fed",
    coords: "16.5448° N, 81.5212° E",
    harvestDate: "01 Aug 2024",
    processingDate: "01 Aug 2024",
    labDate: "02 Aug 2024",
    packagedDate: "03 Aug 2024",
    labStatus: "Passed",
    labName: "SGS India Pvt Ltd, Vijayawada",
    antibioticResult: "Not Detected",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 5×10⁴ CFU/g — Safe",
    fssaiCompliant: "Yes — Reg. 10013022000041",
    tempRange: "0°C to 4°C",
    tempScore: 100,
    storageFacility: "DAKH Facility, Bhimavaram",
  },
  "TS-240801-A": {
    batchId: "TS-240801-A",
    productName: "Tiger Shrimp",
    variety: "Penaeus monodon (Black Tiger Prawn)",
    source: "Kavali",
    farm: "Kavali Export Aqua Farms",
    pondId: "POND-KVL-007",
    location: "Kavali, Andhra Pradesh",
    district: "Nellore District",
    waterSource: "Saline water, sea inlet fed",
    coords: "14.9167° N, 79.9944° E",
    harvestDate: "01 Aug 2024",
    processingDate: "02 Aug 2024",
    labDate: "03 Aug 2024",
    packagedDate: "04 Aug 2024",
    labStatus: "Passed",
    labName: "TÜV SÜD South Asia, Hyderabad",
    antibioticResult: "Not Detected (< 0.001 ppm)",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 3×10⁴ CFU/g — Safe",
    fssaiCompliant: "Yes — Reg. 10013022000041",
    tempRange: "0°C to 3°C",
    tempScore: 99,
    storageFacility: "DAKH Export Cold Chain, Kavali",
  },
};

export function getBatch(id: string): BatchData | null {
  return BATCH_DATA[id] ?? null;
}

export const ALL_BATCHES = Object.values(BATCH_DATA);
