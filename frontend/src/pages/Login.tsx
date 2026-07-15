import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Card } from '../components/ui/Widgets';
import { setCredentials, setAuthLoading, setAuthError } from '../store/slices/authSlice';
import api from '../services/api';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { RootState } from '../store';

export const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setValidationError('');
    dispatch(setAuthLoading(true));

    try {
      const res = await api.post('/api/auth/login', { email, password });
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(setAuthLoading(false));
      navigate('/');
    } catch (err: any) {
      dispatch(setAuthLoading(false));
      const msg = err.response?.data?.error || 'Failed to authenticate. Ensure database is running.';
      dispatch(setAuthError(msg));
    }
  };

  // Demo Login bypass for fast developer testing
  const handleDemoBypass = () => {
    dispatch(setAuthLoading(true));
    setTimeout(() => {
      dispatch(setCredentials({
        user: { id: 'demo-user-id', email: 'demo@contentiq.ai', name: 'Demo Administrator', role: 'ADMIN' },
        token: 'mock-jwt-token-contentiq-ai'
      }));
      dispatch(setAuthLoading(false));
      navigate('/');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-full blur-[100px] pointer-events-none select-none" />
      
      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="text-center flex flex-col items-center gap-2 select-none">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-display">AEOlytics</h1>
          <p className="text-xs text-muted">AEO Content Tracker & AI Search Engine</p>
        </div>

        {/* Login Card */}
        <Card glow="violet" className="p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-white tracking-wider uppercase font-display select-none">Welcome Back</h2>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>

          {/* Bypass mode */}
          <div className="mt-5 pt-5 border-t border-border flex flex-col gap-3">
            <div className="relative text-center shrink-0">
              <span className="bg-card px-2 text-[10px] text-muted tracking-wider uppercase font-semibold font-display z-10 relative">Or Explore Immediately</span>
              <div className="absolute inset-y-1/2 left-0 right-0 h-[1px] bg-border/50" />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDemoBypass}
              className="w-full text-xs font-display flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enter Guest Demo Mode</span>
            </Button>
          </div>
        </Card>

        {/* Register Redirect link */}
        <p className="text-center text-xs text-muted select-none">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-light font-medium underline transition">
            Create Free Account
          </Link>
        </p>
      </div>
    </div>
  );
};
