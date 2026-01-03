import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Camera } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EquipmentIntelligence() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeNameplate = async () => {
    if (!selectedFile || !preview) return;

    setAnalyzing(true);
    try {
      // Convert image to base64
      const base64 = preview.split(',')[1];

      // TODO: Call instructor-chat Lambda for AI analysis
      const response = await fetch('https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod/instructor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('cognito_token') || 'mock-token'}`,
        },
        body: JSON.stringify({
          message: 'Analyze this equipment nameplate and extract all specifications, manufacturer details, model numbers, serial numbers, ratings, and technical specifications.',
          type: 'equipment_analysis',
          images: [{
            base64: base64,
            mimeType: selectedFile.type,
          }],
        }),
      });

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('Failed to analyze nameplate');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">Equipment Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Upload equipment nameplates for AI-powered analysis
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Upload Nameplate
              </CardTitle>
              <CardDescription>
                Take a photo or upload an image of equipment nameplate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                {preview ? (
                  <div className="space-y-4">
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <Button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreview(null);
                        setAnalysis(null);
                      }}
                      variant="outline"
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, HEIC up to 10MB
                    </p>
                  </label>
                )}
              </div>

              {preview && (
                <Button 
                  onClick={analyzeNameplate} 
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Analyze Nameplate
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                AI-extracted specifications and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-sm">
                        {analysis.response}
                      </pre>
                    </AlertDescription>
                  </Alert>
                  
                  <Button className="w-full">
                    Register Equipment
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Upload and analyze a nameplate to see results here
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
