import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Card } from '../components/ui/Widgets';
import { setCredentials, setAuthLoading, setAuthError } from '../store/slices/authSlice';
import api from '../services/api';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { RootState } from '../store';

export const Register: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    dispatch(setAuthLoading(true));

    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      dispatch(setAuthLoading(false));
      navigate('/');
    } catch (err: any) {
      dispatch(setAuthLoading(false));
      const msg = err.response?.data?.error || 'Registration failed. Ensure database server is up.';
      dispatch(setAuthError(msg));
    }
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

        {/* Register Card */}
        <Card glow="indigo" className="p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-white tracking-wider uppercase font-display select-none">Create Account</h2>

            {(error || validationError) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium">
                {error || validationError}
              </div>
            )}

            <Input
              label="Full Name"
              placeholder="Alex Carter"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="alex@company.com"
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

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign Up
            </Button>
          </form>
        </Card>

        {/* Back Link */}
        <Link 
          to="/login" 
          className="text-center text-xs text-muted hover:text-white flex items-center justify-center gap-1.5 transition select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </div>
  );
};
