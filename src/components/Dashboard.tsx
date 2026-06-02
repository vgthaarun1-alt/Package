/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  CalendarClock, 
  MessageSquareReply, 
  ShieldAlert, 
  Activity, 
  Clock, 
  CheckCircle,
  AlertCircle,
  FileText,
  UserCheck,
  Cpu
} from 'lucide-react';
import { useClinicStore } from '../store';
import { ROLE_PERMISSIONS } from '../types';
import { cryptographyLogs } from '../crypto';
import BiometricSecurityCenter from './BiometricSecurityCenter';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { session, patients, appointments, audits, updateAppointmentStatus } = useClinicStore();
  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  // Local state for clinician's daily tasks
  const [tasks, setTasks] = useState([
    { id: 't1', text: 'Assess Eleanor Vance Cardiology ECG charts and sign off', category: 'doctor', done: false },
    { id: 't2', text: 'Update Marcus Sterling foot care logs with insulin updates', category: 'doctor', done: false },
    { id: 't3', text: 'Triage incoming patients & compile pre-consultation vitals', category: 'nurse', done: false },
    { id: 't4', text: 'Perform check-in validation checks matching HIPAA directories', category: 'nurse', done: true },
    { id: 't5', text: 'Review undelivered SMS queue and run carrier verify tests', category: 'admin', done: false },
    { id: 't6', text: 'Audit and download monthly system access registers', category: 'admin', done: false },
  ]);

  // Sync log length locally for reactive triggers
  const [logCount, setLogCount] = useState(cryptographyLogs.length);
  useEffect(() => {
    const t = setInterval(() => {
      setLogCount(cryptographyLogs.length);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!session || !permissions) return null;

  // Filter tasks based on role
  const roleTasks = tasks.filter(t => t.category === session.role);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // Find metrics
  const todayDate = new Date().toISOString().split('T')[0];
  const todaysVisits = appointments.filter(a => a.date === todayDate);
  const pendingVisits = todaysVisits.filter(a => a.status === 'scheduled');
  const smsTriggered = appointments.filter(a => a.smsStatus === 'delivered' || a.smsStatus === 'sent').length;

  return (
    <div id="clinic_dashboard_view" className="space-y-4">
      {/* Header and Welcome banner */}
      <div className="bg-white rounded border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center mb-0.5 select-none animate-pulse">
            <Activity className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Active Clinical Workstation Session
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Welcome back, {session.username}
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Operator Category: <strong className="text-blue-600">{permissions.title}</strong> • Facility Clearance: Level {permissions.clearanceLevel} HIPAA Compliant
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="px-2.5 py-1 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-650 font-mono">
            SECURE IP: <span className="text-emerald-600 font-bold">10.240.102.14</span>
          </div>
          <div className="px-2.5 py-1 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-650 font-mono">
            E2E INDEX: <span className="text-blue-600 font-bold">ACTIVE-AES</span>
          </div>
        </div>
      </div>

      {/* Grid High Density Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div id="stat_total_patients" className="bg-white border border-slate-200 p-4 rounded flex items-center space-x-3 shadow-xs">
          <div className="p-2 bg-blue-50 rounded text-blue-600 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">Patients Vault</p>
            <p className="text-lg font-black text-slate-950 leading-none mt-1">{patients.length}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">End-to-End Encrypted</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div id="stat_today_appointments" className="bg-white border border-slate-200 p-4 rounded flex items-center space-x-3 shadow-xs">
          <div className="p-2 bg-rose-50 rounded text-rose-600 flex-shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">Today&apos;s Visits</p>
            <p className="text-lg font-black text-slate-950 leading-none mt-1">{todaysVisits.length}</p>
            <span className="text-[9px] text-emerald-600 font-extrabold block mt-0.5">({pendingVisits.length} pending triages)</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div id="stat_sms_queue" className="bg-white border border-slate-205 p-4 rounded flex items-center space-x-3 shadow-xs">
          <div className="p-2 bg-emerald-50 rounded text-emerald-600 flex-shrink-0">
            <MessageSquareReply className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">SMS Dispatched</p>
            <p className="text-lg font-black text-slate-950 leading-none mt-1">{smsTriggered}</p>
            <span className="text-[9px] text-slate-500 block mt-0.5">No-show rate down ~94%</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div id="stat_clearance_level" className="bg-white border border-slate-200 p-4 rounded flex items-center space-x-3 shadow-xs">
          <div className="p-2 bg-amber-50 rounded text-amber-500 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">User Permission</p>
            <p className="text-xs font-black text-slate-950 uppercase leading-none mt-1">{session.role} LEVEL {permissions.clearanceLevel}</p>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {permissions.canViewClinicalNotes ? 'Full Clinician Access' : 'Administrative Access'}
            </span>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tasks and Daily Lists */}
        <div className="bg-white border border-slate-200 rounded p-4 flex flex-col h-full shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Clinical Task Matrix</h3>
            <span className="px-2 py-0.5 text-[9px] bg-slate-100 border border-slate-200 text-slate-600 rounded font-mono uppercase font-semibold">
              ROSTER: {session.role}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Daily checklists and compliance items assigned to your profile under HIPAA workflows.
          </p>

          <div className="space-y-2 flex-grow">
            {roleTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg border text-xs transition-colors cursor-pointer focus:outline-none ${
                  t.done
                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors ${
                  t.done ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-300 text-transparent'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="leading-tight font-medium">{t.text}</span>
              </button>
            ))}
            {roleTasks.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No tasks defined for this role segment.</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center select-none">
            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
              Completed {roleTasks.filter(r => r.done).length} of {roleTasks.length} daily controls
            </span>
          </div>
        </div>

        {/* Schedule Queue Widget */}
        <div className="bg-white border border-slate-200 rounded p-4 flex flex-col h-full lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Arrivals Queue (Today)</h3>
            <button 
              onClick={() => setActiveTab('scheduler')}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-bold focus:outline-none cursor-pointer"
            >
              Configure Schedule »
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 font-sans">
            Real-time operations checker. Select actions to change clinical occupancy indices.
          </p>

          <div className="overflow-x-auto flex-grow">
            <table className="min-w-full text-left text-xs bg-slate-50/50 rounded overflow-hidden border border-slate-150">
              <thead>
                <tr className="bg-slate-100 text-slate-500 uppercase tracking-wider text-[9px] border-b border-slate-200 font-bold select-none border-t">
                  <th className="py-2 px-3">Provider</th>
                  <th className="py-2 px-3">Patient</th>
                  <th className="py-2 px-1">Time Slot</th>
                  <th className="py-2 px-3">Status Check</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700">
                {todaysVisits.slice(0, 5).map((appt) => (
                  <tr key={appt.id} className="hover:bg-white transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{appt.doctorName.split(',')[0]}</td>
                    <td className="py-2.5 px-3">
                      <div>
                        <span className="font-semibold text-slate-900 block">{appt.patientName}</span>
                        <span className="text-[9.5px] text-slate-400 font-mono font-medium">({appt.patientId})</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-1 font-mono font-bold text-slate-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{appt.time}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                        appt.status === 'arrived' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        appt.status === 'completed' ? 'bg-emerald-50 text-emerald-805 border-emerald-200' :
                        appt.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-650 border border-slate-200'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {appt.status === 'scheduled' && (
                        <button
                          onClick={() => updateAppointmentStatus(appt.id, 'arrived')}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-bold text-[9px] cursor-pointer"
                        >
                          Mark Arrived
                        </button>
                      )}
                      {appt.status === 'arrived' && (
                        <button
                          onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[9px] cursor-pointer"
                        >
                          Complete Triage
                        </button>
                      )}
                      {appt.status === 'completed' && (
                        <span className="text-[10px] text-slate-400 italic font-medium inline-flex items-center justify-end space-x-0.5 select-none">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Finished</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {todaysVisits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-450 text-xs italic">
                      No active patient appointments booked on the medical calendar today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Biometric Credentials Portal Section */}
      <BiometricSecurityCenter />

      {/* Crypto telemetry panel for client-side evaluation proof of E2E */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-rose-500 animate-pulse" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Local Crypto Cycles (AES-GCM-256 E2E)</h4>
          </div>
          <span className="text-[9px] text-slate-400 font-mono select-none">
            ALGORITHM: AES-GCM / SHA-256 PBKDF2 DERIVED
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          The pipeline below lists real-time local symmetric hashing and sealing cycles. Plaintext patient data is sealed <strong>locally</strong> in temporary RAM buffers before any syncing action. Only browser sessions which hold the matching cryptographic key can read the decrypted stream.
        </p>
        <div className="bg-slate-950 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] border border-slate-850 text-slate-350 space-y-1.5 scrollbar-thin">
          {cryptographyLogs.map((log, i) => (
            <div key={i} className="flex justify-between items-start space-x-2 border-b border-slate-900 pb-1 hover:bg-slate-900/50">
              <div>
                <span className={`font-bold mr-1.5 ${
                  log.operation === 'ENCRYPT' ? 'text-amber-400' :
                  log.operation === 'DECRYPT' ? 'text-teal-400' : 'text-purple-400'
                }`}>
                  [{log.operation}]
                </span>
                <span className="text-slate-400">{log.details}</span>
              </div>
              <span className={`text-[9.5px] ${log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-450'} font-bold`}>
                {log.status}
              </span>
            </div>
          ))}
          {cryptographyLogs.length === 0 && (
            <span className="text-slate-500 block text-center py-6 select-none font-sans">
              No transactions logged yet. Access a patient profile to trigger live decrypted handshakes.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
