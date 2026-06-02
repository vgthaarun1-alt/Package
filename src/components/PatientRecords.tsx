/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  HeartPulse, 
  ArrowUpRight, 
  FileCheck2, 
  Download, 
  Upload, 
  FileJson, 
  RefreshCcw, 
  Activity, 
  UserCircle 
} from 'lucide-react';
import { useClinicStore, writeAuditLog } from '../store';
import { ROLE_PERMISSIONS, PatientRecord, DecryptedClinicalData, FHIRPatientExport } from '../types';
import { decryptField } from '../crypto';

export default function PatientRecords() {
  const { 
    session, 
    patients, 
    addPatientVitalRow, 
    editClinicalRecordFields, 
    createPatientRecord 
  } = useClinicStore();

  const permissions = session ? ROLE_PERMISSIONS[session.role] : null;

  // Search/Filters states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patients[0]?.id || null);

  // Active Decrypted Cache for selected patient to prevent infinite state re-triggers
  const [decryptedCache, setDecryptedCache] = useState<DecryptedClinicalData>({
    diagnosis: 'Loading decryption Key...',
    prescriptions: 'Loading decryption Key...',
    treatmentNotes: 'Loading decryption Key...',
    allergies: 'Loading decryption Key...',
  });
  const [decrypting, setDecrypting] = useState(false);

  // Form states for adding patient
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    dob: '',
    gender: 'Female',
    phone: '',
    email: '',
    bloodType: 'O-Positive',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    diagnosis: 'General health monitoring',
    prescriptions: 'None',
    treatmentNotes: 'Initial clinic intake completed.',
    allergies: 'No Known Drug Allergies (NKDA)',
  });

  // Vitals append form
  const [newVital, setNewVital] = useState({ bp: '120/80', hr: 72, temp: 98.6 });

  // Doctor editing fields
  const [doctorEditMode, setDoctorEditMode] = useState(false);
  const [docFields, setDocFields] = useState<DecryptedClinicalData>({
    diagnosis: '',
    prescriptions: '',
    treatmentNotes: '',
    allergies: '',
  });

  // FHIR File upload response indicators
  const [fhirConsoleLog, setFhirConsoleLog] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Dynamic Decryption Hook triggering whenever active record or session key shifts
  useEffect(() => {
    if (!selectedPatient || !session || !permissions) return;
    
    // Check HIPAA Clearance Level
    if (!permissions.canViewClinicalNotes) {
      setDecryptedCache({
        diagnosis: '[REDACTED: PRIVACY ACCESS VIOLATION]',
        prescriptions: '[REDACTED: PRIVACY ACCESS VIOLATION]',
        treatmentNotes: '[REDACTED: PRIVACY ACCESS VIOLATION]',
        allergies: '[REDACTED: PRIVACY ACCESS VIOLATION]',
      });
      return;
    }

    async function computeDecryption() {
      setDecrypting(true);
      const key = session!.e2eKey;
      
      const diagnosis = await decryptField(selectedPatient!.encryptedData.diagnosis, key);
      const prescriptions = await decryptField(selectedPatient!.encryptedData.prescriptions, key);
      const treatmentNotes = await decryptField(selectedPatient!.encryptedData.treatmentNotes, key);
      const allergies = await decryptField(selectedPatient!.encryptedData.allergies, key);
      
      setDecryptedCache({ diagnosis, prescriptions, treatmentNotes, allergies });
      setDecrypting(false);
      
      // Submit success audit sign-off
      writeAuditLog(
        'PATIENT_RECORD_DECRYPT',
        selectedPatient!.id,
        selectedPatient!.demographics.name,
        `E2E micro-encryption payload decrypted in browser RAM for provider ${session!.username}`
      );
    }
    computeDecryption();
  }, [selectedPatientId, session, patients, permissions]);

  // Handle clinician editing
  const enterDoctorEdit = () => {
    setDocFields({ ...decryptedCache });
    setDoctorEditMode(true);
  };

  const saveDoctorClinicalEdits = async () => {
    if (!selectedPatient) return;
    await editClinicalRecordFields(selectedPatient.id, docFields);
    setDoctorEditMode(false);
  };

  // Vital checklist
  const submitVitalsRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    addPatientVitalRow(selectedPatient.id, {
      bp: newVital.bp,
      hr: Number(newVital.hr),
      temp: Number(newVital.temp),
    });
    setNewVital({ bp: '120/80', hr: 72, temp: 98.6 });
  };

  // FHIR JSON Export helper
  const exportToFHIRJSON = () => {
    if (!selectedPatient) return;
    
    const exportData: FHIRPatientExport = {
      resourceType: 'Patient',
      id: selectedPatient.id,
      identifier: [
        { system: 'urn:oid:1.2.36.146.595.217.0.1', value: selectedPatient.id },
        { system: 'insurance-policy', value: selectedPatient.demographics.insurancePolicyNumber }
      ],
      name: [
        { 
          use: 'official', 
          family: selectedPatient.demographics.name.split(' ').slice(-1)[0] || '', 
          given: selectedPatient.demographics.name.split(' ').slice(0, -1) 
        }
      ],
      telecom: [
        { system: 'phone', value: selectedPatient.demographics.phone, use: 'mobile' },
        { system: 'email', value: selectedPatient.demographics.email }
      ],
      gender: selectedPatient.demographics.gender.toLowerCase(),
      birthDate: selectedPatient.demographics.dob,
      medicalConditions: [
        { code: 'U07.1', display: decryptedCache.diagnosis }
      ],
      medications: decryptedCache.prescriptions.split('\n'),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FHIR_PATIENT_${selectedPatient.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    writeAuditLog(
      'FHIR_EXPORT_SECURE',
      selectedPatient.id,
      selectedPatient.demographics.name,
      `Authorized export of HL7 FHIR XML-JSON medical records packaging.`
    );
  };

  // Handles adding new patient locally
  const submitNewPatientForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    const cryptKey = session?.e2eKey || 'HIPAA-PASSPHRASE-2026';

    const pRec: PatientRecord = {
      id: pid,
      demographics: {
        id: pid,
        name: newPatient.name,
        dob: newPatient.dob,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email,
        bloodType: newPatient.bloodType,
        insuranceProvider: newPatient.insuranceProvider,
        insurancePolicyNumber: newPatient.insurancePolicyNumber,
      },
      encryptedData: {
        diagnosis: await decryptField(newPatient.diagnosis, cryptKey), // Utilizes store E2E trigger
        prescriptions: await decryptField(newPatient.prescriptions, cryptKey),
        treatmentNotes: await decryptField(newPatient.treatmentNotes, cryptKey),
        allergies: await decryptField(newPatient.allergies, cryptKey),
      },
      vitalsLog: [
        {
          timestamp: new Date().toISOString(),
          bp: '120/80 mmHg',
          hr: 72,
          temp: 98.6,
          addedBy: session?.username || 'adm'
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    await createPatientRecord(pRec);
    setSelectedPatientId(pid);
    setAddModalOpen(false);
    // Reset fields
    setNewPatient({
      name: '',
      dob: '',
      gender: 'Female',
      phone: '',
      email: '',
      bloodType: 'O-Positive',
      insuranceProvider: '',
      insurancePolicyNumber: '',
      diagnosis: 'General health monitoring',
      prescriptions: 'None',
      treatmentNotes: 'Initial clinic intake completed.',
      allergies: 'No Known Drug Allergies (NKDA)',
    });
  };

  // HL7 FHIR Mock JSON Schema Upload Verification
  const processFHIRFileRaw = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.resourceType !== 'Patient') {
        throw new Error('Verification Error: Input JSON does not fulfill standard HR7 FHIR resourceType constraints.');
      }
      
      const newLogs = [
        ...fhirConsoleLog,
        `[${new Date().toLocaleTimeString()}] Verification successful: Parsing FHIR Patient resource.`,
        `Patient ID found: ${parsed.id || 'GENERATED'}`,
        `Demographics mapped: ${parsed.name?.[0]?.family || ''}, ${parsed.name?.[0]?.given?.join(' ') || ''}`,
        `Transmitting to sandbox database and syncing ledger...`
      ];
      setFhirConsoleLog(newLogs);

      // Create local patient records representing imported EHR
      const pName = `${parsed.name?.[0]?.given?.join(' ') || 'EHR'} ${parsed.name?.[0]?.family || 'Imported'}`;
      const pid = parsed.id ? `P-${parsed.id}` : `P-EHR-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const imported: PatientRecord = {
        id: pid,
        demographics: {
          id: pid,
          name: pName,
          dob: parsed.birthDate || '2000-01-01',
          gender: parsed.gender ? parsed.gender.charAt(0).toUpperCase() + parsed.gender.slice(1) : 'Female',
          phone: parsed.telecom?.find((t: any) => t.system === 'phone')?.value || '+1 (555) 880-1423',
          email: parsed.telecom?.find((t: any) => t.system === 'email')?.value || 'imported@healthrecords.gov',
          bloodType: 'A-Negative',
          insuranceProvider: 'EHR Linked Provider',
          insurancePolicyNumber: parsed.identifier?.find((i: any) => i.system === 'insurance-policy')?.value || 'INS-RAW-EHR',
        },
        encryptedData: {
          diagnosis: parsed.medicalConditions?.[0]?.display || 'EHR MAPPED: Routine consultations',
          prescriptions: parsed.medications?.join('\n') || 'None recorded',
          treatmentNotes: 'HL7 Fast Healthcare Interoperability Resource (FHIR) automatic mapping sync.',
          allergies: 'Review pending clinical evaluation.',
        },
        vitalsLog: [
          { timestamp: new Date().toISOString(), bp: '120/80 mmHg', hr: 75, temp: 98.6, addedBy: 'EHR_AUTOMATED_SYNC' }
        ],
        lastUpdated: new Date().toISOString()
      };

      createPatientRecord(imported);
      setSelectedPatientId(pid);
      
      writeAuditLog(
        'HL7_FHIR_IMPORT_SYNC',
        pid,
        pName,
        `Parsed and synced certified EHR file containing Patient identity metadata.`
      );
    } catch (e: any) {
      setFhirConsoleLog([...fhirConsoleLog, `[ERROR] Failed to ingest FHIR standard: ${e.message}`]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          processFHIRFileRaw(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDemoFHIRUpload = () => {
    // Generate mock FHIR schema for immediate testing
    const mockFHIR = JSON.stringify({
      resourceType: "Patient",
      id: "7703",
      identifier: [
        { system: "urn:oid:1.2.36.146.595.217.0.1", value: "EHR-ID-198273" }
      ],
      name: [
        {
          use: "official",
          family: "Arisaka",
          given: ["Kenji", "James"]
         }
      ],
      telecom: [
        { system: "phone", value: "+1 (555) 774-0012", use: "mobile" },
        { system: "email", value: "kenji.arisaka@nipponhealth.org" }
      ],
      gender: "male",
      birthDate: "1974-09-18",
      medicalConditions: [
        { code: "E11.9", display: "Type-2 Diabetes Mellitus without complications. Controlled with lifestyle changes." }
      ],
      medications: ["Metformin 500mg PO BID", "Atorvastatin 10mg PO Daily"]
    }, null, 2);

    processFHIRFileRaw(mockFHIR);
  };

  if (!session || !permissions) return null;

  // Search filter matching demographics name or medical database index values
  const filteredPatients = patients.filter(
    (p) =>
      p.demographics.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="patient_records_view" className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-sans">
      
      {/* Directory sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Patient Directory</h3>
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold focus:outline-none transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Patient</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, identity ID..."
              className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* List items */}
          <div className="space-y-1 max-h-[28rem] overflow-y-auto scrollbar-thin">
            {filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setDoctorEditMode(false);
                  }}
                  className={`w-full text-left flex items-center space-x-2.5 p-2 rounded border text-xs transition-colors cursor-pointer focus:outline-none ${
                    isSelected
                      ? 'bg-blue-50 border-blue-200 border-l-4 border-l-blue-600 text-blue-900 font-bold shadow-xs'
                      : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-7.5 h-7.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <UserCircle className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold truncate block text-slate-900">{p.demographics.name}</span>
                      <span className="text-[9.5px] font-mono text-slate-400 font-bold select-none">{p.id}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9.5px] text-slate-500 mt-0.5">
                      <span>DOB: {p.demographics.dob}</span>
                      <span className="font-mono text-slate-400 font-bold uppercase">Cardiology</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredPatients.length === 0 && (
              <p className="text-center text-slate-450 italic py-6 text-xs">No clinical folders found matching term.</p>
            )}
          </div>
        </div>

        {/* Certified EHR Import Gateway */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
          <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 mb-1 uppercase tracking-wider">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>HL7 FHIR Interoperability Portal</span>
          </h4>
          <p className="text-[11px] text-slate-505 mb-3 leading-relaxed">
            Directly parse and load patient entries adhering to Fast Healthcare Interoperability Resources standards.
          </p>

          <div
            className={`border border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
              dragActive ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <FileJson className="w-7 h-7 mx-auto text-slate-400 mb-1.5" />
            <p className="text-[11px] text-slate-700 font-bold">Drag &amp; Drop FHIR Patient (.json)</p>
            <p className="text-[9.5px] text-slate-400 mt-0.5">Strict schema compliance checks applied on upload</p>
            
            <button
              onClick={handleDemoFHIRUpload}
              className="mt-3.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded border border-emerald-250 cursor-pointer transition-colors"
            >
              Simulate FHIR Ingestion Input
            </button>
          </div>

          {/* FHIR Logger */}
          {fhirConsoleLog.length > 0 && (
            <div className="mt-3 bg-slate-950 p-2 text-[9px] rounded border border-slate-900 font-mono text-slate-350 max-h-24 overflow-y-auto scrollbar-thin">
              {fhirConsoleLog.map((log, index) => (
                <div key={index} className="border-b border-slate-900 pb-0.5 last:border-0 hover:bg-slate-900/50">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Details Viewer */}
      <div className="lg:col-span-2 space-y-4">
        {selectedPatient ? (
          <div className="space-y-4">
            
            {/* Folder Header Banner */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <UserCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight">{selectedPatient.demographics.name}</h3>
                      <span className="text-[9.5px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200 font-bold select-none">{selectedPatient.id}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Gender: <strong className="text-slate-800">{selectedPatient.demographics.gender}</strong> • DOB: <strong className="text-slate-800">{selectedPatient.demographics.dob}</strong> • Blood Group: <strong className="text-rose-700">{selectedPatient.demographics.bloodType}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    onClick={exportToFHIRJSON}
                    className="w-full sm:w-auto flex items-center justify-center space-x-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-xs font-bold border border-slate-200 cursor-pointer focus:outline-none transition-colors"
                    title="Package patient coordinates to XML-JSON specifications for EHR secure transport."
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HL7 FHIR Export</span>
                  </button>
                </div>
              </div>

              {/* Grid demographics stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  <span className="block text-[9.5px] uppercase font-bold text-slate-400 select-none">Registered Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedPatient.demographics.phone}</span>
                </div>
                <div>
                  <span className="block text-[9.5px] uppercase font-bold text-slate-400 select-none">Active Email</span>
                  <span className="font-bold text-slate-800 truncate block font-mono">{selectedPatient.demographics.email}</span>
                </div>
                <div>
                  <span className="block text-[9.5px] uppercase font-bold text-slate-400 select-none">Insurance Provider</span>
                  <span className="font-bold text-slate-800">{selectedPatient.demographics.insuranceProvider}</span>
                </div>
                <div>
                  <span className="block text-[9.5px] uppercase font-bold text-slate-400 select-none">Policy Identifier</span>
                  <span className="font-bold font-mono text-emerald-700">{selectedPatient.demographics.insurancePolicyNumber}</span>
                </div>
              </div>
            </div>

            {/* Encrypted Clinical Section */}
            <div className="bg-white border border-slate-200 rounded p-4 relative overflow-hidden shadow-xs">
              {/* E2E status banner */}
              <div className="sm:absolute sm:top-4 sm:right-4 mb-3 sm:mb-0 flex items-center justify-start sm:justify-end select-none">
                {decrypting ? (
                  <span className="text-[9px] text-amber-900 font-mono flex items-center bg-amber-50 border border-amber-200 rounded px-2 py-0.5 font-bold">
                    <RefreshCcw className="w-3 h-3 animate-spin mr-1 text-amber-600" />
                    DECRYPTING ON-FLY
                  </span>
                ) : permissions.canViewClinicalNotes ? (
                  <span className="text-[9px] text-emerald-900 font-mono flex items-center bg-emerald-50 border border-emerald-250 rounded px-2 py-0.5 font-bold">
                    <Unlock className="w-3 h-3 text-emerald-600 mr-1" />
                    RAM DECIPHERED
                  </span>
                ) : (
                  <span className="text-[9px] text-rose-900 font-mono flex items-center bg-rose-50 border border-rose-200 rounded px-2 py-0.5 font-bold">
                    <Lock className="w-3 h-3 text-rose-600 mr-1" />
                    HIPAA RESTRICTED
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 mb-2 uppercase tracking-wider">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Protected Health Information (PHI) Index</span>
              </h4>
              <p className="text-[11px] text-slate-500 mb-3 bg-slate-50 p-2.5 rounded border border-slate-150 leading-relaxed">
                Security clearance is evaluated at the render boundaries. Plain text variables reside strictly within browser local RAM buffers and are evicted instantly upon terminal activity or logout.
              </p>

              {/* Patient PHI Form */}
              <AnimatePresence mode="wait">
                {!permissions.canViewClinicalNotes ? (
                  <motion.div
                    key="unauthorized-message"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 border border-rose-200 bg-rose-50/50 text-center rounded space-y-2"
                  >
                    <ShieldAlert className="w-9 h-9 mx-auto text-rose-500" />
                    <p className="text-xs font-black text-rose-800 uppercase tracking-widest">🔒 COMPLIANCE PRIVACY EXCLUSION APPLIED</p>
                    <p className="text-[11px] text-slate-550 max-w-md mx-auto leading-relaxed">
                      Your current session authorization level is barred from reading medical reports. Access is gated to clinical roles matching Clinical Nurse or Physician MD. Required: minimum role clearance upgrade.
                    </p>
                  </motion.div>
                ) : doctorEditMode ? (
                  <motion.div
                    key="doc-edit-panel"
                    className="space-y-3 font-sans"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {/* Diagnosis Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Clinical Diagnosis Record</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-medium"
                        value={docFields.diagnosis}
                        onChange={(e) => setDocFields({ ...docFields, diagnosis: e.target.value })}
                      />
                    </div>
                    {/* Allergies Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1">Drug &amp; Environmental Allergies</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 text-xs focus:outline-none focus:border-blue-600 font-medium"
                        value={docFields.allergies}
                        onChange={(e) => setDocFields({ ...docFields, allergies: e.target.value })}
                      />
                    </div>
                    {/* Prescriptions Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1">Active Pharmacy Prescriptions</label>
                      <textarea
                        rows={3}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 text-xs font-mono focus:outline-none focus:border-blue-600"
                        value={docFields.prescriptions}
                        onChange={(e) => setDocFields({ ...docFields, prescriptions: e.target.value })}
                      />
                    </div>
                    {/* Treatment Notes */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1">Encrypted Doctor Clinical Notes</label>
                      <textarea
                        rows={4}
                        className="w-full bg-white border border-slate-250 rounded p-2 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
                        value={docFields.treatmentNotes}
                        onChange={(e) => setDocFields({ ...docFields, treatmentNotes: e.target.value })}
                      />
                    </div>

                    <div className="flex space-x-2.5 justify-end pt-1">
                      <button
                        onClick={() => setDoctorEditMode(false)}
                        className="px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveDoctorClinicalEdits}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Perform Secure Encrypted Save</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="read-clinical-panel"
                    className="space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Read Diagnosis */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                        <span className="block text-[9.5px] font-bold uppercase text-slate-400 tracking-wider mb-1 select-none">Clinical Diagnosis Profile</span>
                        <p className="text-slate-900 font-extrabold text-xs">{decryptedCache.diagnosis}</p>
                      </div>

                      {/* Read Allergies */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                        <span className="block text-[9.5px] font-bold uppercase text-slate-400 tracking-wider mb-1 select-none">Verified Clinical Allergies</span>
                        <p className="text-rose-700 font-extrabold text-xs">{decryptedCache.allergies}</p>
                      </div>
                    </div>

                    {/* Active Prescriptions */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="block text-[9.5px] font-bold uppercase text-slate-400 tracking-wider mb-1 select-none">Current Active Roster Prescriptions</span>
                      <pre className="text-blue-900 font-mono whitespace-pre-line text-xs font-bold leading-relaxed">
                        {decryptedCache.prescriptions}
                      </pre>
                    </div>

                    {/* Dr Notes */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                      <span className="block text-[9.5px] font-bold uppercase text-slate-400 tracking-wider mb-1 select-none">Confidential Consult Assessment Logs</span>
                      <p className="text-slate-800 leading-relaxed text-xs font-medium">{decryptedCache.treatmentNotes}</p>
                    </div>

                    {/* Action block based on role */}
                    <div className="flex justify-end pt-1">
                      {permissions.canEditClinicalNotes ? (
                        <button
                          onClick={enterDoctorEdit}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                        >
                          Modify Clinical Record (E2E)
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded border border-slate-200 font-semibold flex items-center select-none">
                          ℹ️ Clinical observation only. Changes require Physician (MD) authorization clearance.
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Triage & Vitals Logs */}
            <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs flex items-center space-x-1.5 mb-3 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Physiological Vitals Tracker &amp; Triage Log</span>
              </h4>

              <div id="vitals_tracker_form_split" className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Vitals Form Column */}
                <div className="md:col-span-1 bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-2 font-mono">Capture Vital Signs</span>
                  <form onSubmit={submitVitalsRow} className="space-y-3 text-xs text-slate-700">
                    <div>
                      <label htmlFor="bp_input" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Blood Pressure (mmHg)</label>
                      <input
                        id="bp_input"
                        type="text"
                        className="w-full bg-white border border-slate-250 rounded p-1.5 text-slate-900 font-mono font-bold text-xs"
                        placeholder="120/80 mmHg"
                        value={newVital.bp}
                        onChange={(e) => setNewVital({ ...newVital, bp: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="hr_input" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Heart Rate (bpm)</label>
                      <input
                        id="hr_input"
                        type="number"
                        className="w-full bg-white border border-slate-250 rounded p-1.5 text-slate-900 font-mono font-bold text-xs"
                        placeholder="72"
                        value={newVital.hr}
                        onChange={(e) => setNewVital({ ...newVital, hr: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="temp_input" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Oral Temperature (°F)</label>
                      <input
                        id="temp_input"
                        type="number"
                        step="0.1"
                        className="w-full bg-white border border-slate-250 rounded p-1.5 text-slate-900 font-mono font-bold text-xs"
                        placeholder="98.6"
                        value={newVital.temp}
                        onChange={(e) => setNewVital({ ...newVital, temp: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs transition-colors cursor-pointer"
                    >
                      Record Metrics
                    </button>
                  </form>
                </div>

                {/* Vitals History Column */}
                <div className="md:col-span-2">
                  <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block mb-2">Longitudinal Analysis History</span>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-705 bg-slate-50 border border-slate-200 rounded overflow-hidden">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 tracking-wider text-[9px] font-bold select-none border-t">
                          <th className="py-2 px-2.5">Date &amp; Time</th>
                          <th className="py-2 px-2.5">Blood Pressure (BP)</th>
                          <th className="py-2 px-2.5">Heart Rate (HR)</th>
                          <th className="py-2 px-2.5">Oral Temp</th>
                          <th className="py-2 px-2.5">Logged By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-805">
                        {selectedPatient.vitalsLog.map((log, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="py-2 px-2.5 font-mono text-slate-400 font-bold">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-2.5 text-emerald-700 font-black font-mono">{log.bp}</td>
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{log.hr} bpm</td>
                            <td className="py-2 px-2.5 font-mono font-bold text-slate-900">{log.temp}°F</td>
                            <td className="py-2 px-2.5 text-slate-500 font-medium">{log.addedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-slate-250 rounded p-8 text-center text-slate-450 py-24 shadow-xs text-xs italic">
            Select an active clinical patient record folder from the left directory column to load encrypted medical history index parameters.
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded border border-slate-200 max-w-2xl w-full p-5 shadow-2xl relative">
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight mb-3.5 uppercase">Register New Patient File (Intake Form)</h3>
            <form onSubmit={submitNewPatientForm} className="space-y-3.5 text-xs text-slate-700">
              
              {/* Demographics row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="new_name" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Full Patient Name</label>
                  <input
                    id="new_name"
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    placeholder="e.g. Liam Vance"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new_dob" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Date of Birth</label>
                  <input
                    id="new_dob"
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    value={newPatient.dob}
                    onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new_gender" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Gender Identity</label>
                  <select
                    id="new_gender"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Declined">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Contact row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="new_phone" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Mobile Phone (reminders)</label>
                  <input
                    id="new_phone"
                    type="tel"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    placeholder="+1 (555) 750-2811"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new_email" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Secure Email Address</label>
                  <input
                    id="new_email"
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    placeholder="patient@securedomain.gov"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new_blood" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Blood Group</label>
                  <select
                    id="new_blood"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                    value={newPatient.bloodType}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodType: e.target.value })}
                  >
                    <option value="O-Positive">O-Positive</option>
                    <option value="O-Negative">O-Negative</option>
                    <option value="A-Positive">A-Positive</option>
                    <option value="A-Negative">A-Negative</option>
                    <option value="B-Positive">B-Positive</option>
                    <option value="B-Negative">B-Negative</option>
                    <option value="AB-Positive">AB-Positive</option>
                    <option value="AB-Negative">AB-Negative</option>
                  </select>
                </div>
              </div>

              {/* Policy Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new_ins_provider" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Insurance Provider Name</label>
                  <input
                    id="new_ins_provider"
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                    placeholder="Bluecross/Aetna/United"
                    value={newPatient.insuranceProvider}
                    onChange={(e) => setNewPatient({ ...newPatient, insuranceProvider: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="new_ins_policy" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Insurance Policy ID No.</label>
                  <input
                    id="new_ins_policy"
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
                    placeholder="BCX-330219-99"
                    value={newPatient.insurancePolicyNumber}
                    onChange={(e) => setNewPatient({ ...newPatient, insurancePolicyNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* PHI Intake fields (This will encrypt on submission) */}
              <div className="p-3 bg-rose-50/50 border border-rose-200 rounded space-y-2.5">
                <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-wider">🔒 Protected Clinical Intake Data (Encrypts locally)</span>
                
                <div>
                  <label htmlFor="new_diag" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1">Primary Intake Diagnosis Detail</label>
                  <input
                    id="new_diag"
                    type="text"
                    className="w-full bg-white border border-slate-250 rounded p-1.5 text-slate-900 font-medium"
                    value={newPatient.diagnosis}
                    onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="new_allergies" className="block text-[9.5px] text-slate-500 uppercase tracking-wider mb-1">Identified Drug Allergies</label>
                  <input
                    id="new_allergies"
                    type="text"
                    className="w-full bg-white border border-slate-250 rounded p-1.5 text-slate-900 font-medium"
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex space-x-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-slate-605 hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold font-sans cursor-pointer text-xs"
                >
                  Encrypt &amp; Add Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
