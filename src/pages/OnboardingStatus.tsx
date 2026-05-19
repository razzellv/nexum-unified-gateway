import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ParticleBackground } from '@/components/ParticleBackground';
import {
  CheckCircle2, Circle, ArrowRight, Wrench, ClipboardList,
  Users, ShieldCheck, AlertTriangle, Calendar, Mail,
  Rocket, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface Milestone {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
  auto?: boolean;
}

interface OnboardingRecord {
  facilityId: string;
  orgName: string;
  orgType: string;
  type: string;
  status: string;
  milestones: Milestone[];
  progress: number;
  notes?: string;
  assignedBy?: string;
  createdAt: string;
}

const MILESTONE_META: Record<string, { icon: any; route?: string; cta: string; description: string }> = {
  account_created:   { icon: Rocket,        cta: 'Done automatically',       description: 'Your account has been created and verified.'                         },
  org_configured:    { icon: Wrench,        cta: 'Done automatically',       description: 'Your organization type and facility info has been configured.'       },
  first_equipment:   { icon: Wrench,        route: '/equipment-intelligence', cta: 'Log Equipment →',     description: 'Log your first piece of equipment to start building your asset record.' },
  first_work_order:  { icon: ClipboardList, route: '/work-orders',           cta: 'Create Work Order →', description: 'Create a work order to see the full maintenance management flow.'       },
  team_invited:      { icon: Users,         route: '/settings',              cta: 'Invite Team →',       description: 'Invite at least one team member so your whole crew can log data.'         },
  compliance_logged: { icon: ShieldCheck,   route: '/compliance-logger',     cta: 'Open Compliance Logger →', description: 'Log a compliance observation, PM check, or safety note.'          },
  first_violation:   { icon: AlertTriangle, route: '/violations',            cta: 'View Violations →',   description: 'Review the Violations module — familiarize yourself with how it works.' },
  checkin_30d:       { icon: Calendar,      cta: 'Scheduled by your rep',    description: 'Your Nexum contact will reach out to schedule a 30-day check-in call.' },
};

function markMilestoneDone(milestoneId: string, token: string | null) {
  if (!token) return;
  fetch(`${API_BASE}/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ milestoneId }),
  }).catch(() => {});
}

export default function OnboardingStatus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('nexum_access_token') || localStorage.getItem('nexum_id_token');

  const fetchRecord = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/onboarding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecord(data.record);
      }
    } catch { /* show static fallback */ }
    finally { setLoading(false); }
  }, [token]);

  // Auto-mark org_configured milestone if org type is set
  useEffect(() => {
    const orgType = localStorage.getItem('nexum_org_type');
    if (orgType && token) markMilestoneDone('org_configured', token);
  }, [token]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  const milestones: Milestone[] = record?.milestones ?? [
    { id: 'account_created',   label: 'Account created & verified',             done: true  },
    { id: 'org_configured',    label: 'Organization type configured',            done: !!localStorage.getItem('nexum_org_type') },
    { id: 'first_equipment',   label: 'First equipment logged',                  done: false },
    { id: 'first_work_order',  label: 'First work order created',                done: false },
    { id: 'team_invited',      label: 'Team member invited (≥ 1 additional)',    done: false },
    { id: 'compliance_logged', label: 'Compliance logger used',                  done: false },
    { id: 'first_violation',   label: 'Violations module reviewed',              done: false },
    { id: 'checkin_30d',       label: '30-day check-in completed',               done: false },
  ];

  const completed  = milestones.filter(m => m.done).length;
  const total      = milestones.length;
  const progress   = record?.progress ?? Math.round((completed / total) * 100);
  const allDone    = completed === total;
  const orgName    = record?.orgName || user?.name || 'Your Organization';

  const handleNavigate = (milestoneId: string, route: string) => {
    markMilestoneDone(milestoneId, token);
    navigate(route);
  };

  const progressColor = progress >= 75 ? 'bg-green-500' : progress >= 40 ? 'bg-primary' : 'bg-orange-500';

  return (
    <MainLayout>
      <ParticleBackground />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium mb-2">
            <Rocket className="w-3.5 h-3.5" />
            Pilot Partner — Business Tier
          </div>
          <h1 className="text-2xl font-bold">Welcome to Nexum Suum</h1>
          <p className="text-muted-foreground text-sm">
            {orgName} — complete these setup milestones to get the most out of your pilot.
          </p>
        </div>

        {/* Progress card */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Setup Progress</span>
              <span className={cn('text-sm font-bold', allDone ? 'text-green-400' : 'text-primary')}>
                {completed}/{total} complete
              </span>
            </div>
            <Progress value={progress} className="h-2.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{progress}% complete</span>
              {allDone
                ? <span className="text-green-400 font-medium">🎉 Fully set up!</span>
                : <span>{total - completed} remaining</span>}
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <div className="space-y-2">
          {milestones.map((m, i) => {
            const meta  = MILESTONE_META[m.id];
            const Icon  = meta?.icon ?? Circle;
            const isNext = !m.done && milestones.slice(0, i).every(prev => prev.done);

            return (
              <Card
                key={m.id}
                className={cn(
                  'bg-card border transition-all',
                  m.done
                    ? 'border-green-500/20 bg-green-500/5'
                    : isNext
                    ? 'border-primary/40 shadow-sm shadow-primary/10'
                    : 'border-border/40 opacity-70',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {m.done
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <Circle className={cn('w-5 h-5', isNext ? 'text-primary' : 'text-muted-foreground/40')} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('text-sm font-medium', m.done && 'text-green-300')}>{m.label}</p>
                        {isNext && !m.done && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">Next</Badge>
                        )}
                        {m.done && m.doneAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(m.doneAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {!m.done && meta?.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5">{meta.description}</p>
                      )}
                    </div>
                    {!m.done && meta?.route && (
                      <Button
                        size="sm"
                        variant={isNext ? 'default' : 'outline'}
                        className="shrink-0 h-7 text-xs"
                        onClick={() => handleNavigate(m.id, meta.route!)}
                      >
                        {meta.cta}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Explore the platform</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Main Hub',          route: '/',                    icon: Rocket       },
                { label: 'Equipment Intel',   route: '/equipment-intelligence', icon: Wrench    },
                { label: 'Work Orders',       route: '/work-orders',         icon: ClipboardList },
                { label: 'Compliance Logger', route: '/compliance-logger',   icon: ShieldCheck  },
                { label: 'Violations',        route: '/violations',          icon: AlertTriangle },
                { label: 'Optimize & Learn',  route: '/optimize-learn',      icon: BookOpen     },
              ].map(({ label, route, icon: Icon }) => (
                <button
                  key={route}
                  onClick={() => navigate(route)}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all text-left text-xs font-medium"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Your Nexum contact</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Questions, setup help, or feedback — reach out directly.
              </p>
              <a
                href="mailto:razzellv@nexumsuum.com"
                className="text-xs text-primary font-medium hover:underline mt-1 inline-block"
              >
                razzellv@nexumsuum.com
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Nexum Suum Facility Intelligence™ · Pilot Partner Program
        </p>
      </div>
    </MainLayout>
  );
}
