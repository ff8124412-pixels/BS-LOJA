import { NavLink, useLocation } from 'react-router-dom';
import { useERP } from '@/hooks/useERPContext';
import { canAccess } from '@/utils/permissions';
import type { UserRole } from '@/types/erp';

interface NavItem { path: string; label: string; icon: string; }
interface NavGroup { label: string; items: NavItem[]; }

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { path: '/', label: 'Dashboard', icon: 'ri-dashboard-3-line' },
      { path: '/pdv', label: 'PDV — Ponto de Venda', icon: 'ri-store-3-line' },
      { path: '/sales', label: 'Vendas & Pedidos', icon: 'ri-shopping-cart-2-line' },
      { path: '/inventory', label: 'Gestão de Estoque', icon: 'ri-archive-stack-line' },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { path: '/clients', label: 'Clientes', icon: 'ri-user-3-line' },
      { path: '/suppliers', label: 'Fornecedores', icon: 'ri-store-2-line' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { path: '/billing', label: 'Faturamento (NF-e)', icon: 'ri-file-text-line' },
      { path: '/receivable', label: 'Contas a Receber', icon: 'ri-arrow-up-circle-line' },
      { path: '/payable', label: 'Contas a Pagar', icon: 'ri-arrow-down-circle-line' },
      { path: '/cashflow', label: 'Fluxo de Caixa', icon: 'ri-line-chart-line' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { path: '/quotes', label: 'Orçamentos & Propostas', icon: 'ri-file-list-3-line' },
      { path: '/purchases', label: 'Pedidos de Compra', icon: 'ri-shopping-bag-3-line' },
      { path: '/goals', label: 'Metas de Vendas', icon: 'ri-flag-2-line' },
      { path: '/commissions', label: 'Comissões', icon: 'ri-user-star-line' },
    ],
  },
  {
    label: 'Contábil',
    items: [
      { path: '/accounting', label: 'Contabilidade & Relatórios', icon: 'ri-file-chart-line' },
      { path: '/reports', label: 'Relatórios & Análises', icon: 'ri-bar-chart-2-line' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { path: '/settings', label: 'Configurações', icon: 'ri-settings-4-line' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export default function Sidebar({ collapsed, onToggle, onLogout }: SidebarProps) {
  const location = useLocation();
  const { auth, pendingSales, criticalStockProducts } = useERP();
  const user = auth.user;
  const role = user?.role as UserRole | undefined;

  const getBadge = (path: string) => {
    if (path === '/sales') return pendingSales.length > 0 ? pendingSales.length : undefined;
    if (path === '/inventory') return criticalStockProducts.length > 0 ? criticalStockProducts.length : undefined;
    return undefined;
  };

  // Filtra grupos e itens pelo perfil do usuário
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => role ? canAccess(role, item.path) : false),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ background: '#141820', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {collapsed ? (
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <img
              src="https://public.readdy.ai/ai/img_res/2c09a460-478e-48ed-a435-6d822ba2fe1f.png"
              alt="BS Materiais"
              className="w-9 h-9 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src="https://public.readdy.ai/ai/img_res/2c09a460-478e-48ed-a435-6d822ba2fe1f.png"
              alt="BS Materiais de Construção"
              className="h-10 w-auto object-contain flex-shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        )}
      </div>

      {/* User */}
      {user && (
        !collapsed ? (
          <div className="mx-3 mt-4 mb-2 p-3 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{user.avatar}</div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold leading-tight truncate">{user.name}</p>
                <p className="text-xs leading-tight" style={{ color: '#6b7280' }}>{user.role}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mt-4 mb-2 flex-shrink-0">
            <div className="w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{user.avatar}</div>
          </div>
        )
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="text-xs font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: '#4b5563' }}>
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = item.path === '/' ? location.pathname === '/' : location.pathname === item.path;
              const badge = getBadge(item.path);
              return (
                <NavLink key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 cursor-pointer relative group ${collapsed ? 'justify-center' : ''}`}
                  style={isActive ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b' } : { color: '#6b7280' }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#d1d5db'; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; } }}>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#f59e0b' }}></span>}
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <i className={`${item.icon} text-sm`}></i>
                  </div>
                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">{item.label}</span>
                      {badge !== undefined && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: 'white' }}>{badge}</span>
                      )}
                    </>
                  )}
                  {collapsed && badge !== undefined && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#ef4444' }}></span>
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium"
                        style={{ background: '#0f1117', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                        {item.label}
                        {badge !== undefined && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#ef4444', color: 'white' }}>{badge}</span>
                        )}
                      </div>
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: '5px solid rgba(255,255,255,0.1)' }}></div>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={onToggle}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${collapsed ? 'justify-center' : ''}`}
          style={{ color: '#6b7280' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#d1d5db'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <i className={`${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-left-s-line'} text-base`}></i>
          </div>
          {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Recolher menu</span>}
        </button>
        <button onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer mt-0.5 ${collapsed ? 'justify-center' : ''}`}
          style={{ color: '#6b7280' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}>
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <i className="ri-logout-box-r-line text-base"></i>
          </div>
          {!collapsed && <span className="text-sm font-medium whitespace-nowrap">Sair do sistema</span>}
        </button>
      </div>
    </aside>
  );
}
