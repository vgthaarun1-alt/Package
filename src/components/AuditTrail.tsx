/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Download, 
  Search, 
  Terminal, 
  FileCheck, 
  Filter, 
  AlertTriangle 
} from 'lucide-react';
import { useClinicStore } from '../store';
import { ROLE_PERMISSIONS } from '../types';

export default function AuditTrail() {
  const { session, audits } = useClinicStore();
  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!session || !permissions) return null;

  // HIPAA clearance validation check to view compliance reports
  const isAuthorizedToAudit = permissions.canExportAuditLogs;

  // Filter logs
  const filteredAudits = audits.filter(log => {
    const matchesSearch = 
      log.userId.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.patientId && log.patientId.toLowerCase().includes(search.toLowerCase())) ||
      (log.patientName && log.patientName.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Secure export to CSV format for health department audits
  const exportAuditCSV = () => {
    const header = ['AuditID', 'Timestamp_UTC', 'UserRef', 'Role', 'ActionCode', 'PatientID', 'PatientName', 'TerminalIP', 'Status', 'Details'];
    
    const rows = filteredAudits.map(log => [
      log.id,
      log.timestamp,
      log.userId,
      log.userRole,
      log.action,
      log.patientId || 'N/A',
      log.patientName || 'N/A',
      log.ipAddress,
      log.status,
      `"${log.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `CLINICAL_AUDIT_LOG_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="compliance_audit_view" className="space-y-4 font-sans focus:outline-none">
      
      {/* HIPAA Certification Notice Banner */}
      <div className="bg-white border border-slate-205 rounded p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xs">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 bg-emerald-50 rounded text-emerald-600 flex-shrink-0 select-none">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-wider uppercase select-none">Active HIPAA Compliance Audit Register</h2>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Durable cryptographic chronologs compiled per 45 CFR Part 164. Component-level reads, on-the-fly decipher codes, and clearance verification cycles are registered permanently into this local sandbox registry state.
            </p>
          </div>
        </div>

        {isAuthorizedToAudit && (
          <button
            onClick={exportAuditCSV}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer self-stretch md:self-auto justify-center"
          >
            <Download className="w-4 h-4" />
            <span>Export Certified Ledger (.CSV)</span>
          </button>
        )}
      </div>

      {!isAuthorizedToAudit ? (
        <div className="bg-white border border-rose-200 p-12 text-center rounded shadow-xs space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-500 select-none" />
          <p className="text-xs font-extrabold text-rose-900 uppercase tracking-widest">🔒 COMPLIANCE AUDIT LIMITATION APPLIED</p>
          <p className="text-[11px] text-slate-500 max-w-lg mx-auto leading-relaxed">
            Your clinical category (<strong className="text-amber-800 uppercase font-extrabold font-mono">{session.role}</strong>) does not hold raw audit log clearance. HIPAA audit records access is gated exclusively to Admin Overseers and Health Information Directors.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters shelf */}
          <div className="bg-white border border-slate-205 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            
            {/* Search filter input */}
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none select-none">
                <Search className="h-4 w-4 text-slate-405" />
              </div>
              <input
                type="text"
                placeholder="Search audit parameters (User, Action, Patient Name/ID)..."
                className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Status Selector dropdown */}
            <div className="flex items-center space-x-2 text-xs text-slate-500 w-full sm:w-auto mt-2 sm:mt-0 select-none">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Response Filter:</span>
              <select
                className="bg-slate-50 border border-slate-200 text-slate-800 p-1.5 rounded text-xs font-bold focus:outline-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Show All Threat Indexes</option>
                <option value="SUCCESS">Success Actions Only</option>
                <option value="DENIED">Denial Warning Alerts</option>
                <option value="WARN">Administrative Overrides</option>
              </select>
            </div>

          </div>

          {/* Core Table Grid layout */}
          <div className="bg-white border border-slate-205 rounded p-4 shadow-xs overflow-x-auto">
            <table className="min-w-full text-xs text-left text-slate-800">
              <thead>
                <tr className="bg-slate-100 uppercase tracking-wider text-[9px] text-slate-500 border-b border-slate-200 font-bold select-none border-t">
                  <th className="py-2 px-3">Reference (UUID)</th>
                  <th className="py-2 px-3">Timestamp (UTC)</th>
                  <th className="py-2 px-3">Operator</th>
                  <th className="py-2 px-3">Action Context</th>
                  <th className="py-2 px-3">Entity Context</th>
                  <th className="py-2 px-3">Details Summary</th>
                  <th className="py-2 px-3">Access IP</th>
                  <th className="py-2 px-3 text-right">Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 font-sans text-slate-705">
                {filteredAudits.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-450 select-all">{log.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div>
                        <span className="font-extrabold text-slate-900 block leading-tight">{log.userId}</span>
                        <span className="text-[9.5px] uppercase font-mono font-bold text-slate-400">{log.userRole}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 font-mono text-[9px] uppercase font-bold text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.patientId ? (
                        <div>
                          <span className="text-slate-800 font-black block leading-tight">{log.patientName}</span>
                          <span className="text-[9.5px] text-slate-405 font-mono">({log.patientId})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold text-[9.5px] select-none">SYSTEM</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs max-w-xs truncate font-medium text-slate-550" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-450 select-all">{log.ipAddress.split(' ')[0]}</td>
                    <td className="py-2.5 px-3 text-right select-none">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider border ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' :
                        log.status === 'DENIED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredAudits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      No compliance transactions logged matching index filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
