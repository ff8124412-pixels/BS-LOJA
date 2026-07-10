import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import { useERP } from "@/hooks/useERPContext";
import { canAccess, ROLE_HOME } from "@/utils/permissions";
import type { UserRole } from "@/types/erp";
import NotFound from "../pages/NotFound";
import LoginPage from "../pages/login/page";
import HomePage from "../pages/home/page";
import InventoryPage from "../pages/inventory/page";
import SalesPage from "../pages/sales/page";
import PDVPage from "../pages/pdv/page";
import ClientsPage from "../pages/clients/page";
import SuppliersPage from "../pages/suppliers/page";
import BillingPage from "../pages/billing/page";
import ReceivablePage from "../pages/finance/receivable/page";
import PayablePage from "../pages/finance/payable/page";
import CashFlowPage from "../pages/finance/cashflow/page";
import AccountingPage from "../pages/accounting/page";
import SettingsPage from "../pages/settings/page";
import ReportsPage from "../pages/reports/page";
import QuotesPage from "../pages/quotes/page";
import CommissionsPage from "../pages/commissions/page";
import GoalsPage from "../pages/goals/page";
import PurchasesPage from "../pages/purchases/page";

// Rota privada: verifica autenticação + permissão de perfil
function PrivateRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { auth } = useERP();

  if (!auth.isAuthenticated) return <Navigate to="/login" replace />;

  const role = auth.user?.role as UserRole;
  if (!canAccess(role, path)) {
    const home = ROLE_HOME[role] ?? '/';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <PrivateRoute path="/"><HomePage /></PrivateRoute> },
  { path: "/pdv", element: <PrivateRoute path="/pdv"><PDVPage /></PrivateRoute> },
  { path: "/inventory", element: <PrivateRoute path="/inventory"><InventoryPage /></PrivateRoute> },
  { path: "/sales", element: <PrivateRoute path="/sales"><SalesPage /></PrivateRoute> },
  { path: "/clients", element: <PrivateRoute path="/clients"><ClientsPage /></PrivateRoute> },
  { path: "/suppliers", element: <PrivateRoute path="/suppliers"><SuppliersPage /></PrivateRoute> },
  { path: "/billing", element: <PrivateRoute path="/billing"><BillingPage /></PrivateRoute> },
  { path: "/receivable", element: <PrivateRoute path="/receivable"><ReceivablePage /></PrivateRoute> },
  { path: "/payable", element: <PrivateRoute path="/payable"><PayablePage /></PrivateRoute> },
  { path: "/cashflow", element: <PrivateRoute path="/cashflow"><CashFlowPage /></PrivateRoute> },
  { path: "/accounting", element: <PrivateRoute path="/accounting"><AccountingPage /></PrivateRoute> },
  { path: "/reports", element: <PrivateRoute path="/reports"><ReportsPage /></PrivateRoute> },
  { path: "/quotes", element: <PrivateRoute path="/quotes"><QuotesPage /></PrivateRoute> },
  { path: "/commissions", element: <PrivateRoute path="/commissions"><CommissionsPage /></PrivateRoute> },
  { path: "/goals", element: <PrivateRoute path="/goals"><GoalsPage /></PrivateRoute> },
  { path: "/purchases", element: <PrivateRoute path="/purchases"><PurchasesPage /></PrivateRoute> },
  { path: "/settings", element: <PrivateRoute path="/settings"><SettingsPage /></PrivateRoute> },
  { path: "*", element: <NotFound /> },
];

export default routes;
