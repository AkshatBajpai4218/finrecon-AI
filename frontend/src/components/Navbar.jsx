import { NavLink, Link } from 'react-router-dom';

const navItems = [
  { name: 'Upload & Ingest', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Exceptions', path: '/exceptions' },
  { name: 'AI Chat', path: '/chat' },
  { name: 'Reports', path: '/reports' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-800/80 text-white shadow-xl shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-base shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                FR
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                  FinRecon <span className="text-cyan-400 font-bold text-[11px] px-1.5 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/80">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono -mt-1">Financial Controller</span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800/90 text-cyan-400 shadow-inner border border-slate-700/80'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="font-mono text-[11px] font-semibold text-slate-300">Engine Active</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
