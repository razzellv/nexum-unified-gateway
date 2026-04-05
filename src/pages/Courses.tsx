import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api';
import {
  BookOpen, CheckCircle, Clock, Flame, Snowflake, Wind,
  Zap, Shield, AlertTriangle, Wrench, RefreshCw, GraduationCap,
  PlayCircle, Lock,
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
                        <Button size="sm" className="w-full" onClick={() => {}}>
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
    </MainLayout>
  );
}
