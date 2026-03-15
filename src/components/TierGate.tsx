import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, ArrowRight } from 'lucide-react';

interface TierGateProps {
  featureName: string;
  requiredTier: 'PREMIUM' | 'BUSINESS';
  currentTier?: string;
  description?: string;
}

export function TierGate({ featureName, requiredTier, currentTier, description }: TierGateProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-2 border-purple-400/30 bg-purple-400/5">
        <CardContent className="p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-purple-400/10 border-2 border-purple-400/30 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-400/30 mb-3">
              {requiredTier} Feature
            </Badge>
            <h2 className="text-2xl font-bold">{featureName}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {description || `${featureName} is available on the ${requiredTier} plan and above.`}
            </p>
          </div>
          {currentTier && (
            <div className="bg-background/50 border border-border rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Your current plan</p>
              <p className="font-bold text-lg">{currentTier}</p>
            </div>
          )}
          <div className="space-y-2">
            <Button className="w-full bg-purple-500 hover:bg-purple-600" onClick={() => navigate('/pricing')}>
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to {requiredTier}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
