import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEquipment } from "@/contexts/EquipmentContext";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileToBase64WithResize } from "@/lib/utils";

// ── Equipment categories ───────────────────────────────────────────────────────
const EQUIPMENT_CATEGORIES = [
  { value: 'HVAC',                  label: 'HVAC' },
  { value: 'Production',            label: 'Production (Stationary Assets)' },
  { value: 'Operations',            label: 'Operations' },
  { value: 'Electrical',            label: 'Electrical / Cogeneration' },
  { value: 'Water Treatment',       label: 'Water Treatment' },
  { value: 'Steam & Condensate',    label: 'Steam & Condensate' },
  { value: 'Medical & Lab',         label: 'Medical & Lab' },
  { value: 'Pumping',               label: 'Pumping' },
  { value: 'Refrigeration',         label: 'Refrigeration' },
  { value: 'Conveying',             label: 'Conveying & Material Handling' },
  { value: 'Other',                 label: 'Other' },
];

const ASSET_ROLES = [
  { value: 'active',     label: 'Active Equipment',    description: 'Directly produces output or performs a primary function' },
  { value: 'supportive', label: 'Supportive Equipment', description: 'Supports or enables active equipment to operate' },
];

const UploadSection = () => {
  const {
    setAnalysisResult,
    setSpecsResult,
    isProcessing,
    setIsProcessing,
    clearAnalysis,
  } = useEquipment();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'warning'>('idle');
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [isSavingToDB, setIsSavingToDB] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedZone, setSelectedZone] = useState('');

  // ── New fields ───────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAssetRole, setSelectedAssetRole] = useState('');

  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      if (!user?.facilityId) return;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/buildings?facilityId=${user.facilityId}`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('nexum_access_token')}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setBuildings(data.buildings || []);
          if (data.buildings?.length > 0) {
            setSelectedBuilding(data.buildings[0].buildingId);
          }
        }
      } catch (error) {
        console.error('Error loading buildings:', error);
      }
    };
    loadBuildings();
  }, [user?.facilityId]);

  const handleFile = async (file: File) => {
    const isHEIC = file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif';

    if (isHEIC) {
      toast({ title: "HEIC Format Not Supported", description: "Please convert to JPG/PNG first.", variant: "destructive" });
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast({ title: "Unsupported File Type", description: "Please upload an image (JPEG, PNG, WEBP) or PDF.", variant: "destructive" });
      return;
    }

    clearAnalysis();
    setIsProcessing(true);
    setUploadStatus('idle');
    setLastFileName(file.name);

    try {
      const base64Full = await fileToBase64WithResize(file);
      const base64 = base64Full.split(',')[1];
      const accessToken = localStorage.getItem('nexum_access_token');

      const response = await fetch('https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/instructor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: `Analyze this equipment nameplate/document and extract ALL specifications in a structured format.

Extract and provide:
1. Equipment Type (boiler, chiller, pump, AHU, compressor, cooling tower, conveyor, spiral freezer, etc.)
2. Manufacturer/Brand
3. Model Number
4. Serial Number
5. Capacity/Size (tons, BTU, GPM, CFM, etc.)
6. Power Rating (HP, kW)
7. Voltage and Phase
8. Refrigerant Type (if applicable)
9. Pressure Ratings (PSI, if applicable)
10. All other technical specifications visible on the nameplate

