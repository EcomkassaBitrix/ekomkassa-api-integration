import { useEffect, useState, ReactNode } from 'react';
import { authCall, clearToken, getToken } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

const AuthGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<'loading' | 'in' | 'out'>(getToken() ? 'loading' : 'out');

  useEffect(() => {
    if (!getToken()) return;
    authCall('me').then(({ status }) => {
      if (status === 200) setState('in');
      else {
        clearToken();
        setState('out');
      }
    }).catch(() => setState('in'));
  }, []);

  if (state === 'loading') return <div className="min-h-screen bg-background" />;
  if (state === 'out') return <LoginForm onSuccess={() => setState('in')} />;
  return <>{children}</>;
};

export default AuthGate;
