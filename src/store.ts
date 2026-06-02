/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  PatientRecord, 
  Appointment, 
  AuditLogEntry, 
  UserSession, 
  UserRole, 
  ROLE_PERMISSIONS,
  BiometricCredential
} from './types';
import { encryptField, decryptField } from './crypto';

// Default static master passphrase used to pre-encrypt default clinical records
export const DEFAULT_CLINICAL_CODENAME = 'HIPAA-PASSPHRASE-2026';

// Unique App Channel for Real-Time Sync across multiple active tabs/devices
let syncChannel: BroadcastChannel | null = null;
try {
  syncChannel = new BroadcastChannel('secure_clinic_realtime_sync_v1');
} catch (e) {
  console.warn('BroadcastChannel not supported in this frame environment:', e);
}

// Simulated automated IP address tracker for clinical terminal locations
const CLINIC_TERMINAL_IPS: Record<UserRole, string> = {
  doctor: '10.240.102.14 (Physician Office)',
  nurse: '10.240.102.21 (Nurse Triage Station-B)',
  admin: '10.240.104.5 (Reception Desk-A)',
};

// Initial Core Patient Profiles (Demonstrating HIPAA-compliant E2E-encryptions)
const INITIAL_DEMOGRAPHICS = [
  {
    id: 'P-5021',
    name: 'Eleanor Vance',
    dob: '1961-11-14',
    gender: 'Female',
    phone: '+1 (555) 724-1182',
    email: 'e.vance@clinicalhistories.org',
    bloodType: 'O-Negative',
    insuranceProvider: 'BlueCross Shield',
    insurancePolicyNumber: 'BCX-88231-102',
  },
  {
    id: 'P-9134',
    name: 'Marcus Sterling',
    dob: '1988-03-24',
    gender: 'Male',
    phone: '+1 (555) 309-8422',
    email: 'sterling.marcus@gmail.com',
    bloodType: 'A-Positive',
    insuranceProvider: 'United Healthcare',
    insurancePolicyNumber: 'UHC-4402129-91',
  },
  {
    id: 'P-1142',
    name: 'Avery Henderson',
    dob: '2001-07-09',
    gender: 'Non-Binary',
    phone: '+1 (555) 512-9904',
    email: 'avery.henderson@ucla.edu',
    bloodType: 'B-Positive',
    insuranceProvider: 'Aetna Clinical Plan',
    insurancePolicyNumber: 'AET-710842-882',
  }
];

const INITIAL_VITALS = [
  [
    { timestamp: '2026-05-31T09:12:00Z', bp: '138/82 mmHg', hr: 78, temp: 98.6, addedBy: 'nurse_triana' },
    { timestamp: '2026-06-02T10:15:00Z', bp: '124/76 mmHg', hr: 72, temp: 98.4, addedBy: 'nurse_triana' }
  ],
  [
    { timestamp: '2026-05-20T14:30:00Z', bp: '142/90 mmHg', hr: 85, temp: 99.1, addedBy: 'nurse_triana' }
  ],
  [
    { timestamp: '2026-06-01T11:00:00Z', bp: '115/70 mmHg', hr: 64, temp: 98.2, addedBy: 'nurse_triana' }
  ]
];

