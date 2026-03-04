import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Settings, Save, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';

interface UtilityRates {
  electric: number;
  gas: number;
  water: number;
  demand_charge?: number;
  gas_ccf?: number;
  water_sewer_multiplier?: number;
  updated_at?: string;
  updated_by?: string;
}

export function BaselineRatesManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<UtilityRates>({
    electric: 0.125,
    gas: 0.40,
    water: 0.0167,
    demand_charge: 15.00,
    gas_ccf: 1.00,
    water_sewer_multiplier: 1.5,
  });

  // Only allow Admin, Executive, and Manager (if approved)
  const canManageRates = ['admin', 'executive'].includes(user?.role || '') || 
    (user?.role === 'manager' && user?.approved_for_rates === true);

  useEffect(() => {
    if (open && canManageRates) {
      loadRates();
    }
  }, [open, canManageRates]);

  const loadRates = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/utility-rates');
      if (data && data.rates) {
        setRates(data.rates);
      }
    } catch (error) {
      console.error('Failed to load utility rates:', error);
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  };

  const saveRates = async () => {
    setSaving(true);
    try {
      await apiRequest('/utility-rates', {
        method: 'POST',
        body: JSON.stringify({
          rates: {
            ...rates,
            updated_at: new Date().toISOString(),
            updated_by: user?.sub || user?.email || 'unknown',
          }
        }),
      });

      toast({
        title: 'Success',
        description: 'Utility rates updated successfully. Changes will reflect in all dashboards.',
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Failed to save utility rates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save utility rates',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManageRates) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Baseline Rates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Baseline Utility Rates Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Message */}
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/50">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Important</p>
                <p className="text-xs text-muted-foreground">
                  Changes to these rates will affect cost calculations across all dashboards.
                  Energy Dashboard, Manager Dashboard, and Executive Dashboard will use these values.
                </p>
              </div>
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading rates...</div>
          ) : (
            <>
              {/* Electric Rates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Electric Rates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="electric">Energy Charge ($/kWh)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="electric"
                        type="number"
                        step="0.001"
                        value={rates.electric}
                        onChange={(e) => setRates({ ...rates, electric: parseFloat(e.target.value) || 0 })}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Typical range: $0.08 - $0.25 per kWh
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demand">Demand Charge ($/kW)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="demand"
                        type="number"
                        step="0.01"
                        value={rates.demand_charge}
                        onChange={(e) => setRates({ ...rates, demand_charge: parseFloat(e.target.value) || 0 })}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Typical range: $10 - $25 per kW
                    </p>
                  </div>
                </div>
              </div>

              {/* Natural Gas Rates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Natural Gas Rates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gas">Gas Rate ($/Therm)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="gas"
                        type="number"
                        step="0.01"
                        value={rates.gas}
                        onChange={(e) => setRates({ ...rates, gas: parseFloat(e.target.value) || 0 })}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Typical range: $0.30 - $1.50 per Therm
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gas_ccf">Gas Rate ($/CCF)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="gas_ccf"
                        type="number"
                        step="0.01"
                        value={rates.gas_ccf}
                        onChange={(e) => setRates({ ...rates, gas_ccf: parseFloat(e.target.value) || 0 })}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      100 CCF ≈ 1 Therm
                    </p>
                  </div>
                </div>
              </div>

              {/* Water/Sewer Rates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Water & Sewer Rates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="water">Water Rate ($/gallon)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="water"
                        type="number"
                        step="0.0001"
                        value={rates.water}
                        onChange={(e) => setRates({ ...rates, water: parseFloat(e.target.value) || 0 })}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Typical range: $0.01 - $0.03 per gallon
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sewer">Sewer Multiplier</Label>
                    <Input
                      id="sewer"
                      type="number"
                      step="0.1"
                      value={rates.water_sewer_multiplier}
                      onChange={(e) => setRates({ ...rates, water_sewer_multiplier: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sewer cost = Water cost × multiplier
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Updated Info */}
              {rates.updated_at && (
                <div className="text-xs text-muted-foreground border-t pt-4">
                  Last updated: {new Date(rates.updated_at).toLocaleString()}
                  {rates.updated_by && ` by ${rates.updated_by}`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={saveRates} disabled={loading || saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Rates
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
