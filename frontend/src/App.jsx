import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ExceptionsPage from './pages/ExceptionsPage';
import ExceptionDetailPage from './pages/ExceptionDetailPage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage';
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/exceptions" element={<ExceptionsPage />} />
              <Route path="/exceptions/:txnId" element={<ExceptionDetailPage />} />
              <Route path="/transactions/:id" element={<ExceptionDetailPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* Fallback 404 route */}
              <Route
                path="*"
                element={
                  <div className="text-center py-20 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 my-8">
                    <h1 className="text-4xl font-black text-white mb-2 font-mono">404</h1>
                    <p className="text-slate-400 text-sm mb-6">Resource or page not found</p>
                    <Link
                      to="/dashboard"
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                    >
                      Return to Dashboard →
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
