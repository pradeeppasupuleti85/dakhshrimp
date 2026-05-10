// ─────────────────────────────────────────────────────────────────
// DAKSH Traceability Data Layer
// Currently: mock JSON → Future: swap getBatch() body for Airtable
// ─────────────────────────────────────────────────────────────────

export interface BatchData {
  batchId: string;
  variety: string;
  source: string;
  farm: string;
  district: string;
  waterSource: string;
  coords: string;
  harvestDate: string;
  processingDate: string;
  packagedDate: string;
  labDate: string;
  labStatus: string;
  labName: string;
  antibioticResult: string;
  heavyMetals: string;
  microbialCount: string;
  fssaiNumber: string;
  tempRange: string;
  tempMaintained: string;
  tempScore: number;
  storageFacility: string;
  packSizes: string[];
  status: string;
}

const MOCK_BATCHES: Record<string, BatchData> = {
  "NS-240801-A": {
    batchId: "NS-240801-A",
    variety: "Normal Shrimp",
    source: "Ganapavaram",
    farm: "Coastal Blue Aqua Farm",
    district: "Krishna District, Andhra Pradesh",
    waterSource: "Brackish water, canal fed",
    coords: "16.4201 N, 80.9935 E",
    harvestDate: "01 Aug 2026",
    processingDate: "02 Aug 2026",
    packagedDate: "03 Aug 2026",
    labDate: "02 Aug 2026",
    labStatus: "Passed",
    labName: "Eurofins Food Testing India Pvt Ltd, Hyderabad",
    antibioticResult: "Not Detected (< 0.001 ppm)",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 1x10^5 CFU/g — Safe",
    fssaiNumber: "10013022000041",
    tempRange: "0°C to 4°C",
    tempMaintained: "Maintained",
    tempScore: 98,
    storageFacility: "DAKSH Cold Room, Ganapavaram",
    packSizes: ["600g", "1kg"],
    status: "Active",
  },
  "CR-240801-A": {
    batchId: "CR-240801-A",
    variety: "Chitti Royyalu",
    source: "Bhimavaram",
    farm: "Sri Lakshmi Village Pond Farm",
    district: "West Godavari District, Andhra Pradesh",
    waterSource: "Traditional brackish pond, tidal fed",
    coords: "16.5448 N, 81.5212 E",
    harvestDate: "01 Aug 2026",
    processingDate: "02 Aug 2026",
    packagedDate: "03 Aug 2026",
    labDate: "02 Aug 2026",
    labStatus: "Passed",
    labName: "SGS India Pvt Ltd, Vijayawada",
    antibioticResult: "Not Detected",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 5x10^4 CFU/g — Safe",
    fssaiNumber: "10013022000041",
    tempRange: "0°C to 4°C",
    tempMaintained: "Maintained",
    tempScore: 100,
    storageFacility: "DAKSH Facility, Bhimavaram",
    packSizes: ["600g", "1kg"],
    status: "Active",
  },
  "TS-240801-A": {
    batchId: "TS-240801-A",
    variety: "Tiger Shrimp",
    source: "Kavali",
    farm: "Kavali Export Aqua Farms",
    district: "Nellore District, Andhra Pradesh",
    waterSource: "Saline water, sea inlet fed",
    coords: "14.9167 N, 79.9944 E",
    harvestDate: "01 Aug 2026",
    processingDate: "02 Aug 2026",
    packagedDate: "03 Aug 2026",
    labDate: "02 Aug 2026",
    labStatus: "Passed",
    labName: "TUV SUD South Asia, Hyderabad",
    antibioticResult: "Not Detected (< 0.001 ppm)",
    heavyMetals: "Below permissible limits",
    microbialCount: "TVC < 3x10^4 CFU/g — Safe",
    fssaiNumber: "10013022000041",
    tempRange: "0°C to 3°C",
    tempMaintained: "Maintained",
    tempScore: 99,
    storageFacility: "DAKSH Export Cold Chain, Kavali",
    packSizes: ["600g", "1kg"],
    status: "Active",
  },
};

export async function getBatch(id: string): Promise<BatchData | null> {
  return MOCK_BATCHES[id] ?? null;
}
