import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat } from 'lucide-react';

const ContractorInstalls = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <HardHat className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Contractor Installs</h1>
            <p className="text-muted-foreground mt-1">Track and manage contractor installation projects</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Installation Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Contractor install tracking — integration in progress.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ContractorInstalls;