// Helper to pre-encrypt system records on storage boot
export async function seedInitialRecords(key: string): Promise<PatientRecord[]> {
  const seeds: PatientRecord[] = [];
  
  // Patient 0
  seeds.push({
    id: INITIAL_DEMOGRAPHICS[0].id,
    demographics: INITIAL_DEMOGRAPHICS[0],
    encryptedData: {
      diagnosis: await encryptField('Stage 2 Chronic Arterial Hypertension, Mitral Valve Regurgitation (Mild)', key),
      prescriptions: await encryptField('Lisinopril 10mg PO Daily (#30 tabs, 2 refills)\nMetoprolol Succinate 25mg PO Daily (#30 tabs, 0 refills)', key),
      treatmentNotes: await encryptField('Patient reports mild fatigue. Blood pressure has improved since Metoprolol administration. Recommended dietary sodium restriction to <1500mg daily. Next standard echocardiogram scheduled for Q3-2026.', key),
      allergies: await encryptField('Penicillin G (Severe Anaphylaxis), Sulfonamides (Mild Skin Rashes)', key),
    },
    vitalsLog: INITIAL_VITALS[0],
    lastUpdated: '2026-06-02T10:15:00Z'
  });

  // Patient 1
  seeds.push({
    id: INITIAL_DEMOGRAPHICS[1].id,
    demographics: INITIAL_DEMOGRAPHICS[1],
    encryptedData: {
      diagnosis: await encryptField('Type-1 Diabetes Mellitus with Peripheral Neuropathy symptoms', key),
      prescriptions: await encryptField('Insulin Glargine (Lantus) SoloStar 12 Units SubQ QHS\nGabapentin 300mg PO TID (#90 tabs, 3 refills)', key),
      treatmentNotes: await encryptField('Marcus is maintaining a log of blood glucose levels. Fingerstick readings are averaging 134 mg/dL. Encouraged foot evaluations daily to prevent ulceration. Prescribed Gabapentin for lower-limb burning pins-and-needles sensation.', key),
      allergies: await encryptField('No Known Drug Allergies (NKDA)', key),
    },
    vitalsLog: INITIAL_VITALS[1],
    lastUpdated: '2026-05-20T14:30:00Z'
  });

  // Patient 2
  seeds.push({
    id: INITIAL_DEMOGRAPHICS[2].id,
    demographics: INITIAL_DEMOGRAPHICS[2],
    encryptedData: {
      diagnosis: await encryptField('Generalized Anxiety Disorder (GAD), Post-Traumatic stress triggers', key),
      prescriptions: await encryptField('Sertraline (Zoloft) 50mg PO Daily (#30 tabs, 5 refills)\nHydroxyzine Pamoate 25mg PO Q6H PRN acute panic attacks', key),
      treatmentNotes: await encryptField('Avery has resumed outpatient psychological therapy. Feels positive impact of daily Sertraline. Disclosing slightly disrupted REM patterns, but panic frequencies have reduced from biweekly to nil this month.', key),
      allergies: await encryptField('Codeine phosphate (Causes severe nausea/vomiting)', key),
    },
    vitalsLog: INITIAL_VITALS[2],
    lastUpdated: '2026-06-01T11:00:00Z'
  });

  return seeds;
}

// Base Clinical Mock Appointments
const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-1002',
    patientId: 'P-5021',
    patientName: 'Eleanor Vance',
    patientPhone: '+1 (555) 724-1182',
    doctorName: 'Dr. Sarah Lin, MD',
    date: '2026-06-02',
    time: '14:30',
    reason: 'Hypertension Q2 Routine Cardiology Follow-up',
    status: 'scheduled',
    smsStatus: 'none',
  },
  {
    id: 'APT-1003',
    patientId: 'P-9134',
    patientName: 'Marcus Sterling',
    patientPhone: '+1 (555) 309-8422',
    doctorName: 'Dr. Keith Vance, MD',
    date: '2026-06-02',
    time: '15:15',
    reason: 'Endocrinology Diabetic Foot Care Log Assessment',
    status: 'arrived',
    smsStatus: 'delivered',
    lastReminderSent: '2026-06-02T08:00:22Z',
  },
  {
    id: 'APT-1004',
    patientId: 'P-1142',
    patientName: 'Avery Henderson',
    patientPhone: '+1 (555) 512-9904',
    doctorName: 'Dr. Sarah Lin, MD',
    date: '2026-06-03',
    time: '10:00',
    reason: 'General Medicine Biyearly Vitals & Prescription Reevaluation',
    status: 'confirmed',
    smsStatus: 'sent',
    lastReminderSent: '2026-06-02T12:30:00Z',
  },
  {
    id: 'APT-1001',
    patientId: 'P-5021',
    patientName: 'Eleanor Vance',
    patientPhone: '+1 (555) 724-1182',
    doctorName: 'Dr. Sarah Lin, MD',
    date: '2026-05-28',
    time: '09:00',
    reason: 'Urgent SBP Check & Lab Draws',
    status: 'completed',
    smsStatus: 'delivered',
    lastReminderSent: '2026-05-27T08:05:00Z',
  }
];

