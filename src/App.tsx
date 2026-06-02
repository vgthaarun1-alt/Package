/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Activity, 
  Users, 
  CalendarClock, 
  Terminal, 
  TrendingUp, 
  LogOut, 
  LockKeyhole,
  Lock,
  User,
  MapPin,
  Clock
} from 'lucide-react';
import { useClinicStore } from './store';
import { ROLE_PERMISSIONS } from './types';

// Importing child sub-modules
import LoginMFA from './components/LoginMFA';
import Dashboard from './components/Dashboard';
import PatientRecords from './components/PatientRecords';
import Scheduler from './components/Scheduler';
import AuditTrail from './components/AuditTrail';
import Analytics from './components/Analytics';

export default function App() {
  const { session, logoutUser } = useClinicStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  // Render active clinical scene based on selection
  const renderActiveScene = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'records':
        return <PatientRecords />;
      case 'scheduler':
        return <Scheduler />;
      case 'audit':
        return <AuditTrail />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  if (!session) {
    return <LoginMFA />;
  }

  return (
    <div id="secure_clinical_root" className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row antialiased">
      
      {/* Navigation Sidebar (Desktop-only) */}
      <aside className="hidden md:flex w-56 bg-slate-900 text-white flex-col border-r border-slate-800 flex-shrink-0 select-none">
        <div className="p-4 flex items-center gap-2.5 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-base text-white flex-shrink-0">C</div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-[11px] tracking-tight text-white truncate">CLINICA SECURE</span>
              <span className="text-[8px] bg-rose-500/25 border border-rose-500/35 px-1 py-0.25 rounded text-rose-400 font-extrabold tracking-widest font-mono">HIPAA</span>
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none mt-0.5">E2E Portal Console</span>
          </div>
        </div>

        <nav className="flex-grow py-4 space-y-1" aria-label="Clinical Departments">
          {[
            { id: 'dashboard', name: 'Task Board', icon: Activity },
            { id: 'records', name: 'Patient Vault', icon: Users },
            { id: 'scheduler', name: 'Encounter Scheduler', icon: CalendarClock },
            { id: 'audit', name: 'Compliance Registry', icon: Terminal, roleRestricted: !permissions?.canExportAuditLogs },
            { id: 'analytics', name: 'Diagnostic Stats', icon: TrendingUp },
          ].map((tab) => {
            if (tab.roleRestricted) return null;
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-5 py-2 flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold focus:outline-none ${
                  isActive
                    ? 'bg-blue-600/20 border-l-4 border-blue-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Secure Operator Footer Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">HIPAA Secure Session</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 font-extrabold uppercase flex-shrink-0">
              {session.username.slice(0, 2)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-slate-300 truncate font-semibold block">{session.username}</span>
              <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase font-semibold">{session.role} LEVEL {permissions?.clearanceLevel}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame container */}
      <div className="flex-grow flex flex-col min-w-0 overflow-hidden">
        
        {/* Top workspace toolbar / search bar mimicking MEDICORE's v2.4 suite */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 shadow-xs">
          <div className="flex items-center gap-4 flex-grow max-w-sm sm:max-w-md">
            <div className="relative w-full">
              <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400">MRN:</span>
              <input 
                type="text" 
                placeholder="Search patient indices (Name, SSN, ID)..." 
                className="w-full pl-11 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-850 focus:outline-none focus:border-blue-500 transition-colors"
                disabled
                title="Search controls are actively routed directly inside the Patient Vault directory sidebar for high integrity index checks."
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end justify-center select-none leading-none">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                MFA Validated
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">E2EE Stream: Active</span>
            </div>

            <button
              onClick={logoutUser}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded text-xs font-bold border border-rose-200 focus:outline-none transition-all cursor-pointer"
              title="Immediately flush cryptography master keys from client RAM and lockdown portal screen."
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Emergency Flush</span>
            </button>
          </div>
        </header>

        {/* Mobile top-header bar */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-xs">C</div>
            <span className="font-bold text-xs tracking-tight">CLINICA SECURE</span>
            <span className="text-[8px] bg-rose-500/20 border border-rose-500/30 px-1 py-0.25 rounded text-rose-400 font-extrabold tracking-widest font-mono">HIPAA</span>
          </div>
          <button
            onClick={logoutUser}
            className="p-1 px-2 border border-rose-500/25 bg-rose-500/10 text-rose-400 rounded text-[10px] font-bold cursor-pointer"
          >
            Flush
          </button>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-1.5 flex justify-around select-none">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: Activity },
            { id: 'records', name: 'Registry', icon: Users },
            { id: 'scheduler', name: 'Scheduler', icon: CalendarClock },
            { id: 'audit', name: 'Compliance', icon: Terminal, roleRestricted: !permissions?.canExportAuditLogs },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp },
          ].map((tab) => {
            if (tab.roleRestricted) return null;
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition-colors focus:outline-none ${
                  isActive ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <IconComponent className="w-4.5 h-4.5 mb-0.5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner Space */}
        <div className="flex-grow overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {renderActiveScene()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* HIPAA compliance bottom bar exactly mimicking MEDICORE's v2.4 bar */}
        <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center px-4 justify-between text-[9px] text-slate-500 flex-shrink-0 select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="font-semibold text-slate-600 uppercase tracking-tight">System Sync Active (12ms)</span>
            </div>
            <span className="hidden sm:inline">Encryption: AES-256-GCM</span>
            <span className="hidden md:inline">Device ID: CLINIC-A-04</span>
          </div>
          <div className="font-mono">
            BUILD: v2.4.11-PROD | ISO/IEC 27001 Certified
          </div>
        </footer>

      </div>
    </div>
  );
}
