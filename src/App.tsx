import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './router';
import { ERPContext } from './hooks/useERPContext';
import { useERPStore } from './hooks/useERPStore';

declare const __BASE_PATH__: string;

export default function App() {
  const store = useERPStore();

  if (store.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <i className="ri-building-2-line text-white text-2xl"></i>
          </div>
          <div className="flex items-center gap-2">
            <i className="ri-loader-4-line animate-spin text-xl" style={{ color: '#f59e0b' }}></i>
            <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>Carregando BS LOJA...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ERPContext.Provider value={store}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AppRoutes />
      </BrowserRouter>
    </ERPContext.Provider>
  );
}
