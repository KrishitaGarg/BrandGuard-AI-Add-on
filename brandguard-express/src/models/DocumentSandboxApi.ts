// This interface declares all the APIs that the document sandbox runtime ( i.e. code.ts ) exposes to the UI/iframe runtime
export interface BrandComplianceResult {
  status: string;
  totalLayers: number;
  textLayers: number;
  imageLayers: number;
  shapeLayers: number;
  brandScore: number;
  issues: string[];
}

export interface DesignLayer {
  id: string;
  type: string;
  fill?: string;
  fontFamily?: string;
  content?: string;
  width?: number;
}

export interface Design {
  layers: DesignLayer[];
}

export interface DocumentSandboxApi {
  analyzeBrandCompliance: () => Promise<BrandComplianceResult>;
  applySuggestion: () => Promise<{ status: string; message: string }>;
  getDesign: () => Promise<Design>;
}
