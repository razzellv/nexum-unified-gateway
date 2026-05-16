import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

interface CompletionCertificateProps {
  userName?: string;
  completionDate: string;
}

export const CompletionCertificate = ({ 
  userName = "Facility Engineer", 
  completionDate 
}: CompletionCertificateProps) => {
  const handleDownload = () => {
    toast.success("Certificate download coming soon!");
  };

  const handleShare = () => {
    toast.success("Sharing options coming soon!");
  };

  return (
    <div className="min-h-screen bg-background py-12 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="shadow-strong border-2 border-secondary/30">
          <CardContent className="p-12">
            <div className="text-center space-y-8">
              {/* Logo/Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 gradient-secondary rounded-full flex items-center justify-center shadow-glow">
                  <Award className="w-12 h-12 text-secondary-foreground" />
                </div>
              </div>

              {/* Certificate text */}
              <div className="space-y-4">
                <h1 className="text-4xl font-bold">Certificate of Completion</h1>
                <p className="text-xl text-muted-foreground">
                  This certifies that
                </p>
                <p className="text-3xl font-bold text-secondary">{userName}</p>
                <p className="text-lg text-muted-foreground">
                  has successfully completed the
                </p>
                <h2 className="text-2xl font-bold">
                  Nexum Suum Compliance & Optimization Training Series
                </h2>
              </div>

              {/* Completion statement */}
              <div className="bg-gradient-to-r from-secondary/10 via-accent/10 to-secondary/10 border border-secondary/30 rounded-lg p-8 my-8">
                <p className="text-base leading-relaxed italic">
                  "You have completed the Nexum Suum Compliance & Optimization Training Module — 
                  equipping you to manage facility systems with intelligence, integrity, and impact."
                </p>
              </div>

              {/* Details */}
              <div className="flex justify-center gap-12 text-sm text-muted-foreground">
                <div>
                  <p className="font-semibold mb-1">Completion Date</p>
                  <p>{completionDate}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Total Hours</p>
                  <p>~10 hours</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Modules Completed</p>
                  <p>10 of 10</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button 
                  variant="secondary" 
                  size="lg"
                  onClick={handleDownload}
                  className="shadow-medium"
                >
                  <Download className="mr-2" />
                  Download Certificate
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2" />
                  Share Achievement
                </Button>
              </div>

              {/* Signature area */}
              <div className="pt-12 border-t mt-12">
                <div className="flex justify-between items-end max-w-2xl mx-auto">
                  <div className="text-left">
                    <div className="border-t-2 border-foreground pt-2 mb-2 w-48">
                      <p className="font-bold">Nexum Suum</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Training Provider</p>
                  </div>
                  <div className="text-right">
                    <div className="border-t-2 border-foreground pt-2 mb-2 w-48">
                      <p className="font-bold">{completionDate}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Date Completed</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
