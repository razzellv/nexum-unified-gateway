import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Plus, AlertTriangle, CheckCircle2, Clock, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeEmployee {
  id: string;
  name: string;
  title: string;
  department: string;
  retirementDate: string;
  knowledgeAreas: string;
  operationalDependency: 'High' | 'Medium' | 'Low';
  documentationStatus: 'None' | 'Partial' | 'Complete';
}

const EMPTY_EMP: Omit<KnowledgeEmployee, 'id'> = {
  name: '', title: '', department: '', retirementDate: '',
  knowledgeAreas: '', operationalDependency: 'Medium', documentationStatus: 'None',
};

function monthsUntilRetirement(dateStr: string): number {
  if (!dateStr) return 999;
  const ret = new Date(dateStr);
  const now = new Date();
  return (ret.getFullYear() - now.getFullYear()) * 12 + (ret.getMonth() - now.getMonth());
}

function getEmployeeRisk(emp: KnowledgeEmployee): 'Critical' | 'High' | 'Moderate' | 'Low' {
  const months = monthsUntilRetirement(emp.retirementDate);
  if (months <= 12 && emp.operationalDependency === 'High' && emp.documentationStatus === 'None') return 'Critical';
  if (months <= 12 || (emp.operationalDependency === 'High' && emp.documentationStatus !== 'Complete')) return 'High';
  if (months <= 18 || emp.documentationStatus === 'None') return 'Moderate';
  return 'Low';
}

function riskBadge(risk: string) {
  if (risk === 'Critical') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (risk === 'High') return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  if (risk === 'Moderate') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
}

function overallRisk(employees: KnowledgeEmployee[]): string {
  if (employees.some(e => getEmployeeRisk(e) === 'Critical')) return 'Critical';
  if (employees.some(e => getEmployeeRisk(e) === 'High')) return 'High';
  if (employees.some(e => getEmployeeRisk(e) === 'Moderate')) return 'Moderate';
  if (employees.length === 0) return 'Unknown';
  return 'Low';
}

function generateInsights(employees: KnowledgeEmployee[]): string[] {
  if (employees.length === 0) return ['Add critical employees to generate knowledge risk insights.'];
  const insights: string[] = [];
  const retiring12 = employees.filter(e => monthsUntilRetirement(e.retirementDate) <= 12);
  const retiring18 = employees.filter(e => monthsUntilRetirement(e.retirementDate) <= 18);
  const highNoDoc = employees.filter(e => e.operationalDependency === 'High' && e.documentationStatus === 'None');
  const uniqueAreas = [...new Set(employees.flatMap(e => e.knowledgeAreas.split(',').map(a => a.trim()).filter(Boolean)))];

  if (retiring12.length > 0) insights.push(`${retiring12.length} employee(s) retiring within 12 months — immediate knowledge capture required.`);
  if (highNoDoc.length > 0) insights.push(`${highNoDoc.length} high-dependency role(s) have zero documentation — operational continuity at risk.`);
  if (retiring18.length > retiring12.length) insights.push(`${retiring18.length - retiring12.length} additional employee(s) retiring within 18 months — begin succession planning now.`);
  if (uniqueAreas.length > 3) insights.push(`${uniqueAreas.length} unique critical knowledge areas identified — prioritize cross-training programs.`);
  insights.push('Consider shadowing programs and video documentation for all High-dependency roles.');
  return insights.slice(0, 5);
}

