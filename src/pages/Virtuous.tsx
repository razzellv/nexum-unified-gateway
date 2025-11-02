import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Target, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Virtuous = () => {
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
          <h1 className="text-3xl font-bold text-glow-primary">Virtuous Risk Analyzer</h1>
          <p className="text-muted-foreground mt-1">Risk assessment and mitigation strategies</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Risk Score</CardTitle>
              <CardDescription>Current assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">92%</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Target className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Mitigations</CardTitle>
              <CardDescription>Active strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">18</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Assessments</CardTitle>
              <CardDescription>Completed analyses</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">67</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Protected</CardTitle>
              <CardDescription>Areas secured</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">156</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border bg-card">
          <CardHeader>
            <CardTitle>AI-Powered Risk Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Advanced machine learning models identify potential risks, evaluate impact scenarios,
              and recommend mitigation strategies. Real-time monitoring and predictive analytics included.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Virtuous;
