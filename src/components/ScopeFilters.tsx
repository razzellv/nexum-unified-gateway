import { useRole } from '@/contexts/RoleContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getAvailableFacilities, getAvailableBuildings, getAvailableSystems, SYSTEM_LABELS } from '@/lib/role-filters';
import { Building2, Layers, Wrench, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScopeFiltersProps {
  selectedFacility: string;
  selectedBuilding: string;
  selectedSystem: string;
  onFacilityChange: (facility: string) => void;
  onBuildingChange: (building: string) => void;
  onSystemChange: (system: string) => void;
  showFacility?: boolean;
  showBuilding?: boolean;
  showSystem?: boolean;
}

export function ScopeFilters({
  selectedFacility,
  selectedBuilding,
  selectedSystem,
  onFacilityChange,
  onBuildingChange,
  onSystemChange,
  showFacility = true,
  showBuilding = true,
  showSystem = true,
}: ScopeFiltersProps) {
  const { currentRole, roleScope, canAccessApp } = useRole();

  const facilities = getAvailableFacilities(currentRole);
  const buildings = getAvailableBuildings(currentRole, selectedFacility);
  const systems = getAvailableSystems(currentRole);

  if (!canAccessApp) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Operators do not have access to the analytics platform. Please contact your supervisor for access.
        </AlertDescription>
      </Alert>
    );
  }

  const isLimitedScope = roleScope.facilityScope === 'assigned';

  return (
    <div className="space-y-4">
      {isLimitedScope && (
        <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          Viewing scope limited to assigned resources ({roleScope.assignedFacilities.length} facilities, {roleScope.assignedBuildings.length} buildings)
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {showFacility && facilities.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Facility
            </Label>
            <Select value={selectedFacility} onValueChange={onFacilityChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {facilities.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showBuilding && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Building
            </Label>
            <Select value={selectedBuilding} onValueChange={onBuildingChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showSystem && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              System Type
            </Label>
            <Select value={selectedSystem} onValueChange={onSystemChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                {systems.map((s) => (
                  <SelectItem key={s} value={s}>{SYSTEM_LABELS[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
