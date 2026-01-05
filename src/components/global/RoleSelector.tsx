import { useRole } from '@/contexts/RoleContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ROLE_DEFINITIONS, ViewRole } from '@/lib/role-filters';
import { Eye, EyeOff, Building2, Layers } from 'lucide-react';

export function RoleSelector() {
  const { currentRole, setCurrentRole, roleScope } = useRole();

  const getScopeIcon = () => {
    switch (roleScope.facilityScope) {
      case 'multi': return <Layers className="w-3 h-3" />;
      case 'single': return <Building2 className="w-3 h-3" />;
      case 'assigned': return <Eye className="w-3 h-3" />;
      default: return <EyeOff className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as ViewRole)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(ROLE_DEFINITIONS).map((def) => (
            <SelectItem key={def.role} value={def.role} disabled={!def.canAccessApp}>
              <div className="flex items-center gap-2">
                <span>{def.label}</span>
                {!def.canAccessApp && <EyeOff className="w-3 h-3 text-muted-foreground" />}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Badge variant="outline" className="text-xs flex items-center gap-1">
        {getScopeIcon()}
        {roleScope.facilityScope === 'multi' ? 'Multi-Facility' : 
         roleScope.facilityScope === 'single' ? 'Full Facility' :
         roleScope.facilityScope === 'assigned' ? 'Limited' : 'No Access'}
      </Badge>
    </div>
  );
}
