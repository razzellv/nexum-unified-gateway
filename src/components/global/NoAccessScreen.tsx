import { AlertCircle, ShieldOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RoleSelector } from './RoleSelector';

export function NoAccessScreen() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md border-destructive/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Access Restricted</h2>
            <p className="text-muted-foreground text-sm">
              Operators do not have access to the Facility Intelligence platform. 
              This application is for Supervisors, Managers, and Executives only.
            </p>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Switch role to continue:</p>
              <div className="flex justify-center">
                <RoleSelector />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
