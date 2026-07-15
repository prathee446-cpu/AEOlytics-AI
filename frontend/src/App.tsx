import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ContentLibrary } from './pages/ContentLibrary';
import { Workspace } from './pages/Workspace';
import { Chat } from './pages/Chat';
import { Analytics } from './pages/Analytics';
import { Rewrite } from './pages/Rewrite';
import { AIIntelligence } from './pages/AIIntelligence';
import { VisibilityCompare } from './pages/VisibilityCompare';


// Private Route Wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main Layout Wrapper
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-neutral-950/20">
        {children}
      </div>
    </div>
  );
};

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Private Dashboard Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/library"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <ContentLibrary />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/workspace"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Workspace />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rewrite"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Rewrite />
              </DashboardLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Chat />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Analytics />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-intelligence"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <AIIntelligence />
              </DashboardLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <VisibilityCompare />
              </DashboardLayout>
            </PrivateRoute>
          }
        />


        {/* Fallback Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
