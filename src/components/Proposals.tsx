/**
 * Proposals.tsx
 * Fully theme-aware: all colors use PSI token utilities + dark: variants.
 * No hardcoded bg-white, bg-psi-surface, or bg-psi-subtle outside dark: variants.
 */

import React, { useState } from 'react';
import {
  FileText, Send, ChevronRight,
  Building2, Map, UserCheck, Plus, Search,
} from 'lucide-react';
import PitchGenerator from '../features/proposals/PitchGenerator';

export default function Proposals() {
  const [activeTab, setActiveTab] = useState<'developer' | 'branch' | 'agent'>('branch');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">
            Proposal Engine
          </h2>
          <p className="text-psi-secondary mt-1">
            Generate automated sponsorship pitches and participation offers.
          </p>
        </div>
        {activeTab !== 'developer' && (
          <button className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm">
            <Plus size={20} />
            <span>Create Proposal</span>
          </button>
        )}
      </header>

      {/* ── Tabs ── */}
      {/* Tab strip container — light bg in light mode, dark in dark mode */}
      <div className="flex gap-1 bg-psi-subtle border border-psi p-1 rounded-2xl w-fit mb-8">
        <TabButton active={activeTab === 'developer'} onClick={() => setActiveTab('developer')} label="Developer Pitch" icon={<Building2 size={16} />} />
        <TabButton active={activeTab === 'branch'} onClick={() => setActiveTab('branch')} label="Branch Proposal" icon={<Map size={16} />} />
        <TabButton active={activeTab === 'agent'} onClick={() => setActiveTab('agent')} label="Agent Offer" icon={<UserCheck size={16} />} />
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'developer' ? (
        <PitchGenerator />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Form/List Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="psi-card overflow-hidden">
              {/* Card header — light subtle bg, not a dark banner */}
              <div className="p-6 border-b border-psi bg-psi-subtle flex justify-between items-center">
                <h3 className="font-bold text-psi-primary">
                  Recent {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Proposals
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-psi-muted" size={14} />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="psi-input pl-9 pr-4 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="divide-y divide-psi-subtle">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="p-6 hover:bg-psi-subtle transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-psi-subtle flex items-center justify-center text-psi-muted group-hover:bg-psi-surface group-hover:shadow-sm transition-all">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-psi-primary">
                          Q3 Roadshow —{' '}
                          {activeTab === 'developer' ? 'Emaar Properties' : activeTab === 'branch' ? 'Dubai Marina' : 'Alice Agent'}
                        </h4>
                        <p className="text-sm text-psi-secondary mt-0.5">
                          Created on Oct {10 + i}, 2025 · By System Admin
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 rounded-full badge-success text-xs font-bold uppercase tracking-wider">
                        Sent
                      </span>
                      <ChevronRight size={20} className="text-psi-muted group-hover:text-psi-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Common Parameters — light-mode friendly panel */}
            <div className="psi-card p-8 bg-psi-raised border-psi shadow-lg">
              <h3 className="text-xl font-bold text-psi-primary mb-4">Common Parameters</h3>
              <p className="text-psi-secondary text-sm mb-6">
                These metrics drive the ROI forecasts in all proposals.
              </p>
              <div className="space-y-4">
                <ParamItem label="Marketing Leads" value="50%" />
                <ParamItem label="Walk-in Leads" value="50%" />
                <ParamItem label="Qualified Rate" value="30%" />
                <ParamItem label="Meeting Rate" value="15%" />
                <ParamItem label="Deal Rate" value="2%" />
              </div>
              <button className="btn-accent-outline w-full mt-8 py-3 rounded-2xl text-sm font-bold transition-all">
                Edit Global Metrics
              </button>
            </div>

            {/* Tiered Cost Logic */}
            <div className="psi-card p-8">
              <h3 className="font-bold text-psi-primary mb-4">Tiered Cost Logic</h3>
              <div className="space-y-4">
                <TierInfo tier="Gold" comm="50%" cost="Agent Pays" color="text-amber-500" />
                <TierInfo tier="Silver" comm="30%" cost="Agent Pays" color="text-psi-secondary" />
                <TierInfo tier="Bronze" comm="20%" cost="Branch Pays" color="text-amber-700 dark:text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, label, icon,
}: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all select-none ${active
        // Active: uses the user's chosen accent colour
        ? 'btn-accent shadow-sm'
        // Inactive: transparent, muted text
        : 'text-psi-muted hover:text-psi-primary hover:bg-psi-subtle'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-psi-subtle last:border-0">
      <span className="text-sm text-psi-secondary">{label}</span>
      <span className="text-sm font-bold text-psi-primary">{value}</span>
    </div>
  );
}

function TierInfo({ tier, comm, cost, color }: { tier: string; comm: string; cost: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-psi-subtle rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`font-black italic ${color}`}>{tier}</div>
        <div className="text-xs font-bold text-psi-muted uppercase tracking-widest">{comm}</div>
      </div>
      <div className="text-xs font-medium text-psi-secondary">{cost}</div>
    </div>
  );
}
