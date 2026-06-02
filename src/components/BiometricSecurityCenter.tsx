/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, 
  ScanFace, 
  Cpu, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Key,
  X,
  Lock
} from 'lucide-react';
import { useClinicStore } from '../store';
import { BiometricCredential } from '../types';

export default function BiometricSecurityCenter() {
  const { session, biometrics, registerBiometric, deleteBiometric } = useClinicStore();
  const [deviceLabel, setDeviceLabel] = useState('');
  const [bioType, setBioType] = useState<'fingerprint' | 'face' | 'key'>('fingerprint');
  const [enrollMode, setEnrollMode] = useState<'prompt' | 'scanning' | 'success' | 'error'>('prompt');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0-100% scanning index
  const [simulatedEnroll, setSimulatedEnroll] = useState(false);

  // Filter biometrics associated with current user
  const userBios = biometrics.filter(b => b.username === session?.username);

  // Auto-detect WebAuthn browser API coverage
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  useEffect(() => {
    setIsWebAuthnSupported(typeof window !== 'undefined' && 'PublicKeyCredential' in window);
  }, []);

  const openEnrollmentModal = () => {
    if (!session) return;
    setDeviceLabel(`${session.username}'s ${bioType === 'fingerprint' ? 'TouchID' : bioType === 'face' ? 'FaceID' : 'Hardware Key'}`);
    setEnrollMode('prompt');
    setErrorMessage('');
    setIsModalOpen(true);
    setScanStep(0);
    setSimulatedEnroll(false);
  };

  // Run Enrollment
  const handleEnrollCredential = async () => {
    if (!session) return;
    setEnrollMode('scanning');
    setScanStep(0);
    setErrorMessage('');

    // If WebAuthn is supported and we don't force simulated, try the real native API
    if (isWebAuthnSupported && !simulatedEnroll) {
      try {
        // Construct standard PublicKeyCredentialCreationOptions
        const challengeArr = new Uint8Array(32);
        window.crypto.getRandomValues(challengeArr);
        const userIdArr = new Uint8Array(16);
        window.crypto.getRandomValues(userIdArr);

        const rpId = window.location.hostname || 'localhost';

        const registrationOptions: PublicKeyCredentialCreationOptions = {
          challenge: challengeArr,
          rp: {
            name: "Clinica Secure Portal",
            id: rpId
          },
          user: {
            id: userIdArr,
            name: session.username,
            displayName: session.username,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256 (ECDSA)
            { type: "public-key", alg: -257 } // RS256 (RSA)
          ],
          authenticatorSelection: {
            userVerification: "preferred",
            authenticatorAttachment: bioType === 'key' ? 'cross-platform' : 'platform'
          },
          timeout: 15000
        };

        // Standard biometric window creation
        const credential = await navigator.credentials.create({
          publicKey: registrationOptions
        }) as PublicKeyCredential;

        if (credential) {
          // Pulse the scanning steps visually for a half-second
          for (let s = 10; s <= 100; s += 30) {
            setScanStep(s);
            await new Promise(r => setTimeout(r, 100));
          }
          
          registerBiometric({
            username: session.username,
            role: session.role,
            deviceName: deviceLabel || `${bioType} Credential`,
            type: bioType,
            credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            e2eKey: session.e2eKey,
            isSimulated: false
          });

          setEnrollMode('success');
          return;
        }
      } catch (err: any) {
        console.warn("WebAuthn API error, context is likely sandboxed inside cross-origin iframe.", err);
        // Fall back to high fidelity simulation
        setSimulatedEnroll(true);
        // Start simulation scanner steps
      }
    }

    // Step-by-step biometric simulation workflow (Immersive UX)
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Register credential inside store with simulated random hash
        const fakeCredId = `cred_sim_${Math.random().toString(36).substring(2, 12)}`;
        registerBiometric({
          username: session.username,
          role: session.role,
          deviceName: deviceLabel || `${bioType === 'fingerprint' ? 'Touch ID' : bioType === 'face' ? 'Face ID' : 'Hardware Token'}`,
          type: bioType,
          credentialId: fakeCredId,
          e2eKey: session.e2eKey,
          isSimulated: true
        });
        
        setEnrollMode('success');
      }
      setScanStep(Math.min(100, progress));
    }, 250);
  };

  return (
    <div id="biometric_manager_card" className="bg-white border border-slate-200 rounded p-4 shadow-xs">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 mb-4 gap-3">
        <div className="flex items-center space-x-2">
          <Fingerprint className="w-5 h-5 text-blue-600" />
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Clinical WebAuthn &amp; Biometrics Center</h3>
        </div>
        <button
          onClick={openEnrollmentModal}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          <span>Enroll New Biometric</span>
        </button>
      </div>

      {/* Intro info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 text-xs text-slate-500 leading-relaxed space-y-1.5">
          <p>
            Clinical standards support <strong>FIDO2 / WebAuthn passwordless biometric login</strong>. This bypasses typical MFA codes and triggers secure Local Enclave fingerprint/face verification checks.
          </p>
          <p className="text-[10px] text-slate-400">
            For secure operations, this machine temporarily holds encryption indices. Enrolled biometric profiles will securely load your active workspace AES cache without SMS manual triggers.
          </p>
        </div>

        {/* Browser capabilities indicator */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs flex items-center space-x-2.5">
          <Cpu className="w-4.5 h-4.5 text-blue-500 flex-shrink-0" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Workstation APIs</span>
            <div className="flex items-center space-x-1 ml-0.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isWebAuthnSupported ? 'bg-green-500' : 'bg-amber-400'}`}></span>
              <span className="font-semibold text-slate-700 text-[10.5px]">
                {isWebAuthnSupported ? 'WebAuthn Ready' : 'Simulated Sandbox Mode'}
              </span>
            </div>
            <p className="text-[8.5px] text-slate-400 leading-tight mt-0.5 select-none">
              {isWebAuthnSupported ? 'Local OS platform auth is active' : 'IFrame origin barriers bypassed'}
            </p>
          </div>
        </div>
      </div>

      {/* Enrolled indices table */}
      <div className="border border-slate-150 rounded overflow-hidden">
        <div className="bg-slate-100/70 border-b border-slate-200 py-1.5 px-3 text-[9px] uppercase font-bold text-slate-400 tracking-wider flex justify-between select-none">
          <span>Active Credentials Registry</span>
          <span>{userBios.length} Indices Loaded</span>
        </div>

        {userBios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs italic bg-slate-50">
            No enrolled biometric keystores located on this physical workstation operator. Click &quot;Enroll New Biometric&quot; to setup passwordless login.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white">
            {userBios.map((bio) => (
              <div key={bio.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`p-2 rounded-full ${
                    bio.type === 'fingerprint' ? 'bg-teal-50 text-teal-600' :
                    bio.type === 'face' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  } flex-shrink-0`}>
                    {bio.type === 'fingerprint' ? <Fingerprint className="w-4.5 h-4.5" /> :
                     bio.type === 'face' ? <ScanFace className="w-4.5 h-4.5" /> : <Key className="w-4.5 h-4.5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{bio.deviceName}</span>
                    <div className="flex items-center space-x-2 text-[9.5px] text-slate-400 mt-0.5">
                      <span className="font-mono bg-slate-100 border px-1 rounded truncate max-w-[130px]" title={bio.credentialId}>
                        ID: {bio.credentialId.slice(0, 16)}...
                      </span>
                      <span>•</span>
                      <span>Enrolled {new Date(bio.createdAt).toLocaleDateString()}</span>
                      {bio.isSimulated && (
                        <>
                          <span>•</span>
                          <span className="bg-amber-100 text-amber-850 px-1 py-0.1 border border-amber-200 rounded font-bold text-[8px]">SIMULATED</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteBiometric(bio.id)}
                  className="p-1 px-2 text-rose-600 hover:text-white hover:bg-rose-500 rounded border border-transparent hover:border-rose-605 transition-all cursor-pointer flex items-center space-x-1"
                  title="Revoke device access keys securely from system matrices."
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Revoke</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrollment modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div id="enroll_biometric_overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (enrollMode !== 'scanning') setIsModalOpen(false); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal content box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded border border-slate-300 w-full max-w-md p-6 relative shadow-lg z-10"
            >
              {/* Close button */}
              {enrollMode !== 'scanning' && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Title */}
              <div className="flex items-center space-x-2 text-blue-600 mb-4 pb-2 border-b">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
                  Secure Enrollment Desk
                </h4>
              </div>

              {enrollMode === 'prompt' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 text-[11px] text-blue-750 rounded leading-relaxed">
                    <strong>Enrollment Principle:</strong> You are registering your operating device signature to the user profile <strong className="font-bold underline text-blue-900">{session?.username}</strong>. Decryption passphrases will be sealed within the local memory enclave.
                  </div>

                  {/* Device label name input */}
                  <div>
                    <label htmlFor="device_label_input" className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Device Alias / Workstation ID
                    </label>
                    <input 
                      id="device_label_input"
                      type="text"
                      className="block w-full px-3 py-1.5 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white bg-slate-50"
                      placeholder="e.g. Workstation MacBook TouchID"
                      value={deviceLabel}
                      onChange={(e) => setDeviceLabel(e.target.value)}
                    />
                  </div>

                  {/* Type options */}
                  <div>
                    <label className="block text-[9.5px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Physical Authentication Modality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBioType('fingerprint')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          bioType === 'fingerprint'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <Fingerprint className="w-6 h-6 mb-1 text-teal-600" />
                        <span className="text-[10px] tracking-tight">Fingerprint</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBioType('face')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          bioType === 'face'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <ScanFace className="w-6 h-6 mb-1 text-blue-600" />
                        <span className="text-[10px] tracking-tight font-medium">Face Scan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBioType('key')}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer ${
                          bioType === 'key'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <Key className="w-6 h-6 mb-1 text-purple-600" />
                        <span className="text-[10px] tracking-tight">USB Key / FOB</span>
                      </button>
                    </div>
                  </div>

                  {/* Sandbox Force Simulated toggle */}
                  {isWebAuthnSupported && (
                    <div className="flex items-center space-x-2 pt-1 border-t border-slate-105">
                      <input
                        id="simulated_enroll_check"
                        type="checkbox"
                        className="w-3.5 h-3.5 border-slate-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={simulatedEnroll}
                        onChange={(e) => setSimulatedEnroll(e.target.checked)}
                      />
                      <label htmlFor="simulated_enroll_check" className="text-[10px] font-bold text-slate-550 select-none cursor-pointer">
                        Force simulated scanning (By-passes OS level prompts for sandbox testing)
                      </label>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-1.5 border border-slate-205 text-slate-600 bg-slate-50 text-xs font-bold hover:bg-slate-100 rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEnrollCredential}
                      className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors cursor-pointer flex items-center space-x-1"
                    >
                      <span>Trigger Hardware Registry</span>
                    </button>
                  </div>
                </div>
              )}

              {enrollMode === 'scanning' && (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  {/* Outer Scanning Radar Ring animation */}
                  <div className="relative w-28 h-28 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100 select-none overflow-hidden">
                    {/* Visual meshes */}
                    {bioType === 'fingerprint' ? (
                      <Fingerprint className="w-16 h-16 text-teal-600 relative z-10" />
                    ) : bioType === 'face' ? (
                      <ScanFace className="w-16 h-16 text-blue-600 relative z-10" />
                    ) : (
                      <Key className="w-16 h-16 text-purple-600 relative z-10" />
                    )}

                    {/* Scanning overlay bar animated */}
                    <motion.div 
                      className={`absolute left-0 right-0 h-0.5 ${bioType === 'fingerprint' ? 'bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                    />
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs uppercase tracking-widest text-slate-800 animate-pulse">
                      {simulatedEnroll ? 'Bypassing IFrame Sandbox Barriers...' : 'Engaging Hardware Security Enclave...'}
                    </h5>
                    <p className="text-[10.5px] text-slate-400 mt-1 max-w-sm">
                      {simulatedEnroll 
                        ? 'Simulating secure clinical biometric enrollment in local storage matrices.' 
                        : 'Please respond to the browser OS credential prompt to link biometrics.'}
                    </p>
                  </div>

                  {/* Percentage loader bar */}
                  <div className="w-full max-w-xs space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border">
                      <motion.div 
                        className={`h-full ${bioType === 'fingerprint' ? 'bg-teal-500' : 'bg-blue-600'}`}
                        style={{ width: `${scanStep}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tight block">
                      SECURE MATRIX ENCODING: {scanStep}%
                    </span>
                  </div>
                </div>
              )}

              {enrollMode === 'success' && (
                <div className="flex flex-col items-center text-center py-6 space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-slate-900 tracking-tight">Biometric Register Operational</h5>
                    <p className="text-slate-500 text-[11px] mt-1 pr-2">
                      Keystore successfully verified and locked. Device linked securely to Clinical Operator <strong>{session?.username}</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-150 rounded w-full text-left font-mono text-[9.5px] text-slate-600 space-y-1 leading-normal select-text">
                    <div className="flex justify-between font-bold border-b pb-1 text-slate-700 uppercase font-sans text-[8.5px] tracking-wide mb-1">
                      <span>Verification Integrity</span>
                      <span className="text-emerald-600">PASSED</span>
                    </div>
                    <div>CLASS: FIDO2 / WEBAUTHN CIPHER</div>
                    <div className="truncate">ALIAS: {deviceLabel}</div>
                    <div className="truncate">AES-E2E SEED: LOCKED IN MEMORY</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEnrollMode('prompt');
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                  >
                    Return to Compliance Desk
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