export default function GovKnowledgePreservation() {
  const [employees, setEmployees] = useState<KnowledgeEmployee[]>([]);
  const [form, setForm] = useState({ ...EMPTY_EMP });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    const raw = localStorage.getItem('nexum_gov_knowledge_employees');
    if (raw) { try { setEmployees(JSON.parse(raw)); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save(list: KnowledgeEmployee[]) {
    localStorage.setItem('nexum_gov_knowledge_employees', JSON.stringify(list));
    setEmployees(list);
  }

  function addEmployee() {
    if (!form.name.trim()) return;
    const newEmp: KnowledgeEmployee = { ...form, id: Date.now().toString() };
    save([...employees, newEmp]);
    setForm({ ...EMPTY_EMP });
    setShowForm(false);
  }

  function removeEmployee(id: string) {
    save(employees.filter(e => e.id !== id));
  }

  const retiring18 = employees.filter(e => monthsUntilRetirement(e.retirementDate) <= 18);
  const highNoDoc = employees.filter(e => e.operationalDependency === 'High' && e.documentationStatus === 'None');
  const uniqueAreas = [...new Set(employees.flatMap(e => e.knowledgeAreas.split(',').map(a => a.trim()).filter(Boolean)))];
  const orgRisk = overallRisk(employees);
  const insights = generateInsights(employees);

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Knowledge Preservation™</h1>
              <p className="text-muted-foreground text-sm">Track critical organizational knowledge at retirement risk</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm px-3 py-1 border', riskBadge(orgRisk))}>
              Knowledge Risk: {orgRisk}
            </Badge>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-amber-500/30 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-400">{retiring18.length}</div>
              <div className="text-xs text-muted-foreground">Retiring ≤18 mo</div>
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-400">{highNoDoc.length}</div>
              <div className="text-xs text-muted-foreground">High Dep, No Docs</div>
            </CardContent>
          </Card>
          <Card className="border-violet-500/30 bg-violet-500/10">
            <CardContent className="p-4 text-center">
              <Brain className="w-5 h-5 text-violet-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-violet-400">{uniqueAreas.length}</div>
              <div className="text-xs text-muted-foreground">Knowledge Areas</div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-foreground">{employees.length}</div>
              <div className="text-xs text-muted-foreground">Total Tracked</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card className="border-primary/30 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Add Critical Employee</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Job title" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Department</label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Department" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Retirement Date</label>
                <Input type="date" value={form.retirementDate} onChange={e => setForm(p => ({ ...p, retirementDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Knowledge Areas (comma-separated)</label>
                <Input value={form.knowledgeAreas} onChange={e => setForm(p => ({ ...p, knowledgeAreas: e.target.value }))} placeholder="e.g. SCADA, Pump Stations" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Operational Dependency</label>
                <Select value={form.operationalDependency} onValueChange={v => setForm(p => ({ ...p, operationalDependency: v as 'High' | 'Medium' | 'Low' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Documentation Status</label>
                <Select value={form.documentationStatus} onValueChange={v => setForm(p => ({ ...p, documentationStatus: v as 'None' | 'Partial' | 'Complete' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
                <Button onClick={addEmployee} className="flex-1">Add Employee</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Table */}
        {employees.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">Employee Risk Table</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Name', 'Title', 'Dept', 'Retirement', 'Knowledge Areas', 'Dependency', 'Docs', 'Risk', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const risk = getEmployeeRisk(emp);
                      const months = monthsUntilRetirement(emp.retirementDate);
                      return (
                        <tr key={emp.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium text-foreground">{emp.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{emp.title}</td>
                          <td className="px-3 py-2 text-muted-foreground">{emp.department}</td>
                          <td className="px-3 py-2">
                            <span className={cn(months <= 12 ? 'text-red-400' : months <= 18 ? 'text-amber-400' : 'text-muted-foreground')}>
                              {emp.retirementDate ? `${months}mo` : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-32 truncate">{emp.knowledgeAreas || '—'}</td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn('text-xs',
                              emp.operationalDependency === 'High' ? 'text-red-400 border-red-500/30' :
                              emp.operationalDependency === 'Medium' ? 'text-amber-400 border-amber-500/30' :
                              'text-emerald-400 border-emerald-500/30'
                            )}>{emp.operationalDependency}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn('text-xs',
                              emp.documentationStatus === 'None' ? 'text-red-400 border-red-500/30' :
                              emp.documentationStatus === 'Partial' ? 'text-amber-400 border-amber-500/30' :
                              'text-emerald-400 border-emerald-500/30'
                            )}>{emp.documentationStatus}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant="outline" className={cn('text-xs border', riskBadge(risk))}>{risk}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeEmployee(emp.id)} className="text-muted-foreground hover:text-destructive text-xs">Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-violet-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> AI Knowledge Risk Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground">
                  <span className="text-violet-400 font-bold shrink-0">•</span> {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
