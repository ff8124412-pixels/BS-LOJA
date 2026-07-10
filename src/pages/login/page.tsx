import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERP } from '@/hooks/useERPContext';
import { ROLE_HOME } from '@/utils/permissions';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { login } = useERP();
  const navigate = useNavigate();

  // Setup state (first time — no users)
  const [mode, setMode] = useState<'checking' | 'setup' | 'login'>('checking');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Setup form
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [showSetupPass, setShowSetupPass] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Check if any user exists
  useEffect(() => {
    const check = async () => {
      const { data, error } = await supabase.functions.invoke('erp-auth', {
        body: { action: 'bootstrap_status' },
      });

      if (error || data?.error) {
        setError(data?.error || 'Erro ao verificar usuários cadastrados.');
        setMode('login');
        return;
      }

      setMode(data?.hasUsers ? 'login' : 'setup');
    };
    check();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: fnError } = await supabase.functions.invoke('erp-auth', {
      body: { action: 'login', email, password },
    });

    if (fnError || data?.error) {
      setError(data?.error || 'Erro ao conectar. Tente novamente.');
      setLoading(false);
      return;
    }

    const user = data.user;
    login(user);
    navigate(ROLE_HOME[user.role as keyof typeof ROLE_HOME] ?? '/');
    setLoading(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (!setupName.trim() || !setupEmail.trim() || !setupPassword) {
      setSetupError('Preencha todos os campos.');
      return;
    }
    if (setupPassword.length < 6) {
      setSetupError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError('As senhas não coincidem.');
      return;
    }

    setSetupLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('erp-auth', {
      body: { action: 'setup_admin', name: setupName.trim(), email: setupEmail.trim(), password: setupPassword },
    });

    if (fnError || data?.error) {
      setSetupError(data?.error || 'Erro ao criar administrador.');
      setSetupLoading(false);
      return;
    }

    // Auto login
    login(data.user);
    navigate('/');
    setSetupLoading(false);
  };

  if (mode === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <div className="flex items-center gap-3">
          <i className="ri-loader-4-line animate-spin text-xl" style={{ color: '#f59e0b' }}></i>
          <span className="text-sm" style={{ color: '#9ca3af' }}>Verificando sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1117' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1208 0%, #2d1f00 50%, #1a1208 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 20%, #d97706 0%, transparent 40%)' }}></div>
        <div className="relative z-10">
          {/* Logo real */}
          <div className="mb-16">
            <img
              src="https://public.readdy.ai/ai/img_res/2c09a460-478e-48ed-a435-6d822ba2fe1f.png"
              alt="BS Materiais de Construção"
              className="h-16 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Sistema de Gestão<br />
              <span style={{ color: '#f59e0b' }}>Empresarial</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: '#9ca3af' }}>
              Controle total sobre vendas, estoque, financeiro e fiscal da sua empresa em um único lugar.
            </p>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: 'ri-shield-check-line', label: 'Segurança LGPD', desc: 'Dados protegidos' },
            { icon: 'ri-cloud-line', label: 'Nuvem + Offline', desc: 'Sempre disponível' },
            { icon: 'ri-file-text-line', label: 'NF-e & NFC-e', desc: 'Integrado SEFAZ' },
            { icon: 'ri-bar-chart-2-line', label: 'Relatórios', desc: 'PDF, Excel, CSV' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)' }}>
                <i className={`${f.icon} text-sm`} style={{ color: '#f59e0b' }}></i>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{f.label}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <img
              src="https://public.readdy.ai/ai/img_res/2c09a460-478e-48ed-a435-6d822ba2fe1f.png"
              alt="BS Materiais de Construção"
              className="h-14 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>

          {/* ── SETUP MODE ── */}
          {mode === 'setup' && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mb-4"
                  style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <i className="ri-settings-3-line text-2xl" style={{ color: '#f59e0b' }}></i>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">Configuração Inicial</h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Crie o primeiro administrador do sistema para começar.
                </p>
              </div>

              <form onSubmit={handleSetup} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>NOME COMPLETO</label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>E-MAIL</label>
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="admin@suaempresa.com.br"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>SENHA</label>
                  <div className="relative">
                    <input
                      type={showSetupPass ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-4 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                    <button type="button" onClick={() => setShowSetupPass(!showSetupPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer"
                      style={{ color: '#6b7280' }}>
                      <i className={`${showSetupPass ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>CONFIRMAR SENHA</label>
                  <input
                    type={showSetupPass ? 'text' : 'password'}
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  />
                </div>

                {setupError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <i className="ri-error-warning-line text-sm" style={{ color: '#ef4444' }}></i>
                    </div>
                    <p className="text-xs" style={{ color: '#ef4444' }}>{setupError}</p>
                  </div>
                )}

                <button type="submit" disabled={setupLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all mt-1"
                  style={{ background: setupLoading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                  {setupLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i> Criando administrador...
                    </span>
                  ) : 'Criar Administrador e Entrar'}
                </button>
              </form>
            </>
          )}

          {/* ── LOGIN MODE ── */}
          {mode === 'login' && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1">Bem-vindo de volta</h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>Acesse o sistema com suas credenciais</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>E-MAIL</label>
                  <div className="relative">
                    <div className="w-4 h-4 flex items-center justify-center absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#6b7280' }}>
                      <i className="ri-mail-line text-sm"></i>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com.br"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: '#9ca3af' }}>SENHA</label>
                  <div className="relative">
                    <div className="w-4 h-4 flex items-center justify-center absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: '#6b7280' }}>
                      <i className="ri-lock-line text-sm"></i>
                    </div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-10 pr-12 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(245,158,11,0.5)'; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center cursor-pointer"
                      style={{ color: '#6b7280' }}>
                      <i className={`${showPass ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <i className="ri-error-warning-line text-sm" style={{ color: '#ef4444' }}></i>
                    </div>
                    <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap transition-all mt-1"
                  style={{ background: loading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin"></i> Verificando...
                    </span>
                  ) : 'Entrar no Sistema'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
