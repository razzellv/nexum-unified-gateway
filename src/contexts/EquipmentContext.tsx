import { createContext, useContext, useState, ReactNode } from 'react';

export interface ExtractedSpecs {
  Equipment_Type?: string;
  Brand?: string;
  Model?: string;
  Serial_Number?: string;
  Capacity?: string;
  Power?: string;
  Voltage?: string;
  [key: string]: any;
}

interface AnalysisResult {
  success: boolean;
  analysis?: string;
  confidence?: number;
  warnings?: string[];
}

interface SpecsResult {
  success: boolean;
  data?: ExtractedSpecs;
  confidence?: number;
  warnings?: string[];
}

interface EquipmentItem {
  id: string;
  specs: ExtractedSpecs;
  confidence: number;
  documentType: string;
  createdAt: string;
}

interface EquipmentContextType {
  analysisResult: AnalysisResult | null;
  specsResult: SpecsResult | null;
  isProcessing: boolean;
  equipmentLibrary: EquipmentItem[];
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setSpecsResult: (result: SpecsResult | null) => void;
  setIsProcessing: (processing: boolean) => void;
  clearAnalysis: () => void;
  addToLibrary: (item: Omit<EquipmentItem, 'id' | 'createdAt'>) => void;
  removeFromLibrary: (id: string) => void;
  clearLibrary: () => void;
  mergeEquipment: (existingId: string, newSpecs: ExtractedSpecs) => void;
}

const EquipmentContext = createContext<EquipmentContextType | undefined>(undefined);

export function EquipmentProvider({ children }: { children: ReactNode }) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [specsResult, setSpecsResult] = useState<SpecsResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [equipmentLibrary, setEquipmentLibrary] = useState<EquipmentItem[]>([]);

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setSpecsResult(null);
  };

  const addToLibrary = (item: Omit<EquipmentItem, 'id' | 'createdAt'>) => {
    const newItem: EquipmentItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEquipmentLibrary(prev => [...prev, newItem]);
  };

  const removeFromLibrary = (id: string) => {
    setEquipmentLibrary(prev => prev.filter(item => item.id !== id));
  };

  const clearLibrary = () => {
    setEquipmentLibrary([]);
  };

  const mergeEquipment = (existingId: string, newSpecs: ExtractedSpecs) => {
    setEquipmentLibrary(prev =>
      prev.map(item =>
        item.id === existingId
          ? { ...item, specs: { ...item.specs, ...newSpecs } }
          : item
      )
    );
  };

  return (
    <EquipmentContext.Provider
      value={{
        analysisResult,
        specsResult,
        isProcessing,
        equipmentLibrary,
        setAnalysisResult,
        setSpecsResult,
        setIsProcessing,
        clearAnalysis,
        addToLibrary,
        removeFromLibrary,
        clearLibrary,
        mergeEquipment,
      }}
    >
      {children}
    </EquipmentContext.Provider>
  );
}

export function useEquipment() {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipment must be used within EquipmentProvider');
  }
  return context;
}