// Initial Audits according to HIPAA Rule §164.312
const INITIAL_AUDITS = (): AuditLogEntry[] => [
  {
    id: 'AUD-882190',
    timestamp: '2026-06-02T08:30:11Z',
    userId: 'admin_rebecca',
    userRole: 'admin',
    action: 'USER_LOGIN_MFA',
    details: 'MFA verified through SMS OTP. Client session initialized successfully.',
    status: 'SUCCESS',
    ipAddress: CLINIC_TERMINAL_IPS.admin,
  },
  {
    id: 'AUD-882201',
    timestamp: '2026-06-02T09:00:00Z',
    userId: 'admin_rebecca',
    userRole: 'admin',
    action: 'SYSTEM_SMS_REALLOCATE',
    details: 'Automated scheduler triggered reminder task for today\'s clinical rosters.',
    status: 'SUCCESS',
    ipAddress: CLINIC_TERMINAL_IPS.admin,
  },
  {
    id: 'AUD-882215',
    timestamp: '2026-06-02T10:00:45Z',
    userId: 'nurse_triana',
    userRole: 'nurse',
    action: 'USER_LOGIN_MFA',
    details: 'MFA successfully validated via external Clinical Authenticator App.',
    status: 'SUCCESS',
    ipAddress: CLINIC_TERMINAL_IPS.nurse,
  },
  {
    id: 'AUD-882230',
    timestamp: '2026-06-02T10:15:10Z',
    userId: 'nurse_triana',
    userRole: 'nurse',
    action: 'PATIENT_VITALS_APPEND',
    patientId: 'P-5021',
    patientName: 'Eleanor Vance',
    details: 'Appended new blood pressure entry (124/76 mmHg) and temperature records.',
    status: 'SUCCESS',
    ipAddress: CLINIC_TERMINAL_IPS.nurse,
  }
];

/**
 * Storage Helpers
 */
