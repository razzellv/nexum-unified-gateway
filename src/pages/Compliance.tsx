import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileCheck, Shield, AlertCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

const Compliance = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link to="/">
            <Button variant="ghost" className="mb-4 hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-glow-secondary">Compliance Analyzer</h1>
          <p className="text-muted-foreground mt-1">Automated compliance checking and reporting</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Compliance Score</CardTitle>
              <CardDescription>Overall system rating</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">98%</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <FileCheck className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Checks Passed</CardTitle>
              <CardDescription>Automated validations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">142</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-secondary/50 transition-all">
            <CardHeader>
              <AlertCircle className="w-8 h-8 text-secondary mb-2" />
              <CardTitle>Action Items</CardTitle>
              <CardDescription>Requires review</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">3</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border bg-card">
          <CardHeader>
            <CardTitle>Compliance Bot v2.0 - Under Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              AI-powered compliance monitoring system is currently being upgraded. Features include
              real-time policy validation, automated report generation, and regulatory change tracking.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Compliance;
