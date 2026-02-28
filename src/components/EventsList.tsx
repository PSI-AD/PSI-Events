import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Calendar as CalendarIcon, Users, ArrowRight, Filter, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Event } from '../types';

export default function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'Roadshow',
    country: 'UAE',
    city: 'Dubai',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    organizer_id: 'admin-1',
    branch_target_leads: 300,
    is_sponsored: false
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = () => {
    setLoading(true);
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    })
    .then(res => res.json())
    .then(() => {
      setShowModal(false);
      fetchEvents();
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Events</h2>
          <p className="text-slate-500 mt-1">Manage roadshows and track participation.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus size={20} />
          <span>New Event</span>
        </button>
      </header>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Create New Event</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Name</label>
                <input 
                  required
                  type="text" 
                  value={newEvent.name}
                  onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  placeholder="e.g. Q3 London Roadshow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Branch Target Leads</label>
                  <input 
                    required
                    type="number" 
                    value={newEvent.branch_target_leads}
                    onChange={e => setNewEvent({...newEvent, branch_target_leads: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sponsored?</label>
                  <select 
                    value={newEvent.is_sponsored ? 'true' : 'false'}
                    onChange={e => setNewEvent({...newEvent, is_sponsored: e.target.value === 'true'})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  >
                    <option value="false">No (Branch Funded)</option>
                    <option value="true">Yes (Developer Sponsored)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                  <input 
                    required
                    type="date" 
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">End Date</label>
                  <input 
                    required
                    type="date" 
                    value={newEvent.end_date}
                    onChange={e => setNewEvent({...newEvent, end_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">
                  Create Proposal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Filter events by name, city or status..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  event.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 
                  event.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
                }`}>
                  {event.status}
                </span>
                <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  <ArrowRight size={20} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
                {event.name}
              </h3>
              
              <div className="space-y-3 mt-6">
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <MapPin size={16} className="text-slate-400" />
                  <span>{event.city}, {event.country}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <CalendarIcon size={16} className="text-slate-400" />
                  <span>{format(new Date(event.start_date), 'MMM d')} - {format(new Date(event.end_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <Users size={16} className="text-slate-400" />
                  <span>{event.targeted_agents_count} Targeted Agents</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                      U{i}
                    </div>
                  ))}
                </div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                  {event.type}
                </div>
              </div>
            </motion.div>
          ))}
          
          {events.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <CalendarIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No events found</h3>
              <p className="text-slate-500">Start by creating your first roadshow proposal.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
