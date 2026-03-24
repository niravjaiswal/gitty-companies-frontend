import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      let cancelled = false;

      async function resolveHome() {
        try {
          const companyRes = await apiFetch('/api/company/me');
          if (cancelled) return;

          if (companyRes.ok) {
            navigate('/dashboard', { replace: true });
            return;
          }
        } catch {
          // Fall through to candidate home.
        }

        if (!cancelled) {
          navigate('/candidate', { replace: true });
        }
      }

      resolveHome();

      return () => {
        cancelled = true;
      };
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] p-4">
      <div className="w-full max-w-md bg-[#111116] border border-white/10 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Welcome Back
        </h1>
        <p className="text-white/50 text-center text-sm mb-8">
          Sign in to start your assessment
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#ff6b00',
                  brandAccent: '#e05e00',
                  inputBackground: '#1a1a2e',
                  inputText: '#e0e0e0',
                  inputBorder: 'rgba(255, 255, 255, 0.1)',
                  inputBorderFocus: '#ff6b00',
                  inputBorderHover: 'rgba(255, 255, 255, 0.2)',
                },
                borderWidths: {
                  buttonBorderWidth: '0px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '8px',
                  inputBorderRadius: '8px',
                },
              },
            },
            className: {
              container: 'auth-container',
              button: 'auth-button',
              anchor: 'text-orange-400 hover:text-orange-300',
            },
          }}
          theme="dark"
          providers={[]}
        />
      </div>
    </div>
  );
}
