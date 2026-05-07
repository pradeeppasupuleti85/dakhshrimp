export interface BatchData {
  batchId: string;
  productName: string;
  variety: string;
  weight: string;
  grade: string;
  farm: string;
  pondId: string;
  location: string;
  district: string;
  waterSource: string;
  coords: string;
  pondArea: string;
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
  tempMaintained: string;
  storageFacility: string;
  tempScore: number;
}
