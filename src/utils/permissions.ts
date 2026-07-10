import type { UserRole } from '@/types/erp';

// Mapa de rotas permitidas por perfil
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Administrador: ['/', '/pdv', '/sales', '/inventory', '/clients', '/suppliers', '/billing', '/receivable', '/payable', '/cashflow', '/accounting', '/reports', '/settings', '/quotes', '/commissions', '/goals', '/purchases'],
  Gerente:       ['/', '/pdv', '/sales', '/inventory', '/clients', '/suppliers', '/billing', '/receivable', '/payable', '/cashflow', '/accounting', '/reports', '/settings', '/quotes', '/commissions', '/goals', '/purchases'],
  Vendedor:      ['/', '/pdv', '/sales', '/clients', '/reports', '/quotes', '/goals'],
  Caixa:         ['/', '/pdv', '/sales'],
  Estoquista:    ['/', '/inventory', '/suppliers', '/purchases'],
  Contador:      ['/accounting', '/reports', '/commissions', '/sales', '/finance', '/receivable', '/payable', '/cashflow'],
};

export function canAccess(role: UserRole, path: string): boolean {
  const allowed = ROLE_PERMISSIONS[role] ?? [];
  return allowed.includes(path);
}

// Rota inicial após login por perfil
export const ROLE_HOME: Record<UserRole, string> = {
  Administrador: '/',
  Gerente:       '/',
  Vendedor:      '/',
  Caixa:         '/pdv',
  Estoquista:    '/inventory',
  Contador:      '/accounting',
};
