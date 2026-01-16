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
  canvas?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  };
}

export interface DocumentSandboxApi {
  analyzeBrandCompliance: (params: { brandProfile: import("../brandProfile").BrandProfile }) => Promise<BrandComplianceResult>;
  applySuggestion: () => Promise<{ status: string; message: string }>;
  getDesign: () => Promise<Design>;
  setDesign: (design: Design) => Promise<void>;
  applyTextFix: (params: { layerId: string; fixedText: string }) => Promise<{ status: string; message: string }>;
}
