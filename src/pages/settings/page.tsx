import { useState } from 'react';
import ERPLayout from '@/components/feature/ERPLayout';
import { useERP } from '@/hooks/useERPContext';
import type { User, UserRole } from '@/types/erp';

const ROLES: UserRole[] = ['Administrador', 'Gerente', 'Vendedor', 'Caixa', 'Estoquista', 'Contador'];

const roleColors: Record<string, { bg: string; color: string }> = {
  'Administrador': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Gerente': { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6' },
  'Vendedor': { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Caixa': { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
  'Estoquista': { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  'Contador': { bg: 'rgba(20,184,166,0.12)', color: '#2dd4bf' },
};

const logTypeColors: Record<string, string> = {
  success: '#10b981', info: '#818cf8', warning: '#f59e0b', error: '#ef4444',
};

const INITIAL_COMPANY = {
  razaoSocial: 'BS LOJA',
  nomeFantasia: 'BS LOJA',
  cnpj: '',
  ie: '',
  regime: 'Simples Nacional',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  cep: '',
};

const INITIAL_SECURITY = [
  { key: 'lockout', label: 'Bloqueio após tentativas inválidas', desc: 'Bloquear conta após 5 tentativas falhas', enabled: true },
  { key: 'accesslog', label: 'Log de acessos', desc: 'Registrar todos os acessos ao sistema', enabled: true },
  { key: 'secalerts', label: 'Notificações de segurança', desc: 'Alertas por e-mail em acessos suspeitos', enabled: false },
];

type ModalMode = 'add' | 'edit' | 'password_admin' | 'password_self' | null;

export default function SettingsPage() {
  const { users, addUser, updateUser, deleteUser, changePassword, auditLogs, backups, createBackup, auth } = useERP();
  const [tab, setTab] = useState<'users' | 'logs' | 'backups' | 'general'>('users');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // User form
  const [form, setForm] = useState({ name: '', email: '', role: 'Vendedor' as UserRole, status: 'Ativo' as 'Ativo' | 'Inativo', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [security, setSecurity] = useState(INITIAL_SECURITY);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = auth.user?.role === 'Administrador';

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openAdd = () => {
    setSelectedUser(null);
    setForm({ name: '', email: '', role: 'Vendedor', status: 'Ativo', password: '', confirmPassword: '' });
    setFormError('');
    setModalMode('add');
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setForm({ name: u.name, email: u.email, role: u.role, status: u.status, password: '', confirmPassword: '' });
    setFormError('');
    setModalMode('edit');
  };

  const openPasswordAdmin = (u: User) => {
    setSelectedUser(u);
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwError('');
    setModalMode('password_admin');
  };

  const openPasswordSelf = () => {
    setSelectedUser(auth.user);
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwError('');
    setModalMode('password_self');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormError('');
    setPwError('');
  };

  const handleSaveUser = async () => {
    setFormError('');
    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios.');
      return;
    }

    if (modalMode === 'add') {
      if (!form.password) { setFormError('Defina uma senha para o usuário.'); return; }
      if (form.password.length < 6) { setFormError('A senha deve ter pelo menos 6 caracteres.'); return; }
      if (form.password !== form.confirmPassword) { setFormError('As senhas não coincidem.'); return; }

      setFormLoading(true);
      const result = await (addUser as (u: { name: string; email: string; role: string; password: string; status: 'Ativo' | 'Inativo' }) => Promise<{ success: boolean; error?: string }>)({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        status: form.status,
      });
      setFormLoading(false);

      if (!result.success) {
        setFormError(result.error || 'Erro ao criar usuário.');
        return;
      }
      showToast('Usuário criado com sucesso!');
    } else if (modalMode === 'edit' && selectedUser) {
      setFormLoading(true);
      await (updateUser as (id: string, data: Partial<{ name: string; email: string; role: string; status: 'Ativo' | 'Inativo' }>) => Promise<void>)(selectedUser.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
      });
      setFormLoading(false);
      showToast('Usuário atualizado com sucesso!');
    }

    closeModal();
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!pwForm.newPassword) { setPwError('Digite a nova senha.'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('As senhas não coincidem.'); return; }
    if (modalMode === 'password_self' && !pwForm.currentPassword) { setPwError('Digite sua senha atual.'); return; }

    setPwLoading(true);
    const isAdminReset = modalMode === 'password_admin';
    const result = await changePassword(
      selectedUser!.id,
      pwForm.newPassword,
      isAdminReset ? undefined : pwForm.currentPassword,
      isAdminReset
    );
    setPwLoading(false);

    if (!result.success) {
      setPwError(result.error || 'Erro ao alterar senha.');
      return;
    }

    showToast('Senha alterada com sucesso!');
    closeModal();
  };

  const handleDeleteUser = async (id: string) => {
    await (deleteUser as (id: string) => Promise<void>)(id);
    setDeleteConfirm(null);
    showToast('Usuário desativado.');
  };

  const toggleSecurity = (key: string) => {
    setSecurity(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <ERPLayout title="Configurações do Sistema" subtitle="Usuários, permissões, logs e backups">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 w-fit" style={{ background: '#1a1f2e' }}>
        {[
          { key: 'users', label: 'Usuários' },
          { key: 'logs', label: 'Logs de Auditoria' },
          { key: 'backups', label: 'Backups' },
          { key: 'general', label: 'Geral' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap transition-all"
            style={tab === t.key ? { background: '#f59e0b', color: '#000' } : { color: '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="flex flex-col gap-4">
          {/* My account password change */}
          <div className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                {auth.user?.avatar}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{auth.user?.name}</p>
                <p className="text-xs" style={{ color: '#6b7280' }}>{auth.user?.email} · {auth.user?.role}</p>
              </div>
            </div>
            <button onClick={openPasswordSelf}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              <i className="ri-lock-password-line"></i> Alterar minha senha
            </button>
          </div>

          {/* Users list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white font-semibold">Usuários do Sistema ({users.length})</p>
              {isAdmin && (
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                  style={{ background: '#f59e0b', color: '#000' }}>
                  <i className="ri-user-add-line"></i> Novo Usuário
                </button>
              )}
            </div>

            {users.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <i className="ri-team-line text-3xl" style={{ color: '#4b5563' }}></i>
                </div>
                <p className="text-white font-medium">Nenhum usuário cadastrado</p>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Adicione usuários para controlar o acesso ao sistema</p>
                {isAdmin && (
                  <button onClick={openAdd}
                    className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                    style={{ background: '#f59e0b', color: '#000' }}>
                    Adicionar usuário
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {['Usuário', 'E-mail', 'Perfil', 'Status', 'Último acesso', 'Ações'].map((h) => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: '#4b5563' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const rc = roleColors[u.role] || { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
                      const isSelf = auth.user?.id === u.id;
                      return (
                        <tr key={u.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                                style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>{u.avatar}</div>
                              <div>
                                <span className="text-sm font-medium text-white whitespace-nowrap">{u.name}</span>
                                {isSelf && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Você</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: '#6b7280' }}>{u.email}</td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                              style={{ background: rc.bg, color: rc.color }}>{u.role}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={u.status === 'Ativo'
                                ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                                : { background: 'rgba(107,114,128,0.12)', color: '#6b7280' }}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: '#4b5563' }}>
                            {u.lastLogin || '—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1">
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEdit(u)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                                    style={{ color: '#6b7280' }} title="Editar usuário"
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                    <i className="ri-edit-line text-sm"></i>
                                  </button>
                                  <button onClick={() => openPasswordAdmin(u)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                                    style={{ color: '#6b7280' }} title="Redefinir senha"
                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#818cf8'; }}
                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                    <i className="ri-lock-password-line text-sm"></i>
                                  </button>
                                  {!isSelf && (
                                    <button onClick={() => (updateUser as (id: string, data: Partial<{ name: string; email: string; role: string; status: 'Ativo' | 'Inativo' }>) => Promise<void>)(u.id, { status: u.status === 'Ativo' ? 'Inativo' : 'Ativo' })}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                                      style={{ color: '#6b7280' }} title={u.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f59e0b'; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                      <i className={`${u.status === 'Ativo' ? 'ri-toggle-fill' : 'ri-toggle-line'} text-sm`}></i>
                                    </button>
                                  )}
                                  {!isSelf && (
                                    <button onClick={() => setDeleteConfirm(u.id)}
                                      className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                                      style={{ color: '#6b7280' }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
                                      <i className="ri-delete-bin-line text-sm"></i>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-white font-semibold">Logs de Auditoria ({auditLogs.length})</p>
            <button onClick={() => showToast('CSV exportado com sucesso!')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
              <i className="ri-download-line"></i> Exportar CSV
            </button>
          </div>
          {auditLogs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-history-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum log registrado</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>As ações do sistema serão registradas aqui</p>
            </div>
          ) : (
            <div>
              {auditLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center gap-4 border-b transition-all"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: logTypeColors[log.type] || '#6b7280' }}></div>
                  <span className="text-xs whitespace-nowrap w-36 flex-shrink-0" style={{ color: '#6b7280' }}>{log.createdAt}</span>
                  <span className="text-sm font-medium text-white w-32 flex-shrink-0 truncate">{log.userName}</span>
                  <span className="text-sm flex-1" style={{ color: '#d1d5db' }}>{log.action}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md whitespace-nowrap"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{log.module}</span>
                  <span className="text-xs whitespace-nowrap hidden lg:block" style={{ color: '#4b5563' }}>{log.ip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BACKUPS TAB ── */}
      {tab === 'backups' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-white font-semibold">Backups do Sistema</p>
            <button onClick={() => { createBackup(); showToast('Backup criado com sucesso!'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
              style={{ background: '#f59e0b', color: '#000' }}>
              <i className="ri-save-line"></i> Backup Manual
            </button>
          </div>
          {backups.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl mx-auto mb-3"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <i className="ri-cloud-line text-3xl" style={{ color: '#4b5563' }}></i>
              </div>
              <p className="text-white font-medium">Nenhum backup realizado</p>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Clique em "Backup Manual" para criar o primeiro backup</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['Data/Hora', 'Tamanho', 'Tipo', 'Status', 'Ações'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: '#4b5563' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <td className="px-5 py-3 text-sm text-white whitespace-nowrap">{b.date}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{b.size}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{b.type}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{b.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => showToast('Download do backup iniciado!')}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs cursor-pointer whitespace-nowrap"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>
                            <i className="ri-download-line"></i> Baixar
                          </button>
                          <button onClick={() => showToast('Restauração iniciada com sucesso!')}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs cursor-pointer whitespace-nowrap"
                            style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                            <i className="ri-restart-line"></i> Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── GENERAL TAB ── */}
      {tab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white font-semibold mb-4">Dados da Empresa</p>
            {/* Logo preview */}
            <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-20 h-14 flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: '#141820' }}>
                <img
                  src="https://public.readdy.ai/ai/img_res/2c09a460-478e-48ed-a435-6d822ba2fe1f.png"
                  alt="Logo BS Materiais"
                  className="h-10 w-auto object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">BS LOJA</p>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>Logo atual do sistema</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Razão Social', key: 'razaoSocial' },
                { label: 'Nome Fantasia', key: 'nomeFantasia' },
                { label: 'CNPJ', key: 'cnpj', placeholder: '00.000.000/0001-00' },
                { label: 'Inscrição Estadual', key: 'ie' },
                { label: 'Regime Tributário', key: 'regime' },
                { label: 'E-mail', key: 'email', placeholder: 'contato@bsloja.com.br' },
                { label: 'Telefone', key: 'telefone', placeholder: '(00) 00000-0000' },
                { label: 'Endereço', key: 'endereco', placeholder: 'Rua, número, bairro' },
                { label: 'Cidade / Estado', key: 'cidade', placeholder: 'Cidade - UF' },
                { label: 'CEP', key: 'cep', placeholder: '00000-000' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>{f.label}</label>
                  <input
                    value={(company as Record<string, string>)[f.key]}
                    onChange={(e) => setCompany(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={(f as { label: string; key: string; placeholder?: string }).placeholder || ''}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}
                  />
                </div>
              ))}
              <button onClick={() => showToast('Dados da empresa salvos!')}
                className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap w-fit"
                style={{ background: '#f59e0b', color: '#000' }}>
                Salvar Alterações
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-white font-semibold mb-4">Segurança</p>
            <div className="flex flex-col gap-4">
              {security.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{s.desc}</p>
                  </div>
                  <button onClick={() => toggleSecurity(s.key)}
                    className="w-11 h-6 rounded-full relative cursor-pointer flex-shrink-0 transition-all"
                    style={{ background: s.enabled ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}>
                    <div className="w-4 h-4 rounded-full absolute top-1 transition-all"
                      style={{ background: 'white', left: s.enabled ? '24px' : '4px' }}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT USER MODAL ── */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">
                {modalMode === 'add' ? 'Novo Usuário' : 'Editar Usuário'}
              </h3>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Nome Completo *</label>
                <input type="text" placeholder="Nome do usuário" value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>E-mail *</label>
                <input type="email" placeholder="email@empresa.com.br" value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Perfil de Acesso</label>
                <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Status</label>
                <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as 'Ativo' | 'Inativo' }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }}>
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </div>

              {modalMode === 'add' && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Senha *</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password}
                        onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full px-3 pr-10 py-2.5 rounded-lg text-sm outline-none"
                        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        style={{ color: '#6b7280' }}>
                        <i className={`${showPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Confirmar Senha *</label>
                    <input type={showPw ? 'text' : 'password'} placeholder="Repita a senha" value={form.confirmPassword}
                      onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  </div>
                </>
              )}

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <i className="ri-error-warning-line text-sm" style={{ color: '#ef4444' }}></i>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{formError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleSaveUser} disabled={formLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: formLoading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                {formLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i> Salvando...
                  </span>
                ) : modalMode === 'add' ? 'Criar Usuário' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHANGE PASSWORD MODAL ── */}
      {(modalMode === 'password_admin' || modalMode === 'password_self') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {modalMode === 'password_admin' ? 'Redefinir Senha' : 'Alterar Minha Senha'}
                </h3>
                {selectedUser && (
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {modalMode === 'password_admin' ? `Usuário: ${selectedUser.name}` : selectedUser.email}
                  </p>
                )}
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                style={{ color: '#6b7280' }}>
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {modalMode === 'password_self' && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Senha Atual *</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} placeholder="Sua senha atual" value={pwForm.currentPassword}
                      onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                      className="w-full px-3 pr-10 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: '#6b7280' }}>
                      <i className={`${showPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Nova Senha *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={pwForm.newPassword}
                    onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full px-3 pr-10 py-2.5 rounded-lg text-sm outline-none"
                    style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
                  {modalMode === 'password_admin' && (
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ color: '#6b7280' }}>
                      <i className={`${showPw ? 'ri-eye-off-line' : 'ri-eye-line'} text-sm`}></i>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#6b7280' }}>Confirmar Nova Senha *</label>
                <input type={showPw ? 'text' : 'password'} placeholder="Repita a nova senha" value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d5db' }} />
              </div>

              {pwError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <i className="ri-error-warning-line text-sm" style={{ color: '#ef4444' }}></i>
                  <p className="text-xs" style={{ color: '#ef4444' }}>{pwError}</p>
                </div>
              )}

              {modalMode === 'password_admin' && (
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Como administrador, você pode redefinir a senha sem precisar da senha atual.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={handleChangePassword} disabled={pwLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: pwLoading ? 'rgba(245,158,11,0.5)' : '#f59e0b', color: '#000' }}>
                {pwLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin"></i> Alterando...
                  </span>
                ) : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm text-center"
            style={{ background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.12)' }}>
              <i className="ri-delete-bin-line text-2xl" style={{ color: '#ef4444' }}></i>
            </div>
            <p className="text-white font-bold text-lg mb-1">Desativar usuário?</p>
            <p className="text-sm mb-5" style={{ color: '#6b7280' }}>
              O usuário será desativado e não poderá mais acessar o sistema.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>Cancelar</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                style={{ background: '#ef4444', color: '#fff' }}>Desativar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{ background: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white' }}>
          <div className="w-5 h-5 flex items-center justify-center">
            <i className={toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'}></i>
          </div>
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}
    </ERPLayout>
  );
}
