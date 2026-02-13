import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { workloadData } from '@/data/mockData';

export function WorkloadChart() {
  const getCapacityColor = (capacity: number) => {
    if (capacity >= 80) return 'hsl(0, 72%, 51%)';
    if (capacity >= 60) return 'hsl(38, 92%, 50%)';
    return 'hsl(142, 71%, 45%)';
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="text-lg font-semibold mb-4">Staff Workload</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={workloadData} layout="vertical" margin={{ left: 80, right: 20 }}>
            <XAxis 
              type="number" 
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(222, 47%, 16%)' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: 'hsl(210, 40%, 96%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(222, 47%, 16%)' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 10%)',
                border: '1px solid hsl(222, 47%, 16%)',
                borderRadius: '8px',
                color: 'hsl(210, 40%, 96%)'
              }}
              formatter={(value: number) => [`${value}%`, 'Capacity']}
            />
            <Bar dataKey="capacity" radius={[0, 4, 4, 0]}>
              {workloadData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getCapacityColor(entry.capacity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">&lt; 60%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning" />
          <span className="text-xs text-muted-foreground">60-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-critical" />
          <span className="text-xs text-muted-foreground">&gt; 80%</span>
        </div>
      </div>
    </div>
  );
}
