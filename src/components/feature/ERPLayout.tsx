import { useState, useEffect } from 'react';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useERP } from '@/hooks/useERPContext';

interface ERPLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function ERPLayout({ children, title, subtitle }: ERPLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { auth, logout } = useERP();
  const navigate = useNavigate();

  // Auto-logout after 30 min inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { logout(); navigate('/login'); }, 30 * 60 * 1000);
    };
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    reset();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [logout, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!auth.isAuthenticated) navigate('/login');
  }, [auth.isAuthenticated, navigate]);

  if (!auth.isAuthenticated) return null;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1117' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? '64px' : '256px' }}>
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
