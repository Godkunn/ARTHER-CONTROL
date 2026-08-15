// src/App.jsx
import React from 'react';
import { AetherProvider, useAether } from './context/AetherContext';
import Navbar from './components/navbar/Navbar';
import BottomNav from './components/bottombar/BottomNav';
import Dashboard from './components/dashboard/Dashboard';
import DesktopViewer from './components/desktop/DesktopViewer';
import ApprovalCenter from './components/approvals/ApprovalCenter';
import SmartApps from './components/smartapps/SmartApps';
import FileManager from './components/files/FileManager';
import SecurityAudit from './components/security/SecurityAudit';
import PairingModal from './components/security/PairingModal';
import NearbyMode from './components/nearby/NearbyMode';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("View Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 rounded-xl bg-red-950/40 border border-red-500/40 text-center space-y-3">
          <p className="text-sm font-mono font-bold text-red-400">View encountered an issue</p>
          <p className="text-xs font-mono text-slate-300">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 rounded-lg bg-aurora-cyan/20 border border-aurora-cyan text-aurora-cyan text-xs font-mono font-bold"
          >
            Retry View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobalApprovalBanner() {
  const { systemStatus, resolveApproval, setActiveTab, activeTab } = useAether();
  const pending = systemStatus.pendingApprovals || [];
  if (pending.length === 0 || activeTab === 'approvals') return null;

  const top = pending[0];
  const primaryAction = top.actions?.find(a => a.type === 'primary') || top.actions?.[0] || { id: 'allow', label: 'Allow' };
  const dangerAction = top.actions?.find(a => a.type === 'danger') || top.actions?.[top.actions.length - 1] || { id: 'deny', label: 'Deny' };

  return (
    <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-b border-amber-500/40 px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold text-amber-300 truncate">
            🔔 {top.app}: {top.title}
          </p>
          <p className="text-[9px] font-mono text-titanium-300 truncate">
            {top.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => resolveApproval(top.id, primaryAction)}
          className="px-2.5 py-1 rounded bg-aurora-emerald text-obsidian-950 text-[10px] font-mono font-bold hover:bg-emerald-400 transition"
        >
          {primaryAction.label?.replace(/^[0-9]\.\s*/, '') || 'Allow'}
        </button>
        <button
          onClick={() => resolveApproval(top.id, dangerAction)}
          className="px-2 py-1 rounded bg-obsidian-800 border border-obsidian-700 text-titanium-400 hover:text-red-400 text-[10px] font-mono font-bold transition"
        >
          {dangerAction.label?.replace(/^[0-9]\.\s*/, '') || 'Deny'}
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className="px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold"
        >
          All ({pending.length})
        </button>
      </div>
    </div>
  );
}

function MainContent() {
  const { activeTab } = useAether();

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col selection:bg-aurora-cyan/30 selection:text-aurora-cyan">
      <Navbar />
      <GlobalApprovalBanner />

      <main className="flex-1 overflow-y-auto">
        <ErrorBoundary key={activeTab}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'desktop' && <DesktopViewer />}
          {activeTab === 'approvals' && <ApprovalCenter />}
          {activeTab === 'apps' && <SmartApps />}
          {activeTab === 'files' && <FileManager />}
          {(activeTab === 'security' || activeTab === 'telemetry') && <SecurityAudit />}
          {activeTab === 'nearby' && <NearbyMode />}
        </ErrorBoundary>
      </main>

      <BottomNav />
      <PairingModal />
    </div>
  );
}

export default function App() {
  return (
    <AetherProvider>
      <MainContent />
    </AetherProvider>
  );
}
