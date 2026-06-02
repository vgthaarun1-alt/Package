/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  PlusCircle, 
  MessageSquareDiff, 
  Send, 
  CheckCircle2, 
  XSquare, 
  Clock, 
  UserCheck, 
  Activity,
  Cpu
} from 'lucide-react';
import { useClinicStore } from '../store';
import { Appointment, AppointmentStatus } from '../types';

export default function Scheduler() {
  const { 
    patients, 
    appointments, 
    bookAppointment, 
    triggerSMSManual, 
    updateAppointmentStatus 
  } = useClinicStore();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterProvider, setFilterProvider] = useState<string>('All Providers');

  // Book appointment state
  const [bookForm, setBookForm] = useState({
    patientId: '',
    doctorName: 'Dr. Sarah Lin, MD (Cardiology)',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    reason: '',
  });

  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    const matchesDate = appt.date === selectedDate;
    const matchesProvider = filterProvider === 'All Providers' || appt.doctorName.includes(filterProvider);
    return matchesDate && matchesProvider;
  });

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.patientId) return;

    const patient = patients.find(p => p.id === bookForm.patientId);
    if (!patient) return;

    bookAppointment({
      patientId: patient.id,
      patientName: patient.demographics.name,
      patientPhone: patient.demographics.phone,
      doctorName: bookForm.doctorName,
      date: bookForm.date,
      time: bookForm.time,
      reason: bookForm.reason,
    });

    setBookingSuccess(true);
    setTimeout(() => setBookingSuccess(false), 3000);

    // Reset Form
    setBookForm({
      patientId: '',
      doctorName: 'Dr. Sarah Lin, MD (Cardiology)',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      reason: '',
    });
  };

  // Helper colors for SMS Delivery indicators
  const getSMSBadgeClass = (status: string) => {
    switch (status) {
      case 'none':
        return 'bg-slate-50 text-slate-500 border-slate-200';
      case 'queued':
        return 'bg-amber-50 text-amber-805 border-amber-200';
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-250';
      case 'failed':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div id="scheduler_scene_view" className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-sans focus:outline-none">
      
      {/* Book & Control form panel */}
      <div className="lg:col-span-1 space-y-4">
        
        {/* Book new appointment */}
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3.5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 border-b border-slate-100 pb-2 uppercase tracking-wider select-none">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>Book Clinical Appointment</span>
          </h3>

          <form onSubmit={handleBookSubmit} className="space-y-3 text-xs text-slate-700">
            {/* Select Patient */}
            <div>
              <label htmlFor="patient_select" className="block text-[9.5px] text-slate-505 uppercase tracking-wider mb-1 font-bold">Select Active Case Profile</label>
              <select
                id="patient_select"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 focus:outline-none focus:border-blue-600 font-semibold cursor-pointer"
                value={bookForm.patientId}
                onChange={(e) => setBookForm({ ...bookForm, patientId: e.target.value })}
                required
              >
                <option value="">-- Choose Patient Folder --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.demographics.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Doctor */}
            <div>
              <label htmlFor="provider_select" className="block text-[9.5px] text-slate-505 uppercase tracking-wider mb-1 font-bold">Clinical Provider On Roster</label>
              <select
                id="provider_select"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 focus:outline-none focus:border-blue-600 font-semibold cursor-pointer"
                value={bookForm.doctorName}
                onChange={(e) => setBookForm({ ...bookForm, doctorName: e.target.value })}
              >
                <option value="Dr. Sarah Lin, MD (Cardiology)">Dr. Sarah Lin, MD (Cardiology/Staff)</option>
                <option value="Dr. Keith Vance, MD (Endocrinology)">Dr. Keith Vance, MD (Endocrinology)</option>
                <option value="Dr. Arthur Dent, DO (Internal Medicine)">Dr. Arthur Dent, DO (Internal Medicine)</option>
              </select>
            </div>

            {/* DateTime inputs */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="appt_date" className="block text-[9.5px] text-slate-505 uppercase tracking-wider mb-1 font-bold">Booking Date</label>
                <input
                  id="appt_date"
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800 font-mono font-bold text-center"
                  value={bookForm.date}
                  onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="appt_time" className="block text-[9.5px] text-slate-505 uppercase tracking-wider mb-1 font-bold">Start Time</label>
                <select
                  id="appt_time"
                  className="w-full bg-slate-50 border border-slate-200 p-1.5 rounded text-slate-800 font-mono font-bold text-center cursor-pointer"
                  value={bookForm.time}
                  onChange={(e) => setBookForm({ ...bookForm, time: e.target.value })}
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="09:45">09:45 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:15">11:15 AM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="13:45">01:45 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:15">03:15 PM</option>
                  <option value="16:00">04:00 PM</option>
                </select>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label htmlFor="appt_reason" className="block text-[9.5px] text-slate-505 uppercase tracking-wider mb-1 font-bold">Encounter Consultation Reason</label>
              <input
                id="appt_reason"
                type="text"
                placeholder="e.g. Blood pressure and titration check"
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-slate-800 focus:outline-none focus:border-blue-600 font-medium"
                value={bookForm.reason}
                onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white rounded font-bold transition-colors cursor-pointer"
            >
              Verify &amp; Finalize Encounter
            </button>

            {bookingSuccess && (
              <p className="text-emerald-800 text-[11px] font-bold text-center mt-2 bg-emerald-50 p-2 rounded border border-emerald-200 select-none">
                ✔️ Appointment slot booked! SMS reminder dispatched.
              </p>
            )}
          </form>
        </div>

        {/* Carrier log monitor */}
        <div className="bg-white border border-slate-200 rounded p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-2 uppercase tracking-wider select-none">
            <Cpu className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h4 className="font-bold text-slate-900 text-xs">Twilio Carrier Gateway Monitor</h4>
          </div>
          <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
            Tracks physical callback registers of templates sent to clinical clients. Keeps outbound attendance near optimal bounds.
          </p>
          <div className="bg-slate-950 p-3 rounded border border-slate-900 font-mono text-[9px] text-slate-350 space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
            <div className="text-emerald-450 font-bold">[ONLINE] Integrated Twilio gateway operational.</div>
            <div className="text-slate-500">[WEBHOOK] Registered HIPAA text callback webhooks in sandbox...</div>
            {appointments.map((a, i) => {
              if (a.smsStatus === 'none') return null;
              return (
                <div key={i} className="border-t border-slate-900 pt-1 text-slate-300">
                  <span className="text-slate-550 font-bold">[{a.time}]</span> To: {a.patientPhone} (<span className="text-blue-450 font-bold">{a.patientName}</span>)
                  <span className="block text-slate-400 font-serif italic">&quot;Hi {a.patientName}, dynamic visit booked for {a.date} @ {a.time} with doctor {a.doctorName.split(',')[0]}. Reply C to confirm.&quot;</span>
                  <span className="text-[8px] text-emerald-400 font-bold block uppercase mt-0.5">Callback status: {a.smsStatus} (Latency 294ms)</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Interactive Calendar planner layout */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Planner Header filters */}
        <div className="bg-white border border-slate-200 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          
          {/* Quick Date Inputs */}
          <div className="flex items-center space-x-3 text-xs w-full sm:w-auto">
            <div className="p-2 bg-blue-50 rounded text-blue-600 flex-shrink-0 select-none">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-grow sm:flex-grow-0">
              <span className="block text-[9.5px] text-slate-450 uppercase font-black tracking-wider mb-0.5 select-none">Select Calendar Date</span>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200 text-slate-800 font-mono py-1 px-2.5 rounded font-black cursor-pointer text-xs focus:outline-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="flex space-x-1 ml-1 select-none">
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded hover:bg-slate-100 text-[10px] font-bold cursor-pointer transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tom = new Date();
                  tom.setDate(tom.getDate() + 1);
                  setSelectedDate(tom.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded hover:bg-slate-100 text-[10px] font-bold cursor-pointer transition-colors"
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* Provider check */}
          <div className="w-full sm:w-auto border-t sm:border-0 pt-2 sm:pt-0">
            <span className="block text-[9.5px] text-slate-450 uppercase font-black tracking-wider mb-1 select-none">Filter by Physician</span>
            <select
              className="w-full sm:w-auto bg-slate-50 border border-slate-202 text-slate-800 p-1.5 text-xs rounded font-bold cursor-pointer focus:outline-none"
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
            >
              <option value="All Providers">Show All Roster MDs</option>
              <option value="Sarah Lin">Dr. Sarah Lin, MD</option>
              <option value="Keith Vance">Dr. Keith Vance, MD</option>
              <option value="Arthur Dent">Dr. Arthur Dent, DO</option>
            </select>
          </div>

        </div>

        {/* Master Appointment list schedule card */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Visits Scheduled for <strong className="text-blue-600 font-mono font-black">{selectedDate}</strong>
            </h3>
            <span className="text-[11px] text-slate-450 font-semibold uppercase tracking-wider select-none">Total: {filteredAppointments.length} sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left bg-slate-50/50 rounded overflow-hidden border border-slate-150">
              <thead>
                <tr className="bg-slate-100 uppercase tracking-wider text-[9.5px] text-slate-505 border-b border-slate-200 font-bold select-none border-t">
                  <th className="py-2.5 px-3">Timing</th>
                  <th className="py-2.5 px-3">Patient Account</th>
                  <th className="py-2.5 px-3">Physician</th>
                  <th className="py-2.5 px-3">Encounter Indication</th>
                  <th className="py-2.5 px-3">SMS Dispatch Log</th>
                  <th className="py-2.5 px-3 text-right">Triage Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-705">
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-white transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-xs">{appt.time}</td>
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-extrabold text-slate-900 block">{appt.patientName}</span>
                        <span className="text-[9.5px] text-slate-450 font-mono font-medium">{appt.patientPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{appt.doctorName.split('(')[0]}</td>
                    <td className="py-3 px-3 text-slate-500 italic max-w-[150px] truncate" title={appt.reason}>
                      {appt.reason}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5 select-none animate-none">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase font-extrabold tracking-wider ${getSMSBadgeClass(appt.smsStatus)}`}>
                          {appt.smsStatus}
                        </span>
                        {appt.smsStatus === 'none' && (
                          <button
                            onClick={() => triggerSMSManual(appt.id)}
                            className="p-1 hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded cursor-pointer transition-colors"
                            title="Trigger Twilio cellular dispatch immediately"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {appt.smsStatus === 'delivered' && (
                          <span className="text-[9.5px] text-slate-400 italic font-semibold">Protected</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        className="bg-white border border-slate-200 text-slate-700 rounded font-bold font-sans text-[10px] p-1 cursor-pointer focus:outline-none focus:border-blue-55"
                        value={appt.status}
                        onChange={(e) => updateAppointmentStatus(appt.id, e.target.value as AppointmentStatus)}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="arrived">Arrived</option>
                        <option value="completed">Completed</option>
                        <option value="no-show">No-Show</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 italic leading-snug">
                      There are no active clinical patient appointments registered on this selected date coordinate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
