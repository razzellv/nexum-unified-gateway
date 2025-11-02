import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Cpu, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Equipment = () => {
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
          <h1 className="text-3xl font-bold text-glow-primary">Equipment Intelligence</h1>
          <p className="text-muted-foreground mt-1">Asset tracking and predictive maintenance</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <Cpu className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Total Assets</CardTitle>
              <CardDescription>Tracked equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">247</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-primary/50 transition-all">
            <CardHeader>
              <CheckCircle className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Operational</CardTitle>
              <CardDescription>Running smoothly</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">231</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-secondary/50 transition-all">
            <CardHeader>
              <Activity className="w-8 h-8 text-secondary mb-2" />
              <CardTitle>Maintenance</CardTitle>
              <CardDescription>Scheduled service</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">12</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card hover:border-destructive/50 transition-all">
            <CardHeader>
              <AlertTriangle className="w-8 h-8 text-destructive mb-2" />
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Requires attention</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-destructive">4</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 border-border bg-card">
          <CardHeader>
            <CardTitle>Predictive Maintenance AI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Advanced analytics and ML-powered predictions for equipment health, failure forecasting,
              and optimal maintenance scheduling coming soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Equipment;
