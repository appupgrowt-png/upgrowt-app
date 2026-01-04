import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

// Added missing MetricCard component definition
const MetricCard: React.FC<{ title: string; value: string; change: string; positive: boolean }> = ({ title, value, change, positive }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
    <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">{title}</h3>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-xs font-bold px-2 py-1 rounded ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {change}
      </span>
    </div>
  </div>
);

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'debug'>('metrics');
  const [localData, setLocalData] = useState<any>({});

  // Load all local storage data for debugging
  useEffect(() => {
    const data: any = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('upgrowt_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || '');
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    setLocalData(data);
  }, []);

  const handleNuke = () => {
    if (confirm('⚠️ PELIGRO: Esto borrará TODOS los datos locales y reiniciará la app. ¿Seguro?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c15] text-slate-300 font-sans">
      {/* Admin Header */}
      <div className="border-b border-white/5 bg-slate-900/50 px-8 py-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-center justify-center text-amber-500 font-bold text-xl">
            ⚡
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">UpGrowth God Mode</h1>
            <p className="text-xs text-amber-500 font-mono uppercase tracking-widest">Administrator Access</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onExit} className="text-xs">Volver a App</Button>
          <Button variant="secondary" onClick={handleNuke} className="bg-red-900/20 text-red-400 border-red-500/30 hover:bg-red-900/40">
            ☢️ Nuke Data
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/5 bg-slate-900/30 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'metrics' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'hover:bg-white/5'}`}
          >
            📊 SaaS Metrics
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'hover:bg-white/5'}`}
          >
            👥 Users (Mock)
          </button>
          <button 
            onClick={() => setActiveTab('debug')}
            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'debug' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'hover:bg-white/5'}`}
          >
            🐞 Local Debugger
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#0b0c15]">
          
          {activeTab === 'metrics' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-4 gap-6">
                <MetricCard title="MRR" value="$12,450" change="+15%" positive={true} />
                <MetricCard title="Active Users" value="1,240" change="+8%" positive={true} />
                <MetricCard title="Churn Rate" value="2.4%" change="-0.5%" positive={true} />
                <MetricCard title="Token Usage" value="$430" change="+12%" positive={false} />
              </div>

              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6 h-96 flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 flex items-end px-6 pb-6 gap-2 opacity-50">
                    {[40, 60, 45, 70, 85, 90, 80, 95, 100, 110, 105, 120].map((h, i) => (
                      <div key={i} className="flex-1 bg-amber-500/20 hover:bg-amber-500/40 transition-colors rounded-t-sm relative group" style={{ height: `${h * 2}px` }}>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          ${h * 100}
                        </div>
                      </div>
                    ))}
                 </div>
                 <h3 className="absolute top-6 left-6 text-slate-400 font-bold uppercase tracking-widest text-xs">Revenue Growth (YTD)</h3>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden animate-fade-in">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-900 border-b border-white/5 font-bold uppercase tracking-widest text-xs">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Last Active</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="p-4 text-white font-medium">User {i}</td>
                      <td className="p-4"><span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">Active</span></td>
                      <td className="p-4">Pro Plan</td>
                      <td className="p-4">{i * 12} mins ago</td>
                      <td className="p-4 text-primary-400 cursor-pointer hover:underline">View</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-4 animate-fade-in">
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
                 <p className="font-bold">⚠️ Debug Mode</p>
                 <p>Raw view of localStorage keys for this app.</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-xl border border-white/10 font-mono text-xs text-slate-400 overflow-x-auto">
                 <pre>{JSON.stringify(localData, null, 2)}</pre>
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};