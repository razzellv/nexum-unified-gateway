import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';

const LMS_URL = import.meta.env.VITE_LMS_URL || 'https://extraordinary-lolly-d8fb3b.netlify.app';
const ALLOWED_ROLES = ['admin', 'executive', 'manager', 'supervisor', 'engineer'];

export default function Courses() {
  const { userRole } = useAuth();
  const hasAccess = ALLOWED_ROLES.includes(userRole || '');

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">Access restricted. Contact your manager to be enrolled.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] w-full">
        <iframe
          src={LMS_URL}
          className="w-full h-full border-0"
          title="Nexum Optimize & Learn"
        />
      </div>
    </MainLayout>
  );
}
