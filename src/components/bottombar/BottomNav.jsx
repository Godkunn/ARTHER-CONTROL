// src/components/bottombar/BottomNav.jsx
import React from 'react';
import { useAether } from '../../context/AetherContext';
import { Home, Monitor, Bell, AppWindow, Folder, Shield, Radio } from 'lucide-react';

export default function BottomNav() {
  const { activeTab, setActiveTab, systemStatus } = useAether();
  const pendingCount = systemStatus.pendingApprovals?.length || 0;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'desktop', label: 'Screen', icon: Monitor },
    { id: 'approvals', label: 'Approve', icon: Bell, badge: pendingCount },
    { id: 'apps', label: 'Apps', icon: AppWindow },
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'nearby', label: 'Nearby', icon: Radio },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#090d16] border-t border-obsidian-750 px-1 py-1.5 flex items-center justify-around shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 ${
              isActive ? 'text-aurora-cyan scale-105' : 'text-titanium-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <span className="absolute inset-0 bg-aurora-cyan/15 rounded-xl border border-aurora-cyan/30" />
            )}
            <div className="relative">
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-aurora-cyan' : ''}`} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-obsidian-950 animate-pulse">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-mono ${isActive ? 'font-bold text-aurora-cyan' : ''}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
