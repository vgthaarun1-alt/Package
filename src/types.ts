/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'doctor' | 'nurse' | 'admin';

export interface RolePermissions {
  role: UserRole;
  title: string;
  clearanceLevel: number; // 1 (Admin), 2 (Nurse), 3 (Doctor)
  canViewClinicalNotes: boolean;
  canEditClinicalNotes: boolean;
  canPrescribe: boolean;
  canSchedule: boolean;
  canExportAuditLogs: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  doctor: {
    role: 'doctor',
    title: 'Physician (MD/DO)',
    clearanceLevel: 3,
    canViewClinicalNotes: true,
    canEditClinicalNotes: true,
    canPrescribe: true,
    canSchedule: true,
    canExportAuditLogs: true,
  },
  nurse: {
    role: 'nurse',
    title: 'Clinical Nurse (RN/NP)',
    clearanceLevel: 2,
    canViewClinicalNotes: true,
    canEditClinicalNotes: false, // Reads notes, can append vitals/vitals logs but not overwrite doctor notes
    canPrescribe: false,
    canSchedule: true,
    canExportAuditLogs: false,
  },
  admin: {
    role: 'admin',
    title: 'Clinic Administrator',
    clearanceLevel: 1,
    canViewClinicalNotes: false, // HIPAA Minimum Necessary Access rule
    canEditClinicalNotes: false,
    canPrescribe: false,
    canSchedule: true,
    canExportAuditLogs: true,
  },
};

export interface UserSession {
  username: string;
  role: UserRole;
  token: string;
  mfaVerified: boolean;
  mfaMethod: 'sms' | 'authenticator';
  e2eKey: string; // Encryption key derived during session creation and stored in memory only
}

export interface PatientDemographics {
  id: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  bloodType: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
}

// Stored securely, protected by End-to-End Encryption
export interface EncryptedClinicalData {
  diagnosis: string;       // Encrypted ciphertext
  prescriptions: string;   // Encrypted ciphertext
  treatmentNotes: string;  // Encrypted ciphertext
  allergies: string;       // Encrypted ciphertext
}

export interface DecryptedClinicalData {
  diagnosis: string;
  prescriptions: string;
  treatmentNotes: string;
  allergies: string;
}

export interface PatientRecord {
  id: string;
  demographics: PatientDemographics;
  encryptedData: EncryptedClinicalData;
  vitalsLog: {
    timestamp: string;
    bp: string;
    hr: number;
    temp: number;
    addedBy: string;
  }[];
  lastUpdated: string;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'no-show';
export type SMSSentStatus = 'none' | 'queued' | 'sent' | 'delivered' | 'failed';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  reason: string;
  status: AppointmentStatus;
  smsStatus: SMSSentStatus;
  lastReminderSent?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole: UserRole;
  action: string;
  patientId?: string;
  patientName?: string;
  details: string;
  status: 'SUCCESS' | 'DENIED' | 'WARN';
  ipAddress: string;
}

export interface FHIRPatientExport {
  resourceType: 'Patient';
  id: string;
  identifier: { system: string; value: string }[];
  name: { use: string; family: string; given: string[] }[];
  telecom: { system: string; value: string; use?: string }[];
  gender: string;
  birthDate: string;
  medicalConditions?: { code: string; display: string }[];
  medications?: string[];
}

export interface BiometricCredential {
  id: string;
  username: string;
  role: UserRole;
  deviceName: string;
  type: 'fingerprint' | 'face' | 'key';
  credentialId: string; // real WebAuthn credential ID or a simulated random hash
  createdAt: string;
  e2eKey: string; // clinical passphrase encrypted or stored locally to automatically restore decryptions
  isSimulated: boolean;
}

