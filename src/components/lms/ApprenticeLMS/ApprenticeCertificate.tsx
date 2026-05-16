import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Award, Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ApprenticeCertificateProps {
  score: number;
  onStartOver: () => void;
}

export const ApprenticeCertificate = ({ score, onStartOver }: ApprenticeCertificateProps) => {
  const [name, setName] = useState("");
  const [showCertificate, setShowCertificate] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  
  const completionDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const certificateId = `NS-FIA-${Date.now().toString(36).toUpperCase()}`;

  const handleGenerateCertificate = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setShowCertificate(true);
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    
    try {
      toast.loading("Generating PDF...");
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FacilityIntelligence_Certificate_${name.replace(/\s+/g, '_')}.pdf`);
      
      toast.dismiss();
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };

  if (!showCertificate) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-strong">
          <CardHeader className="text-center">
            <div className="w-20 h-20 gradient-secondary rounded-full mx-auto flex items-center justify-center mb-4 shadow-glow">
              <Award className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-2xl">Congratulations!</CardTitle>
            <p className="text-muted-foreground">
              You passed with a score of {score.toFixed(0)}%
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Enter Your Name for the Certificate</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-center text-lg"
              />
            </div>
            
            <Button 
              onClick={handleGenerateCertificate}
              size="lg"
              className="w-full"
            >
              Generate Certificate
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={handleDownloadPDF} size="lg" className="shadow-medium">
            <Download className="w-4 h-4 mr-2" />
            Download PDF Certificate
          </Button>
          <Button onClick={onStartOver} variant="outline" size="lg">
            Return to Program
          </Button>
        </div>

        {/* Certificate Preview */}
        <div 
          ref={certificateRef}
          className="bg-white p-8 md:p-12 rounded-lg shadow-strong border-4 border-secondary/30 aspect-[1.414/1]"
          style={{ minHeight: '500px' }}
        >
          <div className="h-full flex flex-col justify-between text-center">
            {/* Header */}
            <div>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center">
                <Award className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm tracking-[0.3em] text-muted-foreground uppercase mb-2">
                Certificate of Completion
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
                Facility Intelligence Apprentice
              </h1>
              <p className="text-lg text-secondary font-medium">
                Certified
              </p>
            </div>

            {/* Recipient */}
            <div className="py-8">
              <p className="text-muted-foreground mb-2">This certifies that</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground border-b-2 border-secondary inline-block px-8 pb-2">
                {name}
              </p>
              <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
                has successfully completed the Facility Intelligence Apprentice Certification program, 
                demonstrating competency in facility data, systems thinking, and operational metrics.
              </p>
            </div>

            {/* Program Details */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-foreground mb-1">
                Foundations of Facility Data, Systems Thinking, and Operational Metrics
              </p>
              <p className="text-xs text-muted-foreground">
                3 Modules • 60-Question Certification Exam • Score: {score.toFixed(0)}%
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end border-t pt-6">
              <div className="text-left">
                <p className="font-bold text-foreground">Nexum Suum</p>
                <p className="text-xs text-muted-foreground">Facility Intelligence™</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Certificate ID</p>
                <p className="font-mono text-sm text-foreground">{certificateId}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-foreground">{completionDate}</p>
                <p className="text-xs text-muted-foreground">Date of Completion</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
