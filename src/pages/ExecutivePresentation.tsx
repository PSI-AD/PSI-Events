import React from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Cpu,
  Database,
  Cloud,
  Lock,
  BarChart4,
  Target,
  Users,
  Building2,
  PieChart,
  ChevronRight,
  Sparkles,
  Calendar,
  ArrowDown,
  Globe,
  Activity,
  Server,
  Terminal,
  History,
  ShieldAlert,
  Calculator
} from 'lucide-react';

const Section = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <section className={`py-24 px-6 md:px-12 lg:px-24 overflow-hidden ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

export default function ExecutivePresentation() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-emerald-500/30">
      {/* Section 1: Hero */}
      <section className="relative min-h-screen bg-slate-950 flex flex-col justify-center items-center text-center px-6 pt-20 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]"
            aria-label="Enterprise ROI Vision 2026 badge"
          >
            <Sparkles size={14} aria-hidden="true" />
            Enterprise ROI Vision 2026
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter text-white leading-[0.9]"
          >
            Run Roadshows with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
              Mathematical Precision.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed"
          >
            The PSI Event Portal transforms logistical guesswork into a high-performance revenue engine.
            Built for the boardroom, engineered for the field.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="relative mt-16 group"
          >
            {/* Mockup Container */}
            <div className="relative mx-auto max-w-4xl bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl">
              <div className="h-8 bg-white/5 border-b border-white/10 flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
              </div>
              <div className="p-8 grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                  <div className="h-32 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Branch Gross Profit</span>
                      <TrendingUp size={16} className="text-emerald-500" aria-hidden="true" />
                    </div>
                    <div className="text-3xl font-extrabold text-white">390,000 <span className="text-sm font-normal text-slate-300">AED</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/5 p-4">
                      <div className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mb-2">Diluted Target</div>
                      <div className="text-xl font-extrabold text-white">75 <span className="text-[10px] font-normal text-slate-300">Leads/Agent</span></div>
                    </div>
                    <div className="h-24 bg-white/5 rounded-2xl border border-white/5 p-4">
                      <div className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mb-2">Sponsorship</div>
                      <div className="text-xl font-extrabold text-emerald-400">150k <span className="text-[10px] font-normal text-slate-300">AED</span></div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col justify-between">
                  <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Lead Funnel</div>
                  <div className="space-y-3">
                    {[80, 60, 40, 20].map((w, i) => (
                      <div key={i} className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/50" style={{ width: `${w}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-[10px] text-slate-300 font-bold">104% Target Reached</div>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-[3rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 text-slate-300"
          role="img"
          aria-label="Scroll down to explore"
        >
          <ArrowDown size={24} aria-hidden="true" />
        </motion.div>
      </section>

      {/* Section 2: Old Way vs New Way */}
      <Section className="bg-white">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">The Evolution of ROI.</h2>
          <p className="text-xl text-slate-600 font-medium">Why spreadsheets are the enemy of enterprise growth.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* The Old Way */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-12 bg-slate-50 rounded-[3rem] border border-slate-200 space-y-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900">
              <AlertCircle size={120} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">The Legacy Problem</span>
              <h3 className="text-4xl font-extrabold text-slate-900">The "Cost Center" Model</h3>
            </div>
            <ul className="space-y-6">
              {[
                { icon: <Database className="text-slate-500" aria-hidden="true" />, text: "Manual Spreadsheets & Email Chains" },
                { icon: <Activity className="text-slate-500" aria-hidden="true" />, text: "Opaque ROI & Untracked Expenses" },
                { icon: <Users className="text-slate-500" aria-hidden="true" />, text: "WhatsApp-based Approvals" },
                { icon: <Target className="text-slate-500" aria-hidden="true" />, text: "Static, Unrealistic Lead Targets" },
                { icon: <Clock className="text-slate-500" aria-hidden="true" />, text: "Missing Visas & Last-Minute Chaos" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-500 line-through opacity-70">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">{item.icon}</div>
                  <span className="font-bold">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* The New Way */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-12 bg-slate-950 rounded-[3rem] border border-emerald-500/20 space-y-8 relative overflow-hidden group shadow-2xl shadow-emerald-500/10"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 text-emerald-500">
              <Zap size={120} />
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">The PSI Engine</span>
              <h3 className="text-4xl font-extrabold text-white">The "Revenue Engine"</h3>
            </div>
            <ul className="space-y-6">
              {[
                { icon: <Cloud className="text-emerald-400" aria-hidden="true" />, text: "Automated CRM & Maps Sync" },
                { icon: <ShieldCheck className="text-emerald-400" aria-hidden="true" />, text: "Forced Digital Approval Gates" },
                { icon: <TrendingUp className="text-emerald-400" aria-hidden="true" />, text: "Real-Time P&L & GP Calculation" },
                { icon: <Cpu className="text-emerald-400" aria-hidden="true" />, text: "Serverless Target Dilution Math" },
                { icon: <Globe className="text-emerald-400" aria-hidden="true" />, text: "Centralized Logistics Chokepoint" }
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-white">
                  <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-lg shadow-emerald-500/20">{item.icon}</div>
                  <span className="font-bold">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* Section 3: The 5-Step Journey */}
      <Section className="bg-slate-50">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">The Accountability Journey.</h2>
          <p className="text-xl text-slate-600 font-medium">A deterministic workflow where no agent sells without clearance.</p>
        </div>

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-blue-500 to-transparent hidden lg:block -translate-x-1/2" />

          <div className="space-y-24">
            {[
              {
                step: "01",
                title: "Event Initialization",
                desc: "Organizers establish baseline targets (e.g., 300 leads) and sync live CRM property inventory.",
                icon: <Calendar className="text-white" />,
                color: "bg-slate-900"
              },
              {
                step: "02",
                title: "Financial Risk Selection",
                desc: "Agents commit to a tier. Gold (50%), Silver (30%), or Bronze (20%). High reward requires high skin-in-the-game.",
                icon: <PieChart className="text-white" />,
                color: "bg-emerald-500",
                badges: ["Gold 50%", "Silver 30%", "Bronze 20%"]
              },
              {
                step: "03",
                title: "The Gatekeeper",
                desc: "Branch Managers review the queue. Digital approval is required for portal access. RBAC secured.",
                icon: <ShieldCheck className="text-white" />,
                color: "bg-blue-500"
              },
              {
                step: "04",
                title: "Logistics Desk",
                desc: "The hard chokepoint. Flight & Visa uploads are verified by Organizers. No document = No attendance.",
                icon: <Globe className="text-white" />,
                color: "bg-purple-500"
              },
              {
                step: "05",
                title: "Serverless Target Dilution",
                desc: "The math engine executes. 300 Leads / 4 Approved Agents = 75 Leads per Agent. Fair, automated, and final.",
                icon: <Cpu className="text-white" />,
                color: "bg-amber-500",
                math: "300 / 4 = 75"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col lg:flex-row items-center gap-12 ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className="flex-1 text-center lg:text-left">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${item.color} shadow-2xl mb-6 mx-auto lg:mx-0`}>
                    {item.icon}
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-4">
                    <span className="text-slate-500 mr-2" aria-hidden="true">{item.step}</span> {item.title}
                  </h3>
                  <p className="text-lg text-slate-600 font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
                    {item.desc}
                  </p>
                  {item.badges && (
                    <div className="flex flex-wrap gap-2 mt-6 justify-center lg:justify-start">
                      {item.badges.map((b, bi) => (
                        <span key={bi} className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.math && (
                    <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200 inline-block">
                      <code className="text-amber-700 font-extrabold text-xl">{item.math}</code>
                      <span className="ml-2 text-xs text-slate-600 font-bold uppercase tracking-widest">Leads/Agent</span>
                    </div>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-white border-4 border-slate-900 z-10 hidden lg:flex items-center justify-center font-bold text-slate-900 shadow-xl">
                  {item.step}
                </div>
                <div className="flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Section 4: Cross-Departmental Impact */}
      <Section className="bg-white">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">Who Wins?</h2>
          <p className="text-xl text-slate-600 font-medium">Empowering every layer of PSI with automation and security.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Executive Board",
              desc: "Real-time P&L & Sponsorship Margin Protection.",
              icon: <Building2 size={48} />,
              color: "from-blue-500 to-blue-600",
              impact: "Millions in untracked ROI"
            },
            {
              title: "Branch Managers",
              desc: "Row-Level Security & Agent Auditing.",
              icon: <ShieldCheck size={48} />,
              color: "from-emerald-500 to-emerald-600",
              impact: "Zero budget overruns"
            },
            {
              title: "Event Organizers",
              desc: "Automated Document Tracking & Expense Ledgers.",
              icon: <Clock size={48} />,
              color: "from-amber-500 to-amber-600",
              impact: "40+ hours saved/event"
            },
            {
              title: "Sales Agents",
              desc: "Fair, Diluted Targets & Clear Commission Math.",
              icon: <Target size={48} />,
              color: "from-purple-500 to-purple-600",
              impact: "Eliminates disputes"
            }
          ].map((card, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="relative p-8 rounded-[2.5rem] overflow-hidden group h-full flex flex-col justify-between"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className="absolute inset-0 bg-slate-50 group-hover:opacity-0 transition-opacity duration-500" />
              <div className="absolute inset-0 border border-slate-200 group-hover:border-transparent transition-colors rounded-[2.5rem]" />

              <div className="relative z-10 space-y-6">
                <div className="text-slate-900 group-hover:text-white transition-colors">
                  {card.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-white transition-colors">{card.title}</h3>
                  <p className="text-slate-600 group-hover:text-white/80 transition-colors font-medium leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-12 pt-6 border-t border-slate-200 group-hover:border-white/20">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-white/60 font-bold mb-1">Key Impact</p>
                <p className="text-lg font-extrabold text-slate-900 group-hover:text-white transition-colors">{card.impact}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Section 5: Live Sample P&L Report */}
      <Section className="bg-slate-50">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">The "Wow" Dashboard.</h2>
          <p className="text-xl text-slate-600 font-medium">See the math engine in action. No manual calculations required.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white border border-slate-200 rounded-[3rem] p-8 md:p-16 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-slate-900">
            <BarChart4 size={300} />
          </div>

          <div className="grid lg:grid-cols-3 gap-16 relative">
            <div className="lg:col-span-1 space-y-12">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">London Roadshow 2026</span>
                <h3 className="text-4xl font-extrabold text-slate-900">P&L Readout</h3>
              </div>

              <div className="space-y-6">
                <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-xs text-emerald-700 mb-2 font-bold uppercase tracking-widest">Developer Sponsorship</p>
                  <p className="text-4xl font-extrabold text-emerald-700">150,000 <span className="text-sm font-normal opacity-70">AED</span></p>
                  <p className="text-[10px] text-emerald-700 font-bold mt-2 uppercase tracking-widest">Pure Margin Protection</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2 font-bold uppercase tracking-widest">Total Event Cost</p>
                  <p className="text-4xl font-extrabold text-slate-900">120,000 <span className="text-sm font-normal opacity-50">AED</span></p>
                </div>
                <div className="p-8 bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl">
                  <p className="text-xs text-slate-300 mb-2 font-bold uppercase tracking-widest">Branch Gross Profit</p>
                  <p className="text-4xl font-extrabold text-emerald-400">390,000 <span className="text-sm font-normal opacity-80 text-slate-300">AED</span></p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-12">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Target Dilution</span>
                    <Cpu size={20} className="text-amber-600" aria-hidden="true" />
                  </div>
                  <div className="text-5xl font-extrabold text-slate-900">75</div>
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">Leads per Agent</p>
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                    <Users size={12} aria-hidden="true" /> 4 Approved Agents
                  </div>
                </div>
                <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Lead Conversion</span>
                    <TrendingUp size={20} className="text-emerald-500" aria-hidden="true" />
                  </div>
                  <div className="text-5xl font-extrabold text-slate-900">104%</div>
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-widest">Target Reached</p>
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                    <CheckCircle2 size={12} aria-hidden="true" /> 312 Total Leads
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-950 rounded-[2.5rem] border border-slate-800 space-y-8">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-extrabold text-xl">Agent Performance Matrix</h4>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                  </div>
                </div>
                <div className="space-y-6">
                  {[
                    { name: "Agent Marina", leads: 82, target: 75, color: "bg-emerald-500" },
                    { name: "Agent Jumeirah", leads: 78, target: 75, color: "bg-blue-500" },
                    { name: "Agent Downtown", leads: 76, target: 75, color: "bg-amber-500" },
                    { name: "Agent Creek", leads: 76, target: 75, color: "bg-purple-500" }
                  ].map((agent, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className="text-slate-300">{agent.name}</span>
                        <span className="text-white">{agent.leads} / {agent.target}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(agent.leads / 82) * 100}%` }}
                          className={`h-full ${agent.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Section: The Financial Risk Matrix */}
      <Section className="bg-white">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">The Financial Risk Matrix.</h2>
          <p className="text-xl text-slate-600 font-medium">Aligning agent incentives with branch profitability.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Gold Tier */}
          <motion.div whileHover={{ y: -10 }} className="p-8 bg-white border-2 border-amber-500 rounded-[2.5rem] shadow-2xl shadow-amber-500/10 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="mb-8">
              <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold uppercase tracking-widest">Gold Tier</span>
              <h3 className="text-5xl font-extrabold text-slate-900 mt-6 mb-2">50%</h3>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Commission Split</p>
            </div>
            <div className="space-y-6 flex-1">
              <h4 className="text-xl font-extrabold text-slate-900">Maximum Reward, Zero Branch Risk.</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-amber-600 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-600 font-medium">Agent absorbs 100% of event & travel costs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-amber-600 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-600 font-medium">Branch retains zero logistical liability.</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Silver Tier */}
          <motion.div whileHover={{ y: -10 }} className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] shadow-lg relative overflow-hidden flex flex-col">
            <div className="mb-8">
              <span className="px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-widest">Silver Tier</span>
              <h3 className="text-5xl font-extrabold text-slate-900 mt-6 mb-2">30%</h3>
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">Commission Split</p>
            </div>
            <div className="space-y-6 flex-1">
              <h4 className="text-xl font-extrabold text-slate-900">Shared Risk, Shared Reward.</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-slate-500 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-600 font-medium">Agent covers partial logistical costs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-slate-500 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-600 font-medium">Balanced margin protection for the branch.</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Bronze Tier */}
          <motion.div whileHover={{ y: -10 }} className="p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="mb-8">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase tracking-widest">Bronze Tier</span>
              <h3 className="text-5xl font-extrabold text-white mt-6 mb-2">20%</h3>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Commission Split</p>
            </div>
            <div className="space-y-6 flex-1">
              <h4 className="text-xl font-extrabold text-white">Branch Funded, Maximum Margin.</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-300 font-medium">Branch covers all flights, visas, and hotels.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-400 shrink-0" size={20} aria-hidden="true" />
                  <span className="text-slate-300 font-medium">Branch retains 80% of Gross Revenue to maximize company profit.</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Section: The Serverless Target Engine */}
      <Section className="bg-slate-900 text-white border-y border-white/5">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white">The Serverless Target Engine.</h2>
          <p className="text-xl text-slate-300 font-medium">Dynamic dilution logic. Absolute mathematical fairness.</p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">

            {/* Setup */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 text-center relative w-full">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                <Target size={32} className="text-blue-400" />
              </div>
              <div className="text-4xl font-extrabold text-white mb-2">300</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300">Baseline Leads</div>
              <p className="mt-4 text-sm text-slate-300 font-medium">Branch commits to initial inventory targets.</p>
            </div>

            {/* Divider / Operator */}
            <div className="text-slate-400 font-extrabold text-4xl" aria-hidden="true">÷</div>

            {/* Variable */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 text-center relative w-full">
              <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/30">
                <Users size={32} className="text-amber-400" />
              </div>
              <div className="text-4xl font-extrabold text-white mb-2">4</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-300">Approved Agents</div>
              <p className="mt-4 text-sm text-slate-300 font-medium">System verifies uploaded flights &amp; visas.</p>
            </div>

            {/* Divider / Operator */}
            <div className="text-emerald-500 font-extrabold text-4xl">=</div>

            {/* Output */}
            <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 text-center relative w-full shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 rounded-3xl" />
              <div className="w-16 h-16 mx-auto bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30 relative z-10">
                <Cpu size={32} className="text-white" />
              </div>
              <div className="text-5xl font-extrabold text-emerald-400 mb-2 relative z-10">75</div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-500 relative z-10">Leads per Agent</div>
              <p className="mt-4 text-sm text-emerald-200 font-medium relative z-10">Cloud Functions instantly recalculate.</p>
            </div>

          </div>

          <div className="mt-16 text-center max-w-2xl mx-auto p-6 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-slate-300 font-medium leading-relaxed">
              <span className="text-white font-bold">Zero manual spreadsheets.</span> Zero target discrepancies when an agent drops out. Absolute mathematical fairness enforced by code.
            </p>
          </div>
        </div>
      </Section>

      {/* Section: The Enterprise Security Vault */}
      <Section className="bg-slate-50">
        <div className="text-center mb-20 space-y-4">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">The Enterprise Security Vault.</h2>
          <p className="text-xl text-slate-600 font-medium">Row-Level Security (RLS) via Firestore Rules.</p>
        </div>

        <div className="max-w-6xl mx-auto bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col lg:flex-row">

          {/* Executive View */}
          <div className="flex-1 p-12 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-200 relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900">
              <Building2 size={100} />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-widest mb-8" aria-label="Executive View role badge">
              <Lock size={14} aria-hidden="true" /> Executive View
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mb-8">Total Transparency</h3>

            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-widest mb-1">Total Event Cost</p>
                <p className="text-2xl font-extrabold text-slate-900">120,000 AED</p>
              </div>
              <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-xs text-amber-600 font-bold uppercase tracking-widest mb-1">Developer Sponsorship</p>
                <p className="text-2xl font-extrabold text-amber-700">150,000 AED</p>
              </div>
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest mb-1">Gross Profit</p>
                <p className="text-2xl font-extrabold text-emerald-700">390,000 AED</p>
              </div>
            </div>
          </div>

          {/* Agent View */}
          <div className="flex-1 p-12 lg:p-16 bg-slate-900 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 text-white">
              <ShieldCheck size={100} />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-extrabold uppercase tracking-widest mb-8 border border-white/20" aria-label="Agent View role badge">
              <Users size={14} aria-hidden="true" /> Agent View
            </div>
            <h3 className="text-3xl font-extrabold text-white mb-8">The Blindfold</h3>

            <div className="space-y-6 relative">
              {/* Blurred/Hidden Data */}
              <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/50 flex items-center justify-center rounded-2xl border border-white/10">
                <div className="text-center">
                  <Lock size={32} className="text-slate-300 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Company Margins Hidden</p>
                </div>
              </div>

              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 opacity-50 blur-sm">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Event Cost</p>
                <p className="text-2xl font-extrabold text-slate-700">XXX,XXX AED</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 opacity-50 blur-sm">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Developer Sponsorship</p>
                <p className="text-2xl font-extrabold text-slate-700">XXX,XXX AED</p>
              </div>
            </div>

            {/* Visible Data */}
            <div className="mt-6 p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 relative z-20">
              <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mb-1">Personal Target</p>
              <p className="text-2xl font-extrabold text-white">75 Leads <span className="text-sm font-normal text-slate-400">(Gold Tier)</span></p>
            </div>
          </div>

        </div>
      </Section>

      {/* Section: The Command Center */}
      <Section className="bg-[#050505] text-white border-t border-white/5">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Terminal size={14} />
                Command Center
              </div>
              <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white">
                Absolute Accountability <br /><span className="text-slate-500">& Traceability.</span>
              </h2>
              <p className="text-xl text-slate-300 font-medium leading-relaxed">
                When enterprise money is moving, "I don't know what happened" is not an acceptable answer.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Pillar 1 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <History size={20} className="text-blue-400" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-extrabold text-white">The Human Trail</h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">Every status change, document verification, and expense entry is permanently time-stamped with the actor's exact CRM ID.</p>
              </div>
              {/* Pillar 2 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Activity size={20} className="text-emerald-400" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-extrabold text-white">API Health Monitoring</h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">Webhooks are actively monitored. Dead Letter Queues automatically retry failed CRM property syncs before alerting DevOps.</p>
              </div>
              {/* Pillar 3 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <ShieldAlert size={20} className="text-rose-400" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-extrabold text-white">Intrusion Detection</h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">If an agent attempts to bypass Row-Level Security to view company margins, the system physically blocks them and flags an immediate security alert.</p>
              </div>
              {/* Pillar 4 */}
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Calculator size={20} className="text-amber-400" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-extrabold text-white">Mathematical Failsafes</h4>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">Cloud Functions are hardcoded to catch divide-by-zero errors. If zero agents arrive, the target math defaults to zero gracefully instead of crashing the dashboard.</p>
              </div>
            </div>
          </div>

          {/* Terminal UI */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 via-rose-500/20 to-amber-500/20 blur-2xl opacity-50 rounded-[3rem]" />
            <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl font-mono text-sm">
              {/* Terminal Header */}
              <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-4 text-xs text-slate-400 font-bold tracking-widest uppercase">system_audit_log.tail</span>
              </div>
              {/* Terminal Body */}
              <div className="p-6 space-y-4">
                <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex gap-3">
                  <span className="text-slate-400 shrink-0">14:02:11</span>
                  <span className="text-emerald-400 shrink-0">[🟢 SUCCESS]</span>
                  <span className="text-slate-300">API Webhook: Mamsha Gardens Sync Complete</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex gap-3">
                  <span className="text-slate-400 shrink-0">14:05:43</span>
                  <span className="text-amber-400 shrink-0">[🟡 AUDIT]</span>
                  <span className="text-slate-300">Manager ID-8472 Approved Agent 'Gold Tier'</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex gap-3">
                  <span className="text-slate-400 shrink-0">14:12:09</span>
                  <span className="text-emerald-400 shrink-0">[🟢 SUCCESS]</span>
                  <span className="text-slate-300">Cloud Function: Target Dilution Executed (75/Agent)</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex gap-3">
                  <span className="text-slate-400 shrink-0">14:18:22</span>
                  <span className="text-rose-400 shrink-0">[🔴 BLOCKED]</span>
                  <span className="text-rose-200">403 Intrusion: Agent attempted Gross Profit read</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="flex gap-3">
                  <span className="text-slate-400 shrink-0">14:18:23</span>
                  <span className="text-amber-400 shrink-0">[🟡 ALERT]</span>
                  <span className="text-slate-300">Security Notification dispatched to Admin</span>
                </motion.div>
                <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="flex gap-3 pt-4">
                  <span className="text-slate-400 shrink-0">14:18:24</span>
                  <span className="text-emerald-500">_</span>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Section 6: Enterprise Tech Stack */}
      <section className="bg-slate-950 py-24 px-6 md:px-12 lg:px-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-5xl font-extrabold tracking-tighter text-white">Enterprise-Grade <br /> Infrastructure.</h2>
              <p className="text-xl text-slate-300 font-medium leading-relaxed max-w-xl">
                Built for scale, speed, and absolute data security. Our architecture ensures that every roadshow deal is tracked from the first handshake to the final commission split.
              </p>
              <div className="flex flex-wrap gap-6">
                {[
                  { icon: <Cpu aria-hidden="true" />, label: "Serverless Functions" },
                  { icon: <Lock aria-hidden="true" />, label: "RBAC Firestore Rules" },
                  { icon: <Globe aria-hidden="true" />, label: "JWT Secured Webhooks" },
                  { icon: <Server aria-hidden="true" />, label: "Real-time CRM Sync" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/80 font-bold text-sm uppercase tracking-widest">
                    <div className="text-emerald-400">{item.icon}</div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { name: "React 19", icon: <Zap className="text-blue-400" /> },
                { name: "Next.js", icon: <Layers className="text-white" /> },
                { name: "Firebase", icon: <Database className="text-amber-400" /> },
                { name: "Tailwind", icon: <Sparkles className="text-emerald-400" /> }
              ].map((tech, i) => (
                <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-colors">
                  <div className="scale-150">{tech.icon}</div>
                  <span className="text-white font-bold tracking-widest uppercase text-xs">{tech.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap className="text-emerald-400 fill-emerald-400" size={20} />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight text-white">PSI ROI Portal</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Executive Vision 2026</p>
              </div>
            </div>
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              © 2026 Property Shop Investment LLC. All Rights Reserved.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