const getSaved = (key: string, fallback: any) => {
  try {
    const raw = localStorage.getItem(`secure_health_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveItem = (key: string, val: any) => {
  try {
    localStorage.setItem(`secure_health_${key}`, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

/**
 * Global Memory States (To avoid race conditions and simplify fast sync updates)
 */
let globalPatients: PatientRecord[] = [];
let globalAppointments: Appointment[] = [];
let globalAudits: AuditLogEntry[] = [];
let globalSession: UserSession | null = null;
let globalBiometrics: BiometricCredential[] = [];

export function getGlobalState() {
  return {
    patients: globalPatients,
    appointments: globalAppointments,
    audits: globalAudits,
    session: globalSession,
    biometrics: globalBiometrics
  };
}

// Dispatch to and from Multi-Tab Channels
type SyncMsg = 
  | { type: 'SYNC_RECORDS'; payload: PatientRecord[] }
  | { type: 'SYNC_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'SYNC_AUDITS'; payload: AuditLogEntry[] }
  | { type: 'SYNC_SESSION'; payload: UserSession | null }
  | { type: 'SYNC_BIOMETRICS'; payload: BiometricCredential[] };

// State Change Observers
const observers = new Set<() => void>();

export function subscribeToState(cb: () => void) {
  observers.add(cb);
  return () => {
    observers.delete(cb);
  };
}

function notifyObservers() {
  observers.forEach(cb => cb());
}

/**
 * Main State Mutation Actions
 */
export function setGlobalSession(session: UserSession | null) {
  globalSession = session;
  saveItem('session', session);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_SESSION', payload: session });
  notifyObservers();
}

export function writeAuditLog(
  action: string,
  patientId: string | undefined,
  patientName: string | undefined,
  details: string,
  status: 'SUCCESS' | 'DENIED' | 'WARN' = 'SUCCESS'
) {
  const currentSession = globalSession;
  const entry: AuditLogEntry = {
    id: `AUD-${Math.floor(100000 + Math.random() * 900000)}`,
    timestamp: new Date().toISOString(),
    userId: currentSession ? currentSession.username : 'SYSTEM_SCHEDULER',
    userRole: currentSession ? currentSession.role : 'admin',
    action,
    patientId,
    patientName,
    details,
    status,
    ipAddress: currentSession ? CLINIC_TERMINAL_IPS[currentSession.role] : '10.240.100.1 (System Network Cloud)'
  };

  globalAudits = [entry, ...globalAudits].slice(0, 500); // Caps at 500 records
  saveItem('audits', globalAudits);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_AUDITS', payload: globalAudits });
  notifyObservers();
}

export function updateAppointments(appts: Appointment[]) {
  globalAppointments = appts;
  saveItem('appointments', appts);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_APPOINTMENTS', payload: appts });
  notifyObservers();
}

export function updateBiometrics(bios: BiometricCredential[]) {
  globalBiometrics = bios;
  saveItem('biometrics', bios);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_BIOMETRICS', payload: bios });
  notifyObservers();
}

export async function createPatientRecord(record: PatientRecord) {
  globalPatients = [record, ...globalPatients];
  saveItem('patients', globalPatients);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_RECORDS', payload: globalPatients });
  notifyObservers();
  writeAuditLog(
    'PATIENT_RECORD_CREATE',
    record.id,
    record.demographics.name,
    `Created patient demographics & E2E encrypted structure`
  );
}

export async function updatePatientRecord(record: PatientRecord) {
  globalPatients = globalPatients.map(p => p.id === record.id ? record : p);
  saveItem('patients', globalPatients);
  if (syncChannel) syncChannel.postMessage({ type: 'SYNC_RECORDS', payload: globalPatients });
  notifyObservers();
}

/**
 * Handle incoming Sync Messages from external browser tabs/windows
 */
if (syncChannel) {
  syncChannel.onmessage = (event: MessageEvent<SyncMsg>) => {
    const msg = event.data;
    if (msg.type === 'SYNC_SESSION') {
      globalSession = msg.payload;
    } else if (msg.type === 'SYNC_RECORDS') {
      globalPatients = msg.payload;
    } else if (msg.type === 'SYNC_APPOINTMENTS') {
      globalAppointments = msg.payload;
    } else if (msg.type === 'SYNC_AUDITS') {
      globalAudits = msg.payload;
    } else if (msg.type === 'SYNC_BIOMETRICS') {
      globalBiometrics = msg.payload;
    }
    notifyObservers();
  };
}

/**
 * UseSessionStore React Hook
 * Keeps all UI states instantly in sync with global state variations and storage triggers
 */
export function useClinicStore() {
  const [session, setSession] = useState<UserSession | null>(globalSession);
  const [patients, setPatients] = useState<PatientRecord[]>(globalPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(globalAppointments);
  const [audits, setAudits] = useState<AuditLogEntry[]>(globalAudits);
  const [biometrics, setBiometrics] = useState<BiometricCredential[]>(globalBiometrics);
  const [loading, setLoading] = useState(true);

  // Initialize and read items from localStorage once on boot
  useEffect(() => {
    async function init() {
      // 1. Session load
      const savedSession = getSaved('session', null);
      globalSession = savedSession;
      setSession(savedSession);

      // Load Biometrics
      const savedBios = getSaved('biometrics', []);
      globalBiometrics = savedBios;
      setBiometrics(savedBios);

      // 2. Audit logs load
      const savedAudits = getSaved('audits', null);
      if (savedAudits) {
        globalAudits = savedAudits;
        setAudits(savedAudits);
      } else {
        const initial = INITIAL_AUDITS();
        globalAudits = initial;
        saveItem('audits', initial);
        setAudits(initial);
      }

      // 3. Appointments load
      const savedAppts = getSaved('appointments', null);
      if (savedAppts) {
        globalAppointments = savedAppts;
        setAppointments(savedAppts);
      } else {
        globalAppointments = INITIAL_APPOINTMENTS;
        saveItem('appointments', INITIAL_APPOINTMENTS);
        setAppointments(INITIAL_APPOINTMENTS);
      }

      // 4. Patients load
      const savedPatients = getSaved('patients', null);
      if (savedPatients) {
        globalPatients = savedPatients;
        setPatients(savedPatients);
      } else {
        // First boot ever: Encrypt the pre-populated records with the DEFAULT passphrase
        const initialSecured = await seedInitialRecords(DEFAULT_CLINICAL_CODENAME);
        globalPatients = initialSecured;
        saveItem('patients', initialSecured);
        setPatients(initialSecured);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Update React states whenever the global values change
  useEffect(() => {
    const handleGlobalUpdate = () => {
      setSession(globalSession);
      setPatients(globalPatients);
      setAppointments(globalAppointments);
      setAudits(globalAudits);
      setBiometrics(globalBiometrics);
    };
    return subscribeToState(handleGlobalUpdate);
  }, []);

  const loginUser = useCallback(async (username: string, role: UserRole, keyPhrase: string) => {
    const derivedKey = keyPhrase.trim() || DEFAULT_CLINICAL_CODENAME;
    const cleanUser = username.trim() || 'MD_Staff';
    
    // Check if we need to reseed initially for that custom passphrase if it completely differs
    // So that users entering a custom credential on first screen don't see empty strings
    const currentPatients = getSaved('patients', null);
    if (!currentPatients || currentPatients.length === 0) {
      const reseeded = await seedInitialRecords(derivedKey);
      globalPatients = reseeded;
      saveItem('patients', reseeded);
      setPatients(reseeded);
    }

    const newSession: UserSession = {
      username: cleanUser,
      role: role,
      token: `${role}_jwt_${Math.random().toString(36).substring(2)}`,
      mfaVerified: true,
      mfaMethod: 'authenticator',
      e2eKey: derivedKey,
    };

    setGlobalSession(newSession);
    writeAuditLog(
      'USER_LOGIN_MFA',
      undefined,
      undefined,
      `MFA Verification Passed. Session established with derived cryptographic footprint.`
    );
  }, []);

  const logoutUser = useCallback(() => {
    writeAuditLog(
      'USER_LOGOUT_MFA',
      undefined,
      undefined,
      `Clinical user session explicitly invalidated and memory keys flushed.`
    );
    setGlobalSession(null);
  }, []);

  const triggerSMSManual = useCallback((apptId: string) => {
    const refreshed = globalAppointments.map(appt => {
      if (appt.id === apptId) {
        return { ...appt, smsStatus: 'queued' as const };
      }
      return appt;
    });
    updateAppointments(refreshed);
    
    const appt = globalAppointments.find(a => a.id === apptId);
    writeAuditLog(
      'SMS_QUEUE_TRIGGER',
      appt?.patientId,
      appt?.patientName,
      `Manual HIPAA compliant SMS reminder queued for appointment ${apptId}`
    );

    // Simulate SMS delivery workflow
    setTimeout(() => {
      const sentList = globalAppointments.map(a => {
        if (a.id === apptId) {
          return { ...a, smsStatus: 'sent' as const, lastReminderSent: new Date().toISOString() };
        }
        return a;
      });
      updateAppointments(sentList);
      
      const a = globalAppointments.find(x => x.id === apptId);
      writeAuditLog(
        'SMS_TRANSMIT_SUCCESS',
        a?.patientId,
        a?.patientName,
        `Reminders gateway transmitted standard text message to carrier successfully.`
      );

      // Final delivery confirm
      setTimeout(() => {
        const deliveredList = globalAppointments.map(a => {
          if (a.id === apptId) {
            return { ...a, smsStatus: 'delivered' as const };
          }
          return a;
        });
        updateAppointments(deliveredList);
        
        const finished = globalAppointments.find(x => x.id === apptId);
        writeAuditLog(
          'SMS_CARRIER_DELIVERY',
          finished?.patientId,
          finished?.patientName,
          `Handset status callback: DELIVERED for appointment ${apptId}.`
        );
      }, 3000);
    }, 2000);

  }, []);

  const bookAppointment = useCallback((appt: Partial<Appointment>) => {
    const freshAppt: Appointment = {
      id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: appt.patientId || 'P-GUEST',
      patientName: appt.patientName || 'Demographics Needed',
      patientPhone: appt.patientPhone || '+1 (555) 000-0000',
      doctorName: appt.doctorName || 'MD Roster Provider',
      date: appt.date || new Date().toISOString().split('T')[0],
      time: appt.time || '12:00',
      reason: appt.reason || 'General wellness monitoring',
      status: 'scheduled',
      smsStatus: 'none',
    };

    const roster = [freshAppt, ...globalAppointments];
    updateAppointments(roster);
    
    writeAuditLog(
      'APPOINTMENT_SCHEDULE',
      freshAppt.patientId,
      freshAppt.patientName,
      `Scheduled clinic visit slots for ${freshAppt.date} @ ${freshAppt.time}`
    );

    // Auto-SMS reminder behavior (Queues SMS instantly to prevent manual steps)
    setTimeout(() => {
      triggerSMSManual(freshAppt.id);
    }, 1000);

  }, [triggerSMSManual]);

  const updateAppointmentStatus = useCallback((apptId: string, status: Appointment['status']) => {
    const revised = globalAppointments.map(a => a.id === apptId ? { ...a, status } : a);
    updateAppointments(revised);
    
    const appt = globalAppointments.find(x => x.id === apptId);
    writeAuditLog(
      'APPOINTMENT_STATE_MUTATE',
      appt?.patientId,
      appt?.patientName,
      `Appointment ${apptId} status changed to [${status.toUpperCase()}]`
    );
  }, []);

  const addPatientVitalRow = useCallback((patientId: string, vital: { bp: string; hr: number; temp: number }) => {
    const target = globalPatients.find(p => p.id === patientId);
    if (!target) return;

    const sessionUserName = globalSession ? globalSession.username : 'staff_clinical';
    const entry = {
      timestamp: new Date().toISOString(),
      bp: vital.bp,
      hr: vital.hr,
      temp: vital.temp,
      addedBy: sessionUserName
    };

    const modifiedRecord = {
      ...target,
      vitalsLog: [entry, ...target.vitalsLog],
      lastUpdated: new Date().toISOString()
    };

    updatePatientRecord(modifiedRecord);
    writeAuditLog(
      'PATIENT_VITALS_APPEND',
      patientId,
      target.demographics.name,
      `Appended physiological metrics BP:${vital.bp} | HR:${vital.hr}bpm | Temp:${vital.temp}°F.`
    );
  }, [session]);

  const editClinicalRecordFields = useCallback(async (
    patientId: string, 
    plainFields: { diagnosis: string; prescriptions: string; treatmentNotes: string; allergies: string }
  ) => {
    const target = globalPatients.find(p => p.id === patientId);
    if (!target) return;
    
    const cryptKey = globalSession?.e2eKey || DEFAULT_CLINICAL_CODENAME;

    // Run active cryptographic pipeline on client-side
    const encryptedData = {
      diagnosis: await encryptField(plainFields.diagnosis, cryptKey),
      prescriptions: await encryptField(plainFields.prescriptions, cryptKey),
      treatmentNotes: await encryptField(plainFields.treatmentNotes, cryptKey),
      allergies: await encryptField(plainFields.allergies, cryptKey),
    };

    const modifiedRecord = {
      ...target,
      encryptedData,
      lastUpdated: new Date().toISOString()
    };

    updatePatientRecord(modifiedRecord);
    writeAuditLog(
      'PATIENT_CLINICAL_WRITE',
      patientId,
      target.demographics.name,
      `Re-encrypted E2E clinical diagnostics, prescription structures, and evaluation notes.`
    );
  }, [session]);

  const registerBiometric = useCallback((bio: Omit<BiometricCredential, 'id' | 'createdAt'>) => {
    const newBio: BiometricCredential = {
      ...bio,
      id: `BIO-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newBio, ...globalBiometrics];
    updateBiometrics(updated);

    writeAuditLog(
      'BIOMETRIC_ENROLL',
      undefined,
      undefined,
      `Clinical staff enrolled new biometric key '${newBio.deviceName}' successfully.`
    );
  }, []);

  const deleteBiometric = useCallback((id: string) => {
    const bio = globalBiometrics.find(b => b.id === id);
    const updated = globalBiometrics.filter(b => b.id !== id);
    updateBiometrics(updated);

    writeAuditLog(
      'BIOMETRIC_REVOKE',
      undefined,
      undefined,
      `Clinical staff revoked biometric key config for '${bio?.deviceName || 'Key ID ' + id}'.`
    );
  }, []);

  const loginWithBiometric = useCallback((credentialId: string) => {
    const bio = globalBiometrics.find(b => b.credentialId === credentialId);
    if (!bio) {
      writeAuditLog(
        'BIOMETRIC_AUTH_FAIL',
        undefined,
        undefined,
        `Biometric handshake validation failed. Credential profile matching error.`,
        'DENIED'
      );
      return false;
    }

    const newSession: UserSession = {
      username: bio.username,
      role: bio.role,
      token: `${bio.role}_jwt_bio_${Math.random().toString(36).substring(2)}`,
      mfaVerified: true,
      mfaMethod: 'authenticator',
      e2eKey: bio.e2eKey,
    };

    setGlobalSession(newSession);
    writeAuditLog(
      'USER_LOGIN_BIOMETRIC',
      undefined,
      undefined,
      `Clinical Biometric verification cleared. Session footprint unlocked for user ${bio.username}.`
    );
    return true;
  }, []);

  return {
    session,
    patients,
    appointments,
    audits,
    biometrics,
    loading,
    loginUser,
    logoutUser,
    bookAppointment,
    updateAppointmentStatus,
    triggerSMSManual,
    addPatientVitalRow,
    editClinicalRecordFields,
    createPatientRecord,
    registerBiometric,
    deleteBiometric,
    loginWithBiometric
  };
}
