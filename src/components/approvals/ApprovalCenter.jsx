// src/components/approvals/ApprovalCenter.jsx
import React, { useState } from 'react';
import { useAether } from '../../context/AetherContext';
import { Bell, Check, X, ShieldAlert, AlertTriangle, Layers, History, Sparkles, Code2, Terminal } from 'lucide-react';

export default function ApprovalCenter() {
  const { systemStatus, resolveApproval, triggerTestApproval } = useAether();
  const pendingApprovals = systemStatus.pendingApprovals || [];
  const approvalHistory = systemStatus.approvalHistory || [];

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'danger':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-aurora-pink/20 text-aurora-pink border border-aurora-pink/40">CRITICAL</span>;
      case 'high':
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-aurora-amber/20 text-aurora-amber border border-aurora-amber/40">HIGH PRIORITY</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40">NORMAL</span>;
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* Header & Tabs */}
      <div className="glass-panel p-4 rounded-2xl border border-obsidian-750 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-aurora-amber/20 border border-aurora-amber/40 text-aurora-amber shadow-glow-amber">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
              <span>Agent Approval Relay Center</span>
              {pendingApprovals.length > 0 && (
                <span className="bg-aurora-pink text-white font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                  {pendingApprovals.length} PENDING
                </span>
              )}
            </h2>
            <p className="text-xs text-titanium-400 font-mono">
              Remote permission inbox for Antigravity & Codex requests
            </p>
          </div>
        </div>

        <button
          onClick={() => triggerTestApproval('Antigravity IDE')}
          className="px-3 py-1.5 rounded-xl bg-aurora-cyan/20 border border-aurora-cyan/40 text-aurora-cyan font-mono text-xs font-bold hover:bg-aurora-cyan/30 transition"
        >
          + Test Prompt
        </button>
      </div>

      {/* Segment Selector Tabs */}
      <div className="flex bg-obsidian-900/80 p-1 rounded-xl border border-obsidian-750 max-w-xs">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'pending' ? 'bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40' : 'text-titanium-400'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Pending ({pendingApprovals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'history' ? 'bg-aurora-cyan/20 text-aurora-cyan border border-aurora-cyan/40' : 'text-titanium-400'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({approvalHistory.length})</span>
        </button>
      </div>

      {/* PENDING APPROVALS LIST */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border border-obsidian-750 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-obsidian-900 border border-obsidian-750 flex items-center justify-center mx-auto text-aurora-emerald">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200">No Pending Approvals</h3>
              <p className="text-xs text-titanium-400 font-mono max-w-md mx-auto">
                Your remote permission inbox is clean. Laptop is executing seamlessly. Antigravity/Codex prompts will trigger instant phone notifications here.
              </p>
            </div>
          ) : (
            pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="glass-panel p-5 rounded-2xl border-2 border-aurora-amber bg-gradient-to-br from-obsidian-900 to-obsidian-950 space-y-4 shadow-glow-amber animate-pulse-fast"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-aurora-amber/20 border border-aurora-amber/40 text-aurora-amber">
                      {approval.app.includes('Antigravity') ? <Code2 className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-aurora-cyan font-mono uppercase">{approval.app}</span>
                        {getSeverityBadge(approval.severity)}
                      </div>
                      <h3 className="text-base font-bold text-slate-100">{approval.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-titanium-400">{approval.timestamp}</span>
                </div>

                {/* Description */}
                <div className="bg-obsidian-950/90 p-3 rounded-xl border border-obsidian-800 text-xs font-mono text-slate-200 space-y-2">
                  <p>{approval.description}</p>
                  <div className="text-[10px] text-titanium-400 flex items-center space-x-1.5 pt-1 border-t border-obsidian-800">
                    <Layers className="w-3 h-3 text-aurora-cyan" />
                    <span>Resolution Hierarchy: Level 1 (Windows UI Automation ID target)</span>
                  </div>
                </div>

                {/* Mock Screenshot Snippet Crop Preview */}
                <div className="p-3 bg-black/60 rounded-xl border border-obsidian-800 space-y-1">
                  <span className="text-[10px] font-mono text-titanium-400 uppercase">Dialog Context Screenshot Preview:</span>
                  <div className="p-3 bg-obsidian-900 border border-aurora-cyan/30 rounded-lg flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-aurora-amber" />
                      <span className="text-slate-200 font-bold">{approval.app}: "Allow command execution?"</span>
                    </div>
                    <span className="text-aurora-cyan text-[10px]">Button target: [ {approval.targetButton?.label || 'Approve'} ]</span>
                  </div>
                </div>

                {/* Action Buttons: Dynamic Multi-Option Decision Choices (1-2-3-4-5) */}
                <div className="space-y-2 pt-2 border-t border-obsidian-800">
                  <div className="text-[10px] font-mono text-titanium-400 flex items-center justify-between pb-1">
                    <span>AVAILABLE CHOICES ({Array.isArray(approval.actions) ? approval.actions.length : 0})</span>
                    <span className="text-aurora-cyan">Tap an option to dispatch</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {Array.isArray(approval.actions) && approval.actions.map((act, idx) => {
                      const label = typeof act === 'object' ? act.label : act;
                      const isFirst = idx === 0;
                      const isLast = idx === approval.actions.length - 1;
                      const isDanger = (typeof act === 'object' && act.type === 'danger') || label.toLowerCase().includes('no') || label.toLowerCase().includes('reject') || label.toLowerCase().includes('deny') || label.toLowerCase().includes('discard');
                      const isPrimary = (typeof act === 'object' && act.type === 'primary') || (isFirst && !isDanger);

                      if (isPrimary) {
                        return (
                          <button
                            key={idx}
                            onClick={() => resolveApproval(approval.id, act)}
                            className="w-full px-4 py-3 rounded-xl bg-aurora-emerald/20 hover:bg-aurora-emerald/30 border-2 border-aurora-emerald text-emerald-300 font-mono font-bold text-xs shadow-glow-emerald transition flex items-center justify-between group text-left"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-aurora-emerald text-obsidian-950 flex items-center justify-center text-[11px] font-bold shrink-0">{idx + 1}</span>
                              <span>{label}</span>
                            </div>
                            <Check className="w-4 h-4 text-aurora-emerald shrink-0 opacity-80 group-hover:scale-110 transition" />
                          </button>
                        );
                      } else if (isDanger || isLast) {
                        return (
                          <button
                            key={idx}
                            onClick={() => resolveApproval(approval.id, act)}
                            className="w-full px-4 py-3 rounded-xl bg-obsidian-900/90 hover:bg-aurora-pink/20 border border-obsidian-700 hover:border-aurora-pink/60 text-slate-300 hover:text-aurora-pink font-mono text-xs transition flex items-center justify-between group text-left"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-obsidian-800 border border-obsidian-700 text-aurora-pink flex items-center justify-center text-[11px] font-bold shrink-0">{idx + 1}</span>
                              <span>{label}</span>
                            </div>
                            <X className="w-4 h-4 text-aurora-pink shrink-0 opacity-80 group-hover:scale-110 transition" />
                          </button>
                        );
                      } else {
                        return (
                          <button
                            key={idx}
                            onClick={() => resolveApproval(approval.id, act)}
                            className="w-full px-4 py-3 rounded-xl bg-obsidian-900 hover:bg-aurora-cyan/15 border border-obsidian-750 hover:border-aurora-cyan/50 text-slate-200 hover:text-aurora-cyan text-xs font-mono transition flex items-center justify-between group text-left"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-obsidian-800 border border-obsidian-700 text-aurora-cyan flex items-center justify-center text-[11px] font-bold shrink-0">{idx + 1}</span>
                              <span>{label}</span>
                            </div>
                            <span className="text-[10px] text-titanium-500 font-mono group-hover:text-aurora-cyan">Select →</span>
                          </button>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* APPROVAL AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {approvalHistory.map((item) => (
            <div key={item.id} className="glass-card p-3.5 rounded-xl border border-obsidian-750 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${item.status?.includes('APPROVED') ? 'bg-aurora-emerald/10 border border-aurora-emerald/30 text-aurora-emerald' : 'bg-aurora-pink/10 border border-aurora-pink/30 text-aurora-pink'}`}>
                  {item.status?.includes('APPROVED') ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.app}: {item.title}</h4>
                  <p className="text-[10px] font-mono text-titanium-400">
                    Option selected: <span className="text-aurora-cyan font-bold">{item.selectedOption || item.status}</span> • Resolved by: {item.resolvedBy} • {item.timestamp}
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                item.status?.includes('APPROVED') ? 'bg-aurora-emerald/20 text-aurora-emerald border-aurora-emerald/40' : 'bg-aurora-pink/20 text-aurora-pink border-aurora-pink/40'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
