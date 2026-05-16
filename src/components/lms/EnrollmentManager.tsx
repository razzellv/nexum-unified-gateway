// src/components/EnrollmentManager.tsx
// Used inside CourseSelector for managers/executives to assign users to courses

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { GraduationCap, UserPlus, Users, CheckCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { useLMSAuth } from '@/hooks/useAuth';
import { courses } from '@/data/lms/courses';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_BASE_URL ||
                 'https://vflco2pvo3.execute-api.us-east-2.amazonaws.com/prod';

interface Enrollment {
  userId: string;
  courseId: string;
  userName: string;
  userRole: string;
  enrolledAt: string;
  status: string;
  lastAccessed: string | null;
}

export function EnrollmentManager() {
  const { user, canManageEnrollments, canEnrollManagers } = useLMSAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [dialogOpen, setDialogOpen]   = useState(false);

  // New enrollment form state
  const [targetUserId, setTargetUserId]   = useState('');
  const [targetUserName, setTargetUserName] = useState('');
  const [targetUserRole, setTargetUserRole] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [submitting, setSubmitting]       = useState(false);

  useEffect(() => {
    if (canManageEnrollments) fetchEnrollments();
  }, [canManageEnrollments]);

  const getToken = () =>
    localStorage.getItem('nexum_access_token') || '';

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/lms/enrollments/all?facilityId=${user?.facilityId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
      }
    } catch (e) {
      console.error('Failed to load enrollments', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!targetUserId.trim()) {
      toast.error('User ID (Cognito sub) is required');
      return;
    }
    if (selectedCourses.length === 0) {
      toast.error('Select at least one course');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/lms/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId:     targetUserId.trim(),
          courseIds:  selectedCourses,
          facilityId: user?.facilityId,
          userName:   targetUserName.trim(),
          userRole:   targetUserRole,
        }),
      });

      if (res.ok) {
        toast.success(`Enrolled ${targetUserName || targetUserId} in ${selectedCourses.length} course(s)`);
        setTargetUserId('');
        setTargetUserName('');
        setTargetUserRole('');
        setSelectedCourses([]);
        setDialogOpen(false);
        fetchEnrollments();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Enrollment failed');
      }
    } catch (e) {
      toast.error('Network error — could not enroll user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspend = async (enrollment: Enrollment) => {
    try {
      const res = await fetch(`${API_BASE}/lms/enroll`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId:   enrollment.userId,
          courseId: enrollment.courseId,
          suspend:  true,
        }),
      });
      if (res.ok) {
        toast.success('Enrollment suspended');
        fetchEnrollments();
      }
    } catch (e) {
      toast.error('Failed to suspend enrollment');
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(c => c !== courseId)
        : [...prev, courseId]
    );
  };

  if (!canManageEnrollments) return null;

  // Available roles to enroll (executives can enroll managers, managers enroll others)
  const enrollableRoles = canEnrollManagers
    ? ['manager', 'supervisor', 'engineer', 'operator', 'technician', 'custodian']
    : ['supervisor', 'engineer', 'operator', 'technician', 'custodian'];

  // Group enrollments by user
  const byUser = enrollments.reduce((acc, e) => {
    if (!acc[e.userId]) acc[e.userId] = { name: e.userName, role: e.userRole, courses: [] };
    acc[e.userId].courses.push(e);
    return acc;
  }, {} as Record<string, { name: string; role: string; courses: Enrollment[] }>);

  return (
    <Card className="glass-panel border border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              {canEnrollManagers ? 'Enrollment Management' : 'Employee Enrollment'}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {canEnrollManagers
                ? 'Assign managers and staff to training courses'
                : 'Assign employees to training courses'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchEnrollments} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Enroll User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enroll User in Training</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">User ID (Cognito Sub)</Label>
                    <Input
                      value={targetUserId}
                      onChange={e => setTargetUserId(e.target.value)}
                      placeholder="e.g. abc123-def456-..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Found in Nexum Portal → Settings → User Management
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Display Name</Label>
                      <Input
                        value={targetUserName}
                        onChange={e => setTargetUserName(e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <Select value={targetUserRole} onValueChange={setTargetUserRole}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          {enrollableRoles.map(r => (
                            <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Assign Courses *</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {courses.map(course => (
                        <div key={course.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                          <Checkbox
                            id={course.id}
                            checked={selectedCourses.includes(course.id)}
                            onCheckedChange={() => toggleCourse(course.id)}
                            className="mt-0.5"
                          />
                          <label htmlFor={course.id} className="text-xs cursor-pointer leading-snug">
                            {course.title}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedCourses.length > 0 && (
                      <p className="text-xs text-primary">{selectedCourses.length} course(s) selected</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleEnroll} disabled={submitting}>
                      {submitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling...</>
                        : <><CheckCircle className="w-4 h-4 mr-2" />Confirm Enrollment</>
                      }
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />Loading enrollments...
          </div>
        ) : Object.keys(byUser).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No active enrollments yet. Click "Enroll User" to assign training.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byUser).map(([userId, info]) => (
              <div key={userId} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {info.name?.[0] || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{info.name || userId.slice(-8)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{info.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                    {info.courses.length} course{info.courses.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {info.courses.map(e => (
                    <div key={e.courseId} className="flex items-center gap-1 bg-muted/30 rounded px-2 py-1">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {courses.find(c => c.id === e.courseId)?.title?.split('—')[0]?.trim() || e.courseId}
                      </span>
                      <button
                        onClick={() => handleSuspend(e)}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                        title="Suspend enrollment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
