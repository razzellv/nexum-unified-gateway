import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/api';
import {
  BookOpen, CheckCircle, Clock, Flame, Snowflake, Wind,
  Zap, Shield, AlertTriangle, Wrench, RefreshCw, GraduationCap,
  PlayCircle, Lock, ClipboardCheck, BarChart3, Users, Brain, TrendingUp,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CourseModule {
  id: string;
  title: string;
  durationMin: number;
}

interface Course {
  courseId: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  iconColor: string;
  modules: CourseModule[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  isNew?: boolean;
}

interface Enrollment {
  courseId: string;
  status: 'enrolled' | 'in_progress' | 'completed';
  progressPct: number;
  completedModules: string[];
  enrolledAt: string;
}

// ── Fallback course catalog (shown when API returns nothing) ───────────────────

const FALLBACK_COURSES: Course[] = [
  {
    courseId: 'boiler-operations-fundamentals',
    title: 'Boiler Operations Fundamentals',
    description:
      'Core principles of boiler operation, safety interlocks, combustion efficiency, and daily logging procedures for stationary engineers.',
    category: 'Mechanical Systems',
    icon: Flame,
    iconColor: 'text-orange-400',
    level: 'Beginner',
    modules: [
      { id: 'bof-1', title: 'Introduction to Steam Boilers',           durationMin: 20 },
      { id: 'bof-2', title: 'Combustion Theory & Efficiency',          durationMin: 25 },
      { id: 'bof-3', title: 'Safety Controls & Interlocks',            durationMin: 30 },
      { id: 'bof-4', title: 'Daily Inspection & Log Procedures',       durationMin: 20 },
      { id: 'bof-5', title: 'Troubleshooting Common Boiler Issues',    durationMin: 35 },
    ],
  },
  {
    courseId: 'chiller-system-management',
    title: 'Chiller System Management',
    description:
      'Deep dive into chiller operation, COP monitoring, refrigerant handling, and scheduled preventive maintenance protocols.',
    category: 'Mechanical Systems',
    icon: Snowflake,
    iconColor: 'text-cyan-400',
    level: 'Intermediate',
    modules: [
      { id: 'csm-1', title: 'Chiller Types & Operating Principles',    durationMin: 25 },
      { id: 'csm-2', title: 'Refrigerant Circuits & Pressures',        durationMin: 30 },
      { id: 'csm-3', title: 'COP & Performance Monitoring',            durationMin: 20 },
      { id: 'csm-4', title: 'Condenser & Evaporator Maintenance',      durationMin: 35 },
      { id: 'csm-5', title: 'Refrigerant Handling & Compliance',       durationMin: 25 },
      { id: 'csm-6', title: 'Seasonal Startup & Shutdown',             durationMin: 20 },
    ],
  },
  {
    courseId: 'hvac-preventive-maintenance',
    title: 'HVAC Preventive Maintenance',
    description:
      'Structured PM programs for air handlers, cooling towers, VAV systems, and BAS integration for maximum uptime.',
    category: 'HVAC',
    icon: Wind,
    iconColor: 'text-blue-400',
    level: 'Intermediate',
    modules: [
      { id: 'hpm-1', title: 'AHU Inspection & Filter Schedules',       durationMin: 20 },
      { id: 'hpm-2', title: 'Cooling Tower Water Treatment',           durationMin: 25 },
      { id: 'hpm-3', title: 'VAV Box Calibration & Balancing',         durationMin: 30 },
      { id: 'hpm-4', title: 'BAS Integration & Alarm Management',      durationMin: 25 },
      { id: 'hpm-5', title: 'PM Documentation Best Practices',         durationMin: 20 },
    ],
  },
  {
    courseId: 'energy-efficiency-utility-management',
    title: 'Energy Efficiency & Utility Management',
    description:
      'Optimize energy spend through demand management, utility billing analysis, benchmarking, and sustainable operations strategies.',
    category: 'Energy',
    icon: Zap,
    iconColor: 'text-yellow-400',
    level: 'Advanced',
    modules: [
      { id: 'eem-1', title: 'Energy Auditing Methodology',             durationMin: 30 },
      { id: 'eem-2', title: 'Demand Response & Peak Shaving',          durationMin: 25 },
      { id: 'eem-3', title: 'Utility Bill Analysis & Benchmarking',    durationMin: 20 },
      { id: 'eem-4', title: 'ASHRAE Standards & LEED Concepts',        durationMin: 35 },
      { id: 'eem-5', title: 'Retro-Commissioning Strategies',          durationMin: 30 },
      { id: 'eem-6', title: 'Reporting & Stakeholder Communication',   durationMin: 20 },
    ],
  },
  {
    courseId: 'compliance-documentation-standards',
    title: 'Compliance & Documentation Standards',
    description:
      'Master regulatory compliance logging, OSHA requirements, inspection readiness, and decision-defensible documentation.',
    category: 'Compliance',
    icon: Shield,
    iconColor: 'text-green-400',
    level: 'Beginner',
    modules: [
      { id: 'cds-1', title: 'Regulatory Overview: OSHA & Local Codes', durationMin: 25 },
      { id: 'cds-2', title: 'Compliance Logger Fundamentals',          durationMin: 20 },
      { id: 'cds-3', title: 'Inspection Preparation & Readiness',      durationMin: 25 },
      { id: 'cds-4', title: 'Violation Response & Corrective Action',  durationMin: 20 },
      { id: 'cds-5', title: 'Record Retention & Audit Trails',         durationMin: 15 },
    ],
  },
  {
    courseId: 'emergency-procedures-safety-protocols',
    title: 'Emergency Procedures & Safety Protocols',
    description:
      'Crisis response frameworks, lockout/tagout procedures, chemical handling, and evacuation planning for facility operations teams.',
    category: 'Safety',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    level: 'Beginner',
    modules: [
      { id: 'eps-1', title: 'Emergency Response Framework',            durationMin: 20 },
      { id: 'eps-2', title: 'Lockout / Tagout (LOTO) Procedures',      durationMin: 30 },
      { id: 'eps-3', title: 'Chemical Safety & MSDS/SDS',              durationMin: 25 },
      { id: 'eps-4', title: 'Fire Safety & Evacuation Planning',       durationMin: 20 },
      { id: 'eps-5', title: 'Incident Reporting & Investigation',      durationMin: 20 },
    ],
  },
  {
    courseId: 'new-equipment-systems',
    title: 'New Equipment Systems',
    description:
      'Onboarding guide for recently installed equipment systems — covers installation, commissioning, controls, diagnostics, and documentation.',
    category: 'Equipment',
    icon: Wrench,
    iconColor: 'text-primary',
    level: 'Intermediate',
    isNew: true,
    modules: [
      { id: 'nes-1', title: 'Introduction to New Equipment Systems',    durationMin: 20 },
      { id: 'nes-2', title: 'Installation & Commissioning Checklist',   durationMin: 30 },
      { id: 'nes-3', title: 'System Controls & Automation Overview',    durationMin: 25 },
      { id: 'nes-4', title: 'Preventive Maintenance Protocols',         durationMin: 30 },
      { id: 'nes-5', title: 'Troubleshooting & Diagnostics',            durationMin: 35 },
      { id: 'nes-6', title: 'Safety & Compliance Standards',            durationMin: 20 },
      { id: 'nes-7', title: 'Documentation & Reporting',                durationMin: 15 },
    ],
  },

  // ── Facility Intelligence Officer Track ──────────────────────────────────────
  {
    courseId: 'fio-role-and-responsibilities',
    title: 'Facility Intelligence Officer: Role & Responsibilities',
    description:
      'Master the FIO position — scope of authority, 4-layer governance model, client relationship management, and how FIAS assessments drive platform intelligence.',
    category: 'FI Officer',
    icon: Brain,
    iconColor: 'text-purple-400',
    level: 'Beginner',
    isNew: true,
    modules: [
      { id: 'fio-1', title: 'The FIO Role: Scope & Authority',                    durationMin: 20 },
      { id: 'fio-2', title: '4-Layer Governance: Record → Validate → Interpret → Execute', durationMin: 25 },
      { id: 'fio-3', title: 'Pre-Onboarding Protocol: Initial Facility Baseline', durationMin: 30 },
      { id: 'fio-4', title: 'Ongoing Audit Cycles & Periodic Assessment',         durationMin: 20 },
      { id: 'fio-5', title: 'Escalation Pathways & Stakeholder Communication',    durationMin: 25 },
      { id: 'fio-6', title: 'Ethics, Confidentiality & Data Handling',            durationMin: 15 },
    ],
  },
  {
    courseId: 'fias-assessment-methodology',
    title: 'FIAS Assessment Methodology',
    description:
      'Deep dive into the Facility Intelligence Assessment System — scoring formulas, condition question protocols, risk classification, findings documentation, and platform push workflow.',
    category: 'FI Officer',
    icon: ClipboardCheck,
    iconColor: 'text-cyan-400',
    level: 'Intermediate',
    isNew: true,
    modules: [
      { id: 'fias-1', title: 'FIAS Overview: Purpose & Architecture',             durationMin: 20 },
      { id: 'fias-2', title: 'Section 1–2: Identity & Condition Assessment',      durationMin: 30 },
      { id: 'fias-3', title: 'Section 3–4: Performance Review & Risk Classification', durationMin: 30 },
      { id: 'fias-4', title: 'FIAS Score Formula & Risk Band Interpretation',     durationMin: 25 },
      { id: 'fias-5', title: 'Findings Documentation & Work Order Generation',    durationMin: 25 },
      { id: 'fias-6', title: 'Sealing Records & Pushing to FI Platform',          durationMin: 20 },
      { id: 'fias-7', title: 'Evidence Standards & Field Photography',            durationMin: 15 },
    ],
  },
  {
    courseId: 'data-driven-facility-intelligence',
    title: 'Data-Driven Facility Intelligence',
    description:
      'Transform raw facility data into actionable intelligence — log governance, admissibility scoring, dashboard interpretation, and KPI-driven decision making.',
    category: 'FI Officer',
    icon: BarChart3,
    iconColor: 'text-blue-400',
    level: 'Intermediate',
    isNew: true,
    modules: [
      { id: 'ddfi-1', title: 'Log Governance: Admissible vs. Incomplete vs. Invalid', durationMin: 25 },
      { id: 'ddfi-2', title: 'Reading Executive & Manager Dashboards',            durationMin: 20 },
      { id: 'ddfi-3', title: 'KPI Interpretation: MTBF, Compliance Rate, Uptime', durationMin: 25 },
      { id: 'ddfi-4', title: 'Trend Analysis & Predictive Indicators',            durationMin: 30 },
      { id: 'ddfi-5', title: 'Data Conditioning: Flagging & Re-entry Protocols',  durationMin: 20 },
      { id: 'ddfi-6', title: 'Intelligence Reports: Structure & Delivery',        durationMin: 25 },
    ],
  },
  {
    courseId: 'client-onboarding-and-success',
    title: 'Client Onboarding & Platform Success',
    description:
      'Guide facility clients from first contact through FIAS baseline, platform activation, team setup, and ongoing engagement — with communication templates and escalation frameworks.',
    category: 'FI Officer',
    icon: Users,
    iconColor: 'text-green-400',
    level: 'Beginner',
    isNew: true,
    modules: [
      { id: 'cos-1', title: 'Pre-Onboarding Checklist & Site Visit Preparation', durationMin: 20 },
      { id: 'cos-2', title: 'Conducting the Initial FIAS Assessment',            durationMin: 25 },
      { id: 'cos-3', title: 'Platform Activation & User Role Configuration',     durationMin: 20 },
      { id: 'cos-4', title: 'Training Facility Teams on the FI Platform',        durationMin: 30 },
      { id: 'cos-5', title: 'Ongoing Client Communication Cadence',              durationMin: 20 },
      { id: 'cos-6', title: 'Escalation, Churn Signals & Retention Strategies', durationMin: 25 },
    ],
  },
  {
    courseId: 'fi-platform-advanced-operations',
    title: 'FI Platform: Advanced Operations',
    description:
      'Advanced module for FIOs covering Operation Center governance, work order execution gates, violation lifecycle enforcement, compliance analyzer, and platform integration architecture.',
    category: 'FI Officer',
    icon: TrendingUp,
    iconColor: 'text-orange-400',
    level: 'Advanced',
    isNew: true,
    modules: [
      { id: 'fpao-1', title: 'Operation Center: Log Governance & Admissibility',  durationMin: 25 },
      { id: 'fpao-2', title: 'Work Order Execution Gates & Resolution Sealing',   durationMin: 20 },
      { id: 'fpao-3', title: 'Violation Lifecycle: Sequence Enforcement',         durationMin: 20 },
      { id: 'fpao-4', title: 'Compliance Analyzer: Pattern Recognition',          durationMin: 25 },
      { id: 'fpao-5', title: 'FIAS → Dashboard Data Flow & Auto-WO Generation',  durationMin: 30 },
      { id: 'fpao-6', title: 'Multi-Facility Management & Portfolio Views',       durationMin: 25 },
      { id: 'fpao-7', title: 'Platform Troubleshooting & Client Support',         durationMin: 20 },
    ],
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Beginner:     'bg-green-500/20 text-green-400 border-green-500/30',
  Intermediate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced:     'bg-red-500/20 text-red-400 border-red-500/30',
};

// Merge API courses with fallback — API wins if present, fallback fills gaps
function mergeCourses(apiCourses: any[]): Course[] {
  if (!apiCourses || apiCourses.length === 0) return FALLBACK_COURSES;

  const apiIds = new Set(apiCourses.map((c: any) => c.courseId));
  const fallbackExtras = FALLBACK_COURSES.filter((c) => !apiIds.has(c.courseId));

  const merged: Course[] = apiCourses.map((c: any) => {
    const fallback = FALLBACK_COURSES.find((f) => f.courseId === c.courseId);
    return {
      courseId:    c.courseId,
      title:       c.title       || fallback?.title       || c.courseId,
      description: c.description || fallback?.description || '',
      category:    c.category    || fallback?.category    || 'General',
      icon:        fallback?.icon       || BookOpen,
      iconColor:   fallback?.iconColor  || 'text-primary',
      level:       c.level       || fallback?.level       || 'Beginner',
      isNew:       c.isNew       || fallback?.isNew       || false,
      modules:     (c.modules && c.modules.length > 0)
                     ? c.modules
                     : (fallback?.modules || []),
    } as Course;
  });

  return [...merged, ...fallbackExtras];
}

// ── Main Component ─────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'executive', 'manager', 'supervisor', 'engineer'];

export default function Courses() {
  const { userRole, loading: authLoading } = useAuth();
  const hasAccess = ALLOWED_ROLES.includes(userRole || '');

  const [courses, setCourses]           = useState<Course[]>([]);
  const [enrollments, setEnrollments]   = useState<Record<string, Enrollment>>({});
  const [isLoading, setIsLoading]       = useState(true);
  const [enrollingId, setEnrollingId]   = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'enrolled' | 'completed'>('all');

  // Content player state
  const [activeCourse, setActiveCourse]       = useState<Course | null>(null);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to load courses from Lambda (nexum-lms-handler)
      const [coursesRes, enrollmentsRes] = await Promise.allSettled([
        apiRequest('/lms/courses'),
        apiRequest('/lms/enrollments'),
      ]);

      const apiCourses =
        coursesRes.status === 'fulfilled'
          ? (coursesRes.value?.courses || coursesRes.value?.items || coursesRes.value || [])
          : [];

      setCourses(mergeCourses(Array.isArray(apiCourses) ? apiCourses : []));

      if (enrollmentsRes.status === 'fulfilled') {
        const rawEnrollments: Enrollment[] =
          enrollmentsRes.value?.enrollments ||
          enrollmentsRes.value?.items ||
          (Array.isArray(enrollmentsRes.value) ? enrollmentsRes.value : []);
        const byId: Record<string, Enrollment> = {};
        rawEnrollments.forEach((e) => { byId[e.courseId] = e; });
        setEnrollments(byId);
      }
    } catch {
      // Network completely failed — just show fallback courses
      setCourses(FALLBACK_COURSES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, loadData]);

  const enroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      await apiRequest('/lms/enroll', {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      });
      setEnrollments((prev) => ({
        ...prev,
        [courseId]: {
          courseId,
          status: 'enrolled',
          progressPct: 0,
          completedModules: [],
          enrolledAt: new Date().toISOString(),
        },
      }));
    } catch {
      // Silently fail enrollment API — mark locally so the user can proceed
      setEnrollments((prev) => ({
        ...prev,
        [courseId]: {
          courseId,
          status: 'enrolled',
          progressPct: 0,
          completedModules: [],
          enrolledAt: new Date().toISOString(),
        },
      }));
    } finally {
      setEnrollingId(null);
    }
  };

  const markModuleComplete = (course: Course, moduleId: string) => {
    setEnrollments(prev => {
      const existing = prev[course.courseId] ?? {
        courseId: course.courseId, status: 'in_progress' as const,
        progressPct: 0, completedModules: [], enrolledAt: new Date().toISOString(),
      };
      const completed = Array.from(new Set([...existing.completedModules, moduleId]));
      const total = course.modules.length;
      const pct = Math.round((completed.length / total) * 100);
      const status = pct >= 100 ? 'completed' : 'in_progress';
      const updated = { ...existing, completedModules: completed, progressPct: pct, status } as Enrollment;
      const next = { ...prev, [course.courseId]: updated };
      // Persist progress to localStorage
      try { localStorage.setItem(`nexum_course_progress_${course.courseId}`, JSON.stringify(updated)); } catch { /* ignore */ }
      return next;
    });
  };

  const openCourse = (course: Course) => {
    const enr = enrollments[course.courseId];
    // Resume at first incomplete module
    const firstIncomplete = course.modules.findIndex(m => !enr?.completedModules.includes(m.id));
    setActiveModuleIdx(firstIncomplete === -1 ? 0 : firstIncomplete);
    setActiveCourse(course);
  };

  const totalModules   = (c: Course) => c.modules?.length ?? 0;
  const enrollment     = (c: Course) => enrollments[c.courseId];
  const isEnrolled     = (c: Course) => !!enrollment(c);
  const isCompleted    = (c: Course) => enrollment(c)?.status === 'completed';
  const progress       = (c: Course) => enrollment(c)?.progressPct ?? 0;
  const totalMinutes   = (c: Course) => c.modules?.reduce((s, m) => s + m.durationMin, 0) ?? 0;

  const filteredCourses = courses.filter((c) => {
    if (activeFilter === 'enrolled')  return isEnrolled(c) && !isCompleted(c);
    if (activeFilter === 'completed') return isCompleted(c);
    return true;
  });

  const stats = {
    total:     courses.length,
    enrolled:  Object.keys(enrollments).length,
    completed: Object.values(enrollments).filter((e) => e.status === 'completed').length,
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              Access restricted. Contact your manager to be enrolled.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Optimize & Learn</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {stats.enrolled} enrolled · {stats.completed} completed · {stats.total} available
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-primary/30 hover:border-primary"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-border/40">
          {([
            { key: 'all',       label: 'All Courses',  count: stats.total },
            { key: 'enrolled',  label: 'In Progress',  count: stats.enrolled - stats.completed },
            { key: 'completed', label: 'Completed',    count: stats.completed },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                activeFilter === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeFilter === key ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="neon-border animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-5 bg-muted/40 rounded w-3/4" />
                  <div className="h-3 bg-muted/30 rounded w-full" />
                  <div className="h-3 bg-muted/30 rounded w-5/6" />
                  <div className="h-8 bg-muted/20 rounded mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No courses in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => {
              const Icon = course.icon;
              const enrolled  = isEnrolled(course);
              const completed = isCompleted(course);
              const pct       = progress(course);
              const mins      = totalMinutes(course);
              const modCount  = totalModules(course);

              return (
                <Card
                  key={course.courseId}
                  className={cn(
                    'neon-border flex flex-col transition-all hover:scale-[1.01]',
                    completed && 'border-green-400/30 bg-green-400/5',
                    enrolled && !completed && 'border-primary/30'
                  )}
                >
                  <CardHeader className="pb-3 pt-5 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('p-2 rounded-lg bg-muted/30 border border-border/40')}>
                        <Icon className={cn('w-5 h-5', course.iconColor)} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {course.isNew && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                            New
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn('text-[10px]', LEVEL_COLORS[course.level])}>
                          {course.level}
                        </Badge>
                        {completed && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                            <CheckCircle className="w-3 h-3 mr-1" />Completed
                          </Badge>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm mt-3 leading-snug">{course.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 flex flex-col flex-1 gap-3">
                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {modCount} module{modCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {mins} min
                      </span>
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {course.category}
                      </Badge>
                    </div>

                    {/* Module list (collapsed preview) */}
                    <div className="space-y-1">
                      {course.modules.slice(0, 3).map((mod, i) => (
                        <div key={mod.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-muted/40 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {i + 1}
                          </span>
                          <span className="truncate">{mod.title}</span>
                        </div>
                      ))}
                      {modCount > 3 && (
                        <p className="text-[10px] text-muted-foreground/60 pl-6">
                          +{modCount - 3} more module{modCount - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Progress bar for enrolled */}
                    {enrolled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Progress</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    )}

                    {/* CTA */}
                    <div className="mt-auto pt-1">
                      {completed ? (
                        <Button variant="outline" size="sm" className="w-full border-green-400/30 text-green-400 hover:bg-green-400/10" disabled>
                          <CheckCircle className="w-4 h-4 mr-2" />Course Complete
                        </Button>
                      ) : enrolled ? (
                        <Button size="sm" className="w-full" onClick={() => openCourse(course)}>
                          <PlayCircle className="w-4 h-4 mr-2" />Continue Learning
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-primary/30 hover:border-primary hover:bg-primary/5"
                          onClick={() => enroll(course.courseId)}
                          disabled={enrollingId === course.courseId}
                        >
                          {enrollingId === course.courseId ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <BookOpen className="w-4 h-4 mr-2" />
                          )}
                          Enroll
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content Player Dialog ─────────────────────────────────────────── */}
      {activeCourse && (() => {
        const mod     = activeCourse.modules[activeModuleIdx];
        const enr     = enrollments[activeCourse.courseId];
        const done    = enr?.completedModules ?? [];
        const isModDone = mod ? done.includes(mod.id) : false;
        const total   = activeCourse.modules.length;
        const pct     = total > 0 ? Math.round((done.length / total) * 100) : 0;

        return (
          <Dialog open={!!activeCourse} onOpenChange={() => setActiveCourse(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b border-border/40 shrink-0">
                <DialogTitle className="flex items-center gap-3 text-base pr-8">
                  {(() => { const Icon = activeCourse.icon; return <Icon className={cn('w-5 h-5 shrink-0', activeCourse.iconColor)} />; })()}
                  <span className="truncate">{activeCourse.title}</span>
                  <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">{pct}% complete</Badge>
                </DialogTitle>
                <Progress value={pct} className="h-1.5 mt-2" />
              </DialogHeader>

              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Module sidebar */}
                <div className="w-56 shrink-0 border-r border-border/30 overflow-y-auto bg-muted/20">
                  <div className="p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 px-1">Modules</p>
                    {activeCourse.modules.map((m, idx) => {
                      const isCurrent  = idx === activeModuleIdx;
                      const isDone     = done.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          className={cn(
                            'w-full flex items-start gap-2 p-2 rounded-lg text-left text-xs mb-1 transition-colors',
                            isCurrent ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/40'
                          )}
                          onClick={() => setActiveModuleIdx(idx)}
                        >
                          <span className={cn(
                            'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                            isDone ? 'bg-green-400/20 text-green-400' :
                            isCurrent ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'
                          )}>
                            {isDone
                              ? <CheckCircle className="w-3 h-3" />
                              : <span className="text-[9px] font-bold">{idx + 1}</span>
                            }
                          </span>
                          <span className="leading-snug">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6">
                    {mod ? (
                      <div className="max-w-2xl space-y-6">
                        {/* Module header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Module {activeModuleIdx + 1} of {total}
                            </p>
                            <h2 className="text-xl font-semibold">{mod.title}</h2>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {mod.durationMin} min
                          </div>
                        </div>

                        {/* Placeholder content body */}
                        <div className="p-5 rounded-xl border border-border/30 bg-muted/20 space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <PlayCircle className="w-8 h-8 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Video Lesson</p>
                              <p className="text-xs text-muted-foreground">~{mod.durationMin} minutes · HD</p>
                            </div>
                          </div>

                          <div className="space-y-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">Learning Objectives</p>
                            <ul className="space-y-1.5 list-none">
                              {[
                                `Understand the core concepts of ${mod.title.toLowerCase()}`,
                                'Apply best practices in real facility scenarios',
                                'Complete the module assessment with a passing score',
                              ].map((obj, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground italic">
                            Course content is loaded from the LMS. Complete the video and pass the quiz to mark this module done.
                          </div>
                        </div>

                        {isModDone && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-400/10 border border-green-400/20 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            Module completed
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No module selected.</p>
                    )}
                  </div>

                  {/* Footer nav */}
                  <div className="shrink-0 border-t border-border/40 px-6 py-4 flex items-center justify-between gap-3">
                    <Button
                      variant="outline" size="sm"
                      disabled={activeModuleIdx === 0}
                      onClick={() => setActiveModuleIdx(i => i - 1)}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />Previous
                    </Button>

                    <Button
                      size="sm"
                      variant={isModDone ? 'outline' : 'default'}
                      className={isModDone ? 'border-green-400/30 text-green-400' : ''}
                      onClick={() => {
                        if (mod && !isModDone) markModuleComplete(activeCourse, mod.id);
                      }}
                      disabled={isModDone}
                    >
                      {isModDone
                        ? <><CheckCircle className="w-4 h-4 mr-1" />Completed</>
                        : <>Mark Complete</>
                      }
                    </Button>

                    <Button
                      variant="outline" size="sm"
                      disabled={activeModuleIdx >= total - 1}
                      onClick={() => setActiveModuleIdx(i => i + 1)}
                    >
                      Next<ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </MainLayout>
  );
}
