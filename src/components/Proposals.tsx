import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  ChevronRight, 
  Building2, 
  Map, 
  UserCheck,
  Plus,
  Search
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Proposals() {
  const [activeTab, setActiveTab] = useState<'developer' | 'branch' | 'agent'>('developer');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Proposal Engine</h2>
          <p className="text-slate-500 mt-1">Generate automated sponsorship pitches and participation offers.</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-sm">
          <Plus size={20} />
          <span>Create Proposal</span>
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-2xl w-fit mb-8">
        <TabButton 
          active={activeTab === 'developer'} 
          onClick={() => setActiveTab('developer')}
          label="Developer Pitch"
          icon={<Building2 size={16} />}
        />
        <TabButton 
          active={activeTab === 'branch'} 
          onClick={() => setActiveTab('branch')}
          label="Branch Proposal"
          icon={<Map size={16} />}
        />
        <TabButton 
          active={activeTab === 'agent'} 
          onClick={() => setActiveTab('agent')}
          label="Agent Offer"
          icon={<UserCheck size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form/List Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Recent {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Proposals</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                />
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Q3 Roadshow - {activeTab === 'developer' ? 'Emaar Properties' : activeTab === 'branch' ? 'Dubai Marina' : 'Alice Agent'}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">Created on Oct {10 + i}, 2025 • By System Admin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      Sent
                    </span>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info/Quick Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200">
            <h3 className="text-xl font-bold mb-4">Common Parameters</h3>
            <p className="text-slate-400 text-sm mb-6">These metrics drive the ROI forecasts in all proposals.</p>
            
            <div className="space-y-4">
              <ParamItem label="Marketing Leads" value="50%" />
              <ParamItem label="Walk-in Leads" value="50%" />
              <ParamItem label="Qualified Rate" value="30%" />
              <ParamItem label="Meeting Rate" value="15%" />
              <ParamItem label="Deal Rate" value="2%" />
            </div>

            <button className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all border border-white/10">
              Edit Global Metrics
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Tiered Cost Logic</h3>
            <div className="space-y-4">
              <TierInfo tier="Gold" comm="50%" cost="Agent Pays" color="text-amber-500" />
              <TierInfo tier="Silver" comm="30%" cost="Agent Pays" color="text-slate-400" />
              <TierInfo tier="Bronze" comm="20%" cost="Branch Pays" color="text-amber-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-white text-slate-900 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function TierInfo({ tier, comm, cost, color }: { tier: string; comm: string; cost: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`font-black italic ${color}`}>{tier}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{comm}</div>
      </div>
      <div className="text-xs font-medium text-slate-600">{cost}</div>
    </div>
  );
}
