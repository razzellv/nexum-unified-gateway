import { useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';

const LMS_URL = import.meta.env.VITE_LMS_URL || 'https://extraordinary-lolly-d8fb3b.netlify.app';
const ALLOWED_ROLES = ['admin', 'executive', 'manager', 'supervisor', 'engineer'];

export default function Courses() {
  const { userRole } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasAccess = ALLOWED_ROLES.includes(userRole || '');

  // Post token to iframe once it loads
  const handleIframeLoad = () => {
    const token = localStorage.getItem('nexum_access_token') || '';
    const idToken = localStorage.getItem('nexum_id_token') || '';
    if (iframeRef.current?.contentWindow && token) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'NEXUM_AUTH', accessToken: token, idToken },
        LMS_URL
      );
    }
  };

  if (!hasAccess) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full py-20">
          <p className="text-muted-foreground">Access restricted. Contact your manager to be enrolled.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] w-full">
        <iframe
          ref={iframeRef}
          src={LMS_URL}
          className="w-full h-full border-0"
          title="Nexum Optimize & Learn"
          onLoad={handleIframeLoad}
        />
      </div>
    </MainLayout>
  );
}
