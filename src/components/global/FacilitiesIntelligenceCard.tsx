import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, AlertTriangle, CheckCircle, Users, Package, Grid3X3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getFacilitiesIntelligence } from '@/lib/facilitiesIntelligence';
import { useNavigate } from 'react-router-dom';

export function FacilitiesIntelligenceCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';
  const fi = useMemo(() => getFacilitiesIntelligence(facilityId), [facilityId]);

  const riskColor = fi.riskScore >= 60 ? 'text-red-400' : fi.riskScore >= 30 ? 'text-amber-400' : 'text-green-400';
  const riskBg = fi.riskScore >= 60 ? 'border-red-500/30 bg-red-500/5' : fi.riskScore >= 30 ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5';

  return (
    <Card className={`border ${riskBg}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-blue-400" />
            Facilities Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${fi.riskScore >= 60 ? 'bg-red-500/20 text-red-400 border-red-500/30' : fi.riskScore >= 30 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
              Risk: {fi.riskScore}/100
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/equipment-library')}>
              View →
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Three metric columns */}
        <div className="grid grid-cols-3 gap-3">
          {/* Ceiling tiles */}
          <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-2">
            <div className="flex items-center gap-1.5"><Grid3X3 className="w-3.5 h-3.5 text-blue-400" /><p className="text-xs font-semibold text-muted-foreground">Ceiling Tiles</p></div>
            <p className={`text-2xl font-bold ${fi.tileHealthPct >= 80 ? 'text-green-400' : fi.tileHealthPct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{fi.tileHealthPct}%</p>
            <p className="text-[10px] text-muted-foreground">{fi.tilesNeedingReplacement} need replacement</p>
            {fi.tileReplacementCost > 0 && <p className="text-[10px] text-red-400">${fi.tileReplacementCost.toLocaleString(undefined,{maximumFractionDigits:0})} est. cost</p>}
          </div>
          {/* Supplies */}
          <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-2">
            <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-orange-400" /><p className="text-xs font-semibold text-muted-foreground">Supplies</p></div>
            <p className="text-2xl font-bold">${fi.supplyOnHandValue.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
            <p className="text-[10px] text-muted-foreground">on hand</p>
            {fi.supplyAtRiskValue > 0 && <p className="text-[10px] text-amber-400">${fi.supplyAtRiskValue.toLocaleString(undefined,{maximumFractionDigits:0})} at risk</p>}
            <div className="flex gap-1.5 flex-wrap">
              {fi.supplyOutCount > 0 && <Badge className="text-[9px] bg-red-500/20 text-red-400 border-red-500/30">{fi.supplyOutCount} Out</Badge>}
              {fi.supplyLowCount > 0 && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">{fi.supplyLowCount} Low</Badge>}
            </div>
          </div>
          {/* Staffing */}
          <div className="p-3 rounded-lg border border-border/40 bg-card/50 space-y-2">
            <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-purple-400" /><p className="text-xs font-semibold text-muted-foreground">Staffing</p></div>
            <p className="text-2xl font-bold">{fi.coveragePct}%</p>
            <p className="text-[10px] text-muted-foreground">{fi.activeNow}/{fi.shiftsToday} on shift</p>
            {fi.coverageGaps.length > 0 && <p className="text-[10px] text-red-400">Gap: {fi.coverageGaps.join(', ')}</p>}
            {fi.ukgConnected && <Badge className="text-[9px] bg-teal-500/20 text-teal-400 border-teal-500/30">UKG Live</Badge>}
          </div>
        </div>

        {/* Risk factors */}
        {fi.riskFactors.length > 0 && (
          <div className="space-y-1.5">
            {fi.riskFactors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                <span className="text-muted-foreground">{f}</span>
              </div>
            ))}
          </div>
        )}
        {fi.riskFactors.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>All facilities metrics within acceptable range.</span>
          </div>
        )}

        {/* Footer links */}
        <div className="flex gap-3 pt-1 border-t border-border/30">
          <button onClick={() => navigate('/equipment-library')} className="text-xs text-primary hover:underline">Equipment Library</button>
          <button onClick={() => navigate('/staff-scheduling')} className="text-xs text-primary hover:underline">Staff Schedule</button>
          <button onClick={() => navigate('/inventory')} className="text-xs text-primary hover:underline">Inventory</button>
        </div>
      </CardContent>
    </Card>
  );
}
