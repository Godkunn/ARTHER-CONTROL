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

function MainContent() {
  const { activeTab } = useAether();

  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col selection:bg-aurora-cyan/30 selection:text-aurora-cyan">
      <Navbar />

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