Format the response with clear labels and values.`,
          type: 'equipment_analysis',
          images: [{ base64, mimeType: file.type }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API returned ${response.status}: ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();

      if (data.response) {
        setAnalysisResult({ success: true, analysis: data.response, confidence: 85, warnings: [] });
        setSpecsResult({ success: true, data: { raw_analysis: data.response }, confidence: 85 });

        // Save to DynamoDB
        setIsSavingToDB(true);
        try {
          const analysisText = data.response;

          const manufacturerMatch = analysisText.match(/Manufacturer[:\s]+([^\n]+)/i) || analysisText.match(/Brand[:\s]+([^\n]+)/i);
          const modelMatch        = analysisText.match(/Model[:\s]+([^\n]+)/i);
          const serialMatch       = analysisText.match(/Serial Number[:\s]+([^\n]+)/i) || analysisText.match(/Serial[:\s]+([^\n]+)/i);
          const typeMatch         = analysisText.match(/Equipment Type[:\s]+([^\n]+)/i);
          const voltageMatch      = analysisText.match(/Voltage[:\s]+([^\n]+)/i);
          const capacityMatch     = analysisText.match(/Capacity[:\s]+([^\n]+)/i) || analysisText.match(/Size[:\s]+([^\n]+)/i);

          const equipmentData = {
            facilityId: user?.facilityId || 'facility-001',
            buildingId: selectedBuilding,
            floor: selectedFloor || null,
            zone: selectedZone || null,
            manufacturer: manufacturerMatch ? manufacturerMatch[1].trim() : 'Unknown',
            model: modelMatch ? modelMatch[1].trim() : 'Unknown',
            serialNumber: serialMatch ? serialMatch[1].trim() : 'N/A',
            equipmentType: typeMatch ? typeMatch[1].trim() : 'Other',

            // ── New fields ─────────────────────────────────────────────────────
            category: selectedCategory || 'Other',
            assetRole: selectedAssetRole || 'active',
            // ──────────────────────────────────────────────────────────────────

            specifications: { raw_analysis: analysisText },
            voltage: voltageMatch ? voltageMatch[1].trim() : null,
            capacity: capacityMatch ? capacityMatch[1].trim() : null,
            photos: [],
            aiExtracted: true,
            source: 'nameplate-scan',
            notes: `AI-analyzed on ${new Date().toISOString()}`,
          };

          const saveResponse = await fetch(
            'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/equipment/intelligence',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
              body: JSON.stringify(equipmentData),
            }
          );

          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();
            setUploadStatus('success');
            toast({
              title: saveResult.isDuplicate ? "⚠️ Equipment Saved (Duplicate Detected)" : "✅ Equipment Saved Successfully",
              description: saveResult.isDuplicate
                ? "This serial number already exists in the system."
                : `${equipmentData.manufacturer} ${equipmentData.model} added to library`,
            });
            window.dispatchEvent(new CustomEvent('equipment-updated'));
          } else {
            const errorData = await saveResponse.json();
            setUploadStatus('warning');
            toast({ title: "⚠️ Save Failed", description: errorData.error || 'Could not save to database', variant: "destructive" });
          }
        } catch (saveError) {
          console.error('Error saving equipment:', saveError);
          setUploadStatus('warning');
          toast({ title: "⚠️ Analysis Complete, But Save Failed", description: "Equipment analyzed but couldn't be saved.", variant: "destructive" });
        } finally {
          setIsSavingToDB(false);
        }
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({ title: "Analysis Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      setUploadStatus('warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Upload Equipment Nameplate</h2>
            <p className="text-muted-foreground">Upload a photo or PDF of equipment nameplate for AI analysis</p>
          </div>

          {/* Location selectors */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Building *</label>
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select building" /></SelectTrigger>
                <SelectContent>
                  {buildings.map(b => (
                    <SelectItem key={b.buildingId} value={b.buildingId}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Floor (Optional)</label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select floor" /></SelectTrigger>
                <SelectContent>
                  {buildings.find(b => b.buildingId === selectedBuilding)?.floors &&
                    Array.from({ length: buildings.find(b => b.buildingId === selectedBuilding)?.floors || 0 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>Floor {i + 1}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Zone (Optional)</label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  {buildings.find(b => b.buildingId === selectedBuilding)?.zones?.map((zone: string) => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Category & Asset Role ──────────────────────────────────────── */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Equipment Category *</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                e.g. Production = conveyors, freezers, process equipment
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Asset Role *</label>
              <Select value={selectedAssetRole} onValueChange={setSelectedAssetRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <p className="font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Active = primary function · Supportive = enables active equipment
              </p>
            </div>
          </div>
          {/* ─────────────────────────────────────────────────────────────── */}

          {/* Upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isProcessing || isSavingToDB ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {isSavingToDB ? 'Saving equipment to database...' : `Analyzing ${lastFileName}...`}
                </p>
              </div>
            ) : uploadStatus === 'success' ? (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-sm font-medium">Equipment saved successfully!</p>
              </div>
            ) : uploadStatus === 'warning' ? (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-yellow-500" />
                <p className="text-sm font-medium">Analysis complete, but save failed</p>
                <p className="text-xs text-muted-foreground">Check console for details</p>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, WEBP, PDF up to 10MB</p>
                <p className="text-xs text-muted-foreground/70 mt-2">(HEIC not supported — please convert to JPG)</p>
              </label>
            )}
          </div>

          {uploadStatus !== 'idle' && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => { setUploadStatus('idle'); fileInputRef.current?.click(); }}>
                Upload Another
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default UploadSection;
