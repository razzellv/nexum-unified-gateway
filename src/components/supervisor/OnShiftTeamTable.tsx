import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Activity } from 'lucide-react';

interface OnShiftTeamMember {
  employee: string;
  operatorId: string;
  role: string;
  systems_logged_24h: number;
  total_logs: number;
  specialty: string;
  last_activity: string;
}

interface OnShiftTeamTableProps {
  team: OnShiftTeamMember[];
}

export const OnShiftTeamTable = ({ team }: OnShiftTeamTableProps) => {
  if (!team || team.length === 0) {
    return (
      <Card className="bg-card/80 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-neon-cyan" />
            On-Shift Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No operator activity in the last 24 hours
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActivityLevel = (logsCount: number) => {
    if (logsCount >= 10) return 'high';
    if (logsCount >= 5) return 'medium';
    return 'low';
  };

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-400 bg-green-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-orange-400 bg-orange-400/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <Card className="bg-card/80 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-neon-cyan" />
          On-Shift Team Activity ({team.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 px-3 font-medium">Employee</th>
                <th className="text-left py-2 px-3 font-medium">Role</th>
                <th className="text-center py-2 px-3 font-medium">Systems Logged (24h)</th>
                <th className="text-left py-2 px-3 font-medium">Specialty</th>
                <th className="text-center py-2 px-3 font-medium">Activity</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member, idx) => {
                const activityLevel = getActivityLevel(member.total_logs);
                const minutesAgo = member.last_activity 
                  ? Math.round((Date.now() - new Date(member.last_activity).getTime()) / 60000)
                  : null;
                const lastActivity = minutesAgo !== null
                  ? minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.round(minutesAgo / 60)}h ago`
                  : 'N/A';

                return (
                  <tr 
                    key={member.operatorId || idx} 
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          minutesAgo && minutesAgo < 60 ? 'bg-green-400' : 'bg-muted-foreground/50'
                        }`} />
                        <span className="font-medium">{typeof employee.employeeName === 'string' ? employee.employeeName : (employee.employeeName?.name || employee.employeeId)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-sm font-medium text-neon-cyan">
                        {member.systems_logged_24h}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({member.total_logs} logs)
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="secondary" className="text-xs">
                        {member.specialty}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge className={`text-xs ${getActivityColor(activityLevel)}`}>
                        <Activity className="w-3 h-3 mr-1" />
                        {lastActivity}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
