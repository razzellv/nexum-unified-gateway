import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, Wrench, Flame, Wind, Zap,
  CheckCircle, Lock, GraduationCap, Trophy, Eye,
} from "lucide-react";
import { Course } from "@/types/lms/course";
import { useLMSAuth } from "@/hooks/useAuth";
import { EnrollmentManager } from "@/components/lms/EnrollmentManager";

interface CourseSelectorProps {
  courses: Course[];
  onSelectCourse: (courseId: string) => void;
  courseProgress: Record<string, { completed: number; total: number }>;
}

const courseIcons: Record<string, any> = {
  'facility-optimization':  BookOpen,
  'hvac-optimization':      Wind,
  'thermodynamics-tech':    Flame,
  'career-specialist':      Trophy,
  'facility-intelligence':  Zap,
  'new-equipment-systems':  Wrench,
};

const courseAccents: Record<string, { border: string; badge: string; icon: string }> = {
  'facility-optimization':  { border: 'border-primary/30',    badge: 'bg-primary/10 text-primary border-primary/30',          icon: 'text-primary' },
  'hvac-optimization':      { border: 'border-blue-400/30',   badge: 'bg-blue-400/10 text-blue-400 border-blue-400/30',        icon: 'text-blue-400' },
  'thermodynamics-tech':    { border: 'border-orange-400/30', badge: 'bg-orange-400/10 text-orange-400 border-orange-400/30',  icon: 'text-orange-400' },
  'career-specialist':      { border: 'border-yellow-400/30', badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',  icon: 'text-yellow-400' },
  'facility-intelligence':  { border: 'border-success/30',    badge: 'bg-success/10 text-success border-success/30',           icon: 'text-success' },
  'new-equipment-systems':  { border: 'border-purple-400/30', badge: 'bg-purple-400/10 text-purple-400 border-purple-400/30',  icon: 'text-purple-400' },
};

const defaultAccent = { border: 'border-primary/30', badge: 'bg-primary/10 text-primary border-primary/30', icon: 'text-primary' };

export const CourseSelector = ({ courses, onSelectCourse, courseProgress }: CourseSelectorProps) => {
  const {
    isReadOnly,
    canManageEnrollments,
    canEnrollManagers,
    user,
    enrolledCourses,
    canAccessCourse,
  } = useLMSAuth();

  // For enrolled trainees, only show their assigned courses
  const isEnrolledTrainee = !['admin','executive','manager','supervisor','engineer'].includes(user?.role || '');
  const visibleCourses = isEnrolledTrainee
    ? courses.filter(c => canAccessCourse(c.id))
    : courses;

  const totalCompleted = visibleCourses.reduce((sum, c) => {
    const p = courseProgress[c.id];
    return sum + (p?.completed || 0);
  }, 0);
  const totalModules = visibleCourses.reduce((sum, c) => {
    const p = courseProgress[c.id];
    return sum + (p?.total || c.modules.length);
  }, 0);
  const allCompleted = visibleCourses.length > 0 && visibleCourses.every(c => {
    const p = courseProgress[c.id];
    return p && p.completed === p.total;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <Badge variant="outline" className="border-primary/30 text-primary text-xs uppercase tracking-wider">
              Nexum Optimize & Learn™
            </Badge>
          </div>
          <h1 className="text-4xl font-bold text-foreground">Training Courses</h1>
          <p className="text-muted-foreground text-sm">
            {isEnrolledTrainee
              ? `You have been enrolled in ${visibleCourses.length} course${visibleCourses.length !== 1 ? 's' : ''} by your manager`
              : isReadOnly
                ? 'View available training courses and facility progress'
                : 'Select a course to begin or continue your training journey'}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {user?.role && (
              <Badge variant="outline" className="text-xs capitalize border-border/50">
                {user.role}
              </Badge>
            )}
            {isReadOnly && !isEnrolledTrainee && (
              <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
                <Eye className="w-3 h-3 mr-1" />View Only
              </Badge>
            )}
            {isEnrolledTrainee && (
              <Badge variant="outline" className="border-success/30 text-success text-xs">
                <GraduationCap className="w-3 h-3 mr-1" />Enrolled Trainee
              </Badge>
            )}
          </div>
        </div>

        {/* Overall progress */}
        <div className="glass-panel neon-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-sm">
                {isEnrolledTrainee ? 'My Training Progress' : 'Overall Progress'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground font-mono">
              {totalCompleted} / {totalModules} modules
            </span>
          </div>
          <Progress value={totalModules > 0 ? (totalCompleted / totalModules) * 100 : 0} className="h-2" />
          {allCompleted && (
            <div className="flex items-center gap-2 mt-3 text-success text-sm">
              <CheckCircle className="w-4 h-4" />
              {isEnrolledTrainee
                ? 'All assigned courses complete! Notify your manager.'
                : 'All courses complete — Final Exam unlocked!'}
            </div>
          )}
        </div>

        {/* Course grid */}
        {visibleCourses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No courses assigned yet</p>
            <p className="text-sm mt-1">Contact your facility manager to be enrolled in training.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {visibleCourses.map((course) => {
              const progress   = courseProgress[course.id] || { completed: 0, total: course.modules.length };
              const pct        = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
              const isComplete = progress.completed === progress.total && progress.total > 0;
              const accent     = courseAccents[course.id] || defaultAccent;
              const Icon       = courseIcons[course.id] || BookOpen;

              return (
                <Card
                  key={course.id}
                  className={`glass-panel border ${accent.border} hover:border-opacity-60 transition-all hover:scale-[1.01]`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-muted/30 border border-border/30 mt-0.5 shrink-0">
                          <Icon className={`w-5 h-5 ${accent.icon}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold leading-snug mb-1">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="text-xs leading-relaxed">
                            {course.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isComplete && (
                        <Badge className="bg-success/20 text-success border-success/30 text-[10px] shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />Done
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium font-mono">{progress.completed}/{progress.total} modules</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${accent.badge}`}>
                        {course.modules.length} modules
                      </Badge>
                      {progress.completed > 0 && !isComplete && (
                        <Badge variant="outline" className="text-[10px] border-yellow-400/30 text-yellow-400 bg-yellow-400/10">
                          In progress
                        </Badge>
                      )}
                      {progress.completed === 0 && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Not started
                        </Badge>
                      )}
                    </div>

                    <Button
                      onClick={() => onSelectCourse(course.id)}
                      className={`w-full ${isComplete ? '' : ''}`}
                      variant={isComplete ? 'outline' : isReadOnly ? 'outline' : 'default'}
                    >
                      {isReadOnly || isEnrolledTrainee
                        ? isComplete ? <><CheckCircle className="w-4 h-4 mr-2" />Review</> : <><BookOpen className="w-4 h-4 mr-2" />{progress.completed > 0 ? 'Continue' : 'Start Training'}</>
                        : isComplete
                          ? 'Review Course'
                          : progress.completed > 0 ? 'Continue Course' : 'Start Course'
                      }
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Final exam — not for enrolled trainees (needs manager approval) */}
        {!isEnrolledTrainee && (
          <Card className={`glass-panel border-2 transition-all ${allCompleted ? 'border-primary/50 neon-border' : 'border-border/30'}`}>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Trophy className={`w-5 h-5 ${allCompleted ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                Final Comprehensive Exam
              </CardTitle>
              <CardDescription className="text-center">
                {allCompleted
                  ? 'You have completed all modules. You are ready for the final exam.'
                  : 'Complete all modules from every course to unlock the final exam.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground font-mono">
                  {totalCompleted} / {totalModules} total modules completed
                </div>
                {isReadOnly ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/20 border border-border/30">
                    <Lock className="w-4 h-4" />
                    Exam participation requires Manager approval
                  </div>
                ) : (
                  <Button disabled={!allCompleted} size="lg" className="w-full max-w-md">
                    {allCompleted
                      ? <><Trophy className="w-4 h-4 mr-2" />Take Final Exam</>
                      : <><Lock className="w-4 h-4 mr-2" />Complete All Modules to Unlock</>
                    }
                  </Button>
                )}
                {!allCompleted && (
                  <p className="text-xs text-muted-foreground">
                    {totalModules - totalCompleted} module{totalModules - totalCompleted !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrollment manager — managers and executives only */}
        <EnrollmentManager />
      </div>
    </div>
  );
};
