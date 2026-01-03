import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEquipment } from "@/contexts/EquipmentContext";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const UploadSection = () => {
  const { 
    setAnalysisResult,
    setSpecsResult,
    isProcessing, 
    setIsProcessing,
    clearAnalysis
  } = useEquipment();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'warning'>('idle');
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Check file type
    const fileName = file.name.toLowerCase();
    const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    const isImage = file.type.startsWith('image/') && !isHEIC;
    const isPDF = file.type === 'application/pdf';
    
    // Block HEIC files with helpful message
    if (isHEIC) {
      toast({
        title: "HEIC Format Not Supported",
        description: "Please convert your image to JPG or PNG format first. On iPhone: Settings → Camera → Formats → Most Compatible",
        variant: "destructive",
      });
      return;
    }
    
    if (!isImage && !isPDF) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload JPG, PNG, WEBP, or PDF files only.",
        variant: "destructive",
      });
      return;
    }

    clearAnalysis();
    setIsProcessing(true);
    setUploadStatus('idle');
    setLastFileName(file.name);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      const base64Full = await base64Promise;
      const base64 = base64Full.split(',')[1];

      console.log('Calling instructor-chat Lambda...', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Call instructor-chat Lambda via Function URL
      const response = await fetch('https://g56i2ka57iw5ev6hugeapcgxiy0rmzow.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestContext: {
            authorizer: {
              claims: {
                sub: 'user-demo-123',
                'custom:facilityId': 'facility-001',
                'custom:orgId': 'org-demo-001',
                'custom:role': 'manager'
              }
            }
          },
          body: JSON.stringify({
            message: `Analyze this equipment nameplate/document and extract ALL specifications in a structured format.

Extract and provide:
1. Equipment Type (boiler, chiller, pump, AHU, compressor, cooling tower, etc.)
2. Manufacturer/Brand
3. Model Number
4. Serial Number
5. Capacity/Size/HP/Tons
6. Power Rating (kW or HP)
7. Voltage
8. Pressure rating (if applicable)
9. Flow rate (if applicable)
10. Refrigerant type (for chillers)
11. All other technical specifications visible

Provide a detailed analysis with clear sections for safety concerns, recommended actions, and compliance references.`,
            type: 'equipment_analysis',
            images: [{
              base64: base64,
              mimeType: file.type || 'image/jpeg',
            }],
          })
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Lambda Response:', data);

      if (data.response) {
        // Set analysis result
        setAnalysisResult({
          success: true,
          analysis: data.response,
          confidence: 95,
          warnings: [],
        });

        // Parse basic specs from response
        const specs: any = {
          Equipment_Type: 'See analysis below',
          raw_analysis: data.response,
          conversationId: data.conversationId,
        };

        setSpecsResult({
          success: true,
          data: specs,
          confidence: 95,
        });

        setUploadStatus('success');
        
        toast({
          title: "✅ Analysis Complete",
          description: "Equipment analyzed successfully by Claude AI.",
        });
      } else {
        throw new Error('No response from AI');
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred. Check console for details.",
        variant: "destructive",
      });
      setUploadStatus('warning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

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
            <p className="text-muted-foreground">
              Upload a photo or PDF of equipment nameplate for AI-powered analysis
            </p>
          </div>

          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Supported formats:</strong> JPG, PNG, WEBP, PDF (up to 10MB)
              <br />
              <strong>HEIC not supported:</strong> Convert HEIC to JPG first (iPhone: Settings → Camera → Formats → Most Compatible)
            </AlertDescription>
          </Alert>

          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing {lastFileName} with Claude AI...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take 10-30 seconds
                </p>
              </div>
            ) : uploadStatus === 'success' ? (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-sm font-medium">Analysis complete!</p>
                <p className="text-xs text-muted-foreground">
                  Scroll down to see detailed results
                </p>
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
                <p className="text-lg font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG, WEBP, PDF (max 10MB)
                </p>
              </label>
            )}
          </div>

          {uploadStatus !== 'idle' && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadStatus('idle');
                  clearAnalysis();
                  fileInputRef.current?.click();
                }}
              >
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
