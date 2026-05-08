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