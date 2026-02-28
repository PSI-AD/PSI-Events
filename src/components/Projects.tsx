import { useState } from 'react';
import { 
  Search, 
  Plus, 
  BookOpen, 
  Award, 
  Building, 
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Projects() {
  const [activeTier, setActiveTier] = useState<'All' | 'Luxury' | 'Medium' | 'Average'>('All');

  const projects = [
    { id: 1, name: 'Marina Heights', developer: 'Emaar', tier: 'Luxury', avgDeal: 'AED 4.5M', training: 'Completed' },
    { id: 2, name: 'Downtown Views', developer: 'Emaar', tier: 'Luxury', avgDeal: 'AED 3.8M', training: 'Pending' },
    { id: 3, name: 'Creek Harbour', developer: 'Dubai Holding', tier: 'Medium', avgDeal: 'AED 2.2M', training: 'Completed' },
    { id: 4, name: 'Villanova', developer: 'DP', tier: 'Average', avgDeal: 'AED 1.5M', training: 'In Progress' },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Projects & L&D</h2>
          <p className="text-slate-500 mt-1">Manage project inventory and training assessments.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-sm">
          <Plus size={20} />
          <span>Add Project</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Project Tiers</h3>
            <div className="space-y-2">
              {['All', 'Luxury', 'Medium', 'Average'].map(tier => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier as any)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTier === tier ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{tier}</span>
                  {activeTier === tier && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <div className="flex items-center gap-3 text-emerald-700 mb-3">
              <Award size={20} />
              <h3 className="font-bold">L&D Stats</h3>
            </div>
            <p className="text-sm text-emerald-600/80 mb-4">Training completion rate across all active projects.</p>
            <div className="text-3xl font-bold text-emerald-700">84%</div>
            <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-emerald-500 h-full w-[84%]" />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects or developers..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.filter(p => activeTier === 'All' || p.tier === activeTier).map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-lg transition-all group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <Building size={24} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    project.tier === 'Luxury' ? 'bg-amber-100 text-amber-700' :
                    project.tier === 'Medium' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {project.tier}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{project.name}</h3>
                <p className="text-sm text-slate-500 mb-6">{project.developer}</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Deal</div>
                    <div className="text-sm font-bold text-slate-900">{project.avgDeal}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Training</div>
                    <div className={`text-sm font-bold ${
                      project.training === 'Completed' ? 'text-emerald-600' : 
                      project.training === 'Pending' ? 'text-rose-500' : 'text-amber-600'
                    }`}>{project.training}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all">
                    <BookOpen size={16} />
                    <span>L&D Portal</span>
                  </button>
                  <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                    <ExternalLink size={18} className="text-slate-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
