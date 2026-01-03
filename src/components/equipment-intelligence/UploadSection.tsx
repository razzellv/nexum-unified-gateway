import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEquipment } from "@/contexts/EquipmentContext";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";

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
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    
    if (!isImage && !isPDF) {
      toast({
        title: "Unsupported File Type",
        description: "Please upload an image (JPEG, PNG, WEBP) or PDF.",
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
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Full = await base64Promise;
      const base64 = base64Full.split(',')[1];

      // TEMPORARY: Mock AI analysis until API Gateway route is added
      // TODO: Replace with actual instructor-chat Lambda call once API Gateway is configured
      
      console.log('Image uploaded:', file.name, 'Size:', file.size, 'bytes');
      
      // Simulate AI analysis (remove this when Lambda is connected)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAnalysis = `## Equipment Analysis

**Equipment Type:** ${file.name.includes('boiler') ? 'Boiler' : file.name.includes('chiller') ? 'Chiller' : 'HVAC Equipment'}

**Detected Information:**
- Manufacturer: [Analysis in progress]
- Model: [Analysis in progress]
- Serial Number: [Analysis in progress]
- Capacity: [Analysis in progress]

**Note:** This is a placeholder response. Full AI analysis will be available once the instructor-chat endpoint is configured in API Gateway.

**Next Steps:**
1. Add /instructor/chat route to API Gateway
2. Configure CORS for the route
3. Connect to instructor-chat Lambda

Upload detected successfully. File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

      // Set mock results
      setAnalysisResult({
        success: true,
        analysis: mockAnalysis,
        confidence: 75,
        warnings: ['Using placeholder analysis - API Gateway route needed'],
      });

      const specs: any = {
        Equipment_Type: 'Pending Analysis',
        Brand: 'Pending',
        Model: 'Pending',
        raw_analysis: mockAnalysis,
      };

      setSpecsResult({
        success: true,
        data: specs,
        confidence: 75,
      });

      setUploadStatus('success');
      
      toast({
        title: "✅ Upload Successful",
        description: "Using placeholder analysis. Configure API Gateway to enable AI analysis.",
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error",
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
              Upload a photo or PDF of equipment nameplate for AI analysis
            </p>
          </div>

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
                  Processing {lastFileName}...
                </p>
              </div>
            ) : uploadStatus === 'success' ? (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-sm font-medium">Upload complete!</p>
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WEBP, PDF up to 10MB
                </p>
              </label>
            )}
          </div>

          {uploadStatus !== 'idle' && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
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
