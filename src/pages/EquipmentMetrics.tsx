import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ParticleBackground } from "@/components/ParticleBackground";
import { NexumBranding } from "@/components/NexumBranding";
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NexumLoader, NexumPageLoader } from '@/components/global/NexumLoader';
import { NexumError } from '@/components/global/NexumError';
import { ExportButtons } from '@/components/global/ExportButtons';
import { getFacilityLogs, type FacilityLog } from '@/lib/nexum-api';
import { 
  Activity,
  RefreshCw,
  Flame,
  Snowflake,
  Wind,
  Droplets,
  Waves,
  Filter,
  Calendar,
  User,
  FileText,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EQUIPMENT_TYPES = [
  { value: 'all', label: 'All Equipment', icon: Activity },
  { value: 'boilers', label: 'Boilers', icon: Flame },
  { value: 'chillers', label: 'Chillers', icon: Snowflake },
  { value: 'ahu', label: 'Air Handlers', icon: Wind },
  { value: 'pumps', label: 'Pumps', icon: Droplets },
  { value: 'cooling_towers', label: 'Cooling Towers', icon: Waves },
];

const TIME_RANGES = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export default function EquipmentMetrics() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<FacilityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<FacilityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [equipmentType, setEquipmentType] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate date range
      const now = new Date();
      let start = new Date();
      
      switch (timeRange) {
        case '24h':
          start.setHours(now.getHours() - 24);
          break;
        case '7d':
          start.setDate(now.getDate() - 7);
          break;
        case '30d':
          start.setDate(now.getDate() - 30);
          break;
        case 'custom':
          if (startDate) start = new Date(startDate);
          break;
      }

      const options: any = {
        startDate: start.toISOString(),
        endDate: timeRange === 'custom' && endDate ? new Date(endDate).toISOString() : now.toISOString(),
      };

      if (equipmentType !== 'all') {
        options.equipmentType = equipmentType;
      }

      const response = await getFacilityLogs(options);
      setLogs(response.logs || []);
      setFilteredLogs(response.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Unable to load equipment logs. Using mock data.');
      
      // Mock data fallback
      const mockLogs: FacilityLog[] = Array.from({ length: 50 }, (_, i) => ({
        PK: `FACILITY#facility-001`,
        SK: `LOGS#${new Date(Date.now() - i * 3600000).toISOString()}#${i}`,
        equipmentId: `EQUIP-${String(i % 10).padStart(3, '0')}`,
        equipmentType: ['boilers', 'chillers', 'ahu', 'pumps', 'cooling_towers'][i % 5],
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        operator: ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown'][i % 4],
        operatorId: `EMP-${String(i % 4).padStart(3, '0')}`,
        data: {
          temperature: 180 + Math.random() * 20,
          pressure: 100 + Math.random() * 50,
          efficiency: 85 + Math.random() * 10,
        },
        notes: i % 5 === 0 ? 'Routine check - all systems normal' : undefined,
      }));
      
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, equipmentType, startDate, endDate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLogs();
    }
  }, [isAuthenticated, fetchLogs]);

  // Apply search filter
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.equipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operatorId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm, logs]);

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  if (authLoading) {
    return <NexumPageLoader message="Authenticating..." />;
  }

  const getEquipmentIcon = (type: string) => {
    const equipment = EQUIPMENT_TYPES.find(e => e.value === type);
    return equipment?.icon || Activity;
  };

  const getEquipmentColor = (type: string) => {
    const colors: Record<string, string> = {
      boilers: 'text-orange-500',
      chillers: 'text-blue-500',
      ahu: 'text-cyan-500',
      pumps: 'text-green-500',
      cooling_towers: 'text-purple-500',
    };
    return colors[type] || 'text-gray-500';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  return (
    <MainLayout>
      <ParticleBackground />
      
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-neon-cyan" />
              Equipment Logs & Metrics
            </h1>
            <p className="text-muted-foreground mt-1">Real-time facility equipment logging history</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="border-primary/30 hover:border-primary"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <ExportButtons
              title="Equipment Logs"
              data={filteredLogs.map(log => ({
                timestamp: log.timestamp,
                equipment: log.equipmentId,
                type: log.equipmentType,
                operator: log.operator,
                ...log.data,
              }))}
            />
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5 text-primary" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Equipment Type Filter */}
              <div className="space-y-2">
                <Label>Equipment Type</Label>
                <Select value={equipmentType} onValueChange={setEquipmentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range Filter */}
              <div className="space-y-2">
                <Label>Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_RANGES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {timeRange === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Equipment, operator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="neon-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Logs</p>
                  <p className="text-2xl font-bold text-neon-cyan">{filteredLogs.length}</p>
                </div>
                <FileText className="w-8 h-8 text-neon-cyan opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Equipment Types</p>
                  <p className="text-2xl font-bold text-primary">
                    {new Set(filteredLogs.map(l => l.equipmentType)).size}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Operators</p>
                  <p className="text-2xl font-bold text-green-500">
                    {new Set(filteredLogs.map(l => l.operatorId)).size}
                  </p>
                </div>
                <User className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="neon-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Time Period</p>
                  <p className="text-sm font-bold text-yellow-500">
                    {TIME_RANGES.find(r => r.value === timeRange)?.label}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {error && <NexumError message={error} />}

        {/* Neon Glowing Logs Table */}
        <Card className="bg-card/80 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Equipment Logs
              <Badge variant="outline" className="ml-auto">
                {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <NexumLoader message="Loading equipment logs..." />
              </div>
            ) : currentLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found for the selected filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Equipment</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Type</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Date</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Time</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Operator</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Metrics</th>
                        <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentLogs.map((log, index) => {
                        const Icon = getEquipmentIcon(log.equipmentType);
                        const colorClass = getEquipmentColor(log.equipmentType);
                        const { date, time } = formatTimestamp(log.timestamp);

                        return (
                          <tr
                            key={`${log.SK}-${index}`}
                            className="border-b border-border/30 hover:bg-accent/50 transition-colors neon-glow-row"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Icon className={cn('w-4 h-4', colorClass)} />
                                <span className="font-mono text-sm">{log.equipmentId}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {log.equipmentType}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{date}</td>
                            <td className="p-3 text-sm font-mono">{time}</td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="text-sm">{log.operator}</span>
                                <span className="text-xs text-muted-foreground font-mono">{log.operatorId}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(log.data).slice(0, 3).map(([key, value]) => (
                                  <Badge key={key} variant="secondary" className="text-xs">
                                    {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              {log.notes && (
                                <span className="text-xs text-muted-foreground italic">{log.notes}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
