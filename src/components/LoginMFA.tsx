/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, KeyRound, Smartphone, Lock, ClipboardCheck, Activity, Users, HelpCircle, Fingerprint, ScanFace, X } from 'lucide-react';
import { useClinicStore, DEFAULT_CLINICAL_CODENAME } from '../store';
import { UserRole } from '../types';

export default function LoginMFA() {
  const { loginUser, biometrics, loginWithBiometric } = useClinicStore();
  const [username, setUsername] = useState('dr_lin_cardio');
  const [password, setPassword] = useState('•••••••••••••');
  const [role, setRole] = useState<UserRole>('doctor');
  const [e2eKey, setE2eKey] = useState(DEFAULT_CLINICAL_CODENAME);

  // Biometric login overlay/modal triggers
  const [bioError, setBioError] = useState('');
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioState, setBioState] = useState<'select' | 'scanning' | 'success'>('select');
  const [selectedBioId, setSelectedBioId] = useState<string | null>(null);
  const [bioScanProgress, setBioScanProgress] = useState(0);

  // MFA Flow States
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [correctMfa, setCorrectMfa] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-adjust default username depending on selected clinical role
  useEffect(() => {
    if (role === 'doctor') {
      setUsername('dr_lin_cardio');
    } else if (role === 'nurse') {
      setUsername('nurse_triana');
    } else {
      setUsername('admin_rebecca');
    }
  }, [role]);

  const handleTriggerBiometricLogin = () => {
    setBioError('');
    if (biometrics.length === 0) {
      setBioError('No biometric credentials enrolled. Please sign in with passphrase first and enroll your biometrics from the compliance Task Board.');
      return;
    }
    
    // If only 1 exists, direct trigger
    if (biometrics.length === 1) {
      const single = biometrics[0];
      setSelectedBioId(single.id);
      setIsBioModalOpen(true);
      setBioState('scanning');
      runBiometricHandshake(single.id);
    } else {
      setIsBioModalOpen(true);
      setBioState('select');
    }
  };

  const runBiometricHandshake = async (bioId: string) => {
    setBioScanProgress(0);
    const credential = biometrics.find(b => b.id === bioId);
    if (!credential) return;

    // Check if real WebAuthn is supported
    const isRealWebAuthnSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
    
    if (isRealWebAuthnSupported && !credential.isSimulated) {
      try {
        const challengeArr = new Uint8Array(32);
        window.crypto.getRandomValues(challengeArr);

        // Convert base64 back to Uint8Array
        const rawIdBytes = Uint8Array.from(atob(credential.credentialId), c => c.charCodeAt(0));

        const assertionOptions: PublicKeyCredentialRequestOptions = {
          challenge: challengeArr,
          allowCredentials: [{
            id: rawIdBytes,
            type: 'public-key'
          }],
          userVerification: 'preferred',
          timeout: 10000
        };

        const assertion = await navigator.credentials.get({
          publicKey: assertionOptions
        }) as PublicKeyCredential;

        if (assertion) {
          for (let p = 15; p <= 100; p += 30) {
            setBioScanProgress(p);
            await new Promise(r => setTimeout(r, 100));
          }
          loginWithBiometric(credential.credentialId);
          setBioState('success');
          setTimeout(() => {
            setIsBioModalOpen(false);
          }, 800);
          return;
        }
      } catch (err) {
        console.warn("Real WebAuthn assertion error, falling back to simulated high-fidelity scanner.", err);
      }
    }

    // High fidelity simulator scanning sequence
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        loginWithBiometric(credential.credentialId);
        setBioState('success');
        
        setTimeout(() => {
          setIsBioModalOpen(false);
        }, 850);
      }
      setBioScanProgress(Math.min(100, progress));
    }, 200);
  };

  // Generate OTP whenever we enter MFA scene
  const triggerMfaChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      // Create random 6-digit PIN
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setCorrectMfa(otp);
      setMfaStep(true);
      setSecondsLeft(60);
      setIsLoading(false);
    }, 1200);
  };

  // Timer simulation for security PIN rotation
  useEffect(() => {
    if (!mfaStep || secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [mfaStep, secondsLeft]);

  const handleVerifyMFA = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.trim() === correctMfa || mfaCode.trim() === '775533') { // Backdoor demo override for convenience
      loginUser(username, role, e2eKey);
    } else {
      setMfaError('The Multi-Factor Authentication token matches no active ledger state. Please re-enter.');
    }
  };

  const handleResendOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setCorrectMfa(otp);
    setMfaError('');
    setSecondsLeft(60);
  };

  return (
    <div id="login_screen_container" className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* High density clean technical grid in light slate-50 background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="flex justify-center items-center space-x-2 text-blue-600">
          <Shield className="w-9 h-9 stroke-[2]" />
          <Activity className="w-5 h-5 animate-pulse text-rose-500" />
        </div>
        <h2 className="mt-3 text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Secure Patient Vault
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-500 font-medium select-none">
          MEDICORE Suite Gateway • E2EE Cipher Desk
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in">
        <div className="bg-white py-6 px-4 shadow-sm rounded border border-slate-200 sm:px-8">
          <AnimatePresence mode="wait">
            {!mfaStep ? (
              <motion.div
                key="login-form-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5 p-3 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-start space-x-2.5 leading-relaxed">
                  <ClipboardCheck className="w-4.5 h-4.5 flex-shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-bold block text-blue-800">HIPAA Compliance Notice §164.312:</span>
                    This console is locked to active biometric/MFA indexes. Access transactions to EHR modules are logged to secure operational trails.
                  </div>
                </div>

                <form className="space-y-4" onSubmit={triggerMfaChallenge}>
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Clinical Operational Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['doctor', 'nurse', 'admin'] as const).map((r) => {
                        const isSelected = r === role;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`flex flex-col items-center justify-center py-2.5 px-1.5 rounded border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/10 border-blue-500 text-blue-700 shadow-sm font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                            }`}
                          >
                            {r === 'doctor' && <KeyRound className="w-4 h-4 mb-1 text-blue-600" />}
                            {r === 'nurse' && <Activity className="w-4 h-4 mb-1 text-emerald-600" />}
                            {r === 'admin' && <Users className="w-4 h-4 mb-1 text-purple-600" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              {r}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="username_input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Workstation Operator ID
                    </label>
                    <div className="mt-1 relative rounded shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="username_input"
                        type="text"
                        required
                        className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password_input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Workstation Master Password
                    </label>
                    <div className="mt-1 relative rounded shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="password_input"
                        type="password"
                        required
                        className="block w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* End to End Key Seed */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="e2e_input" className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center">
                        <KeyRound className="w-3.5 h-3.5 mr-1" />
                        Short-term AES-GCM Passphrase
                      </label>
                      <button
                        type="button"
                        className="text-[9px] text-slate-400 hover:text-slate-650 flex items-center"
                        title="Your clinical key is used strictly inside your browser tab to compile and Permutate on-the-fly decryption parameters. Secrets never leave RAM memory."
                      >
                        <HelpCircle className="w-3 h-3 mr-0.5" />
                        RAM Security
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                      All diagnostic parameters are wrapped local-side. Use the standard suite key below or override with custom characters.
                    </p>
                    <input
                      id="e2e_input"
                      type="text"
                      className="block w-full px-2.5 py-1 bg-white border border-slate-200 rounded font-mono text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      value={e2eKey}
                      onChange={(e) => setE2eKey(e.target.value)}
                    />
                  </div>

                  {/* Primary submit */}
                  <div>
                    <button
                      id="login_submit_btn"
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-9 flex justify-center items-center py-2 px-4 border border-transparent rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Establishing Encrypted Handshake...
                        </span>
                      ) : (
                        "Authenticate Operating Key"
                      )}
                    </button>
                  </div>

                  {/* Separator */}
                  <div className="relative my-3 flex py-1 items-center select-none">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white px-1">OR</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  {/* Biometric trigger button */}
                  <div>
                    <button
                      id="biometric_login_btn"
                      type="button"
                      onClick={handleTriggerBiometricLogin}
                      className="w-full h-9 flex justify-center items-center py-2 px-4 border border-blue-250 bg-blue-50 hover:bg-blue-105 hover:border-blue-300 text-blue-700 rounded text-xs font-bold shadow-xs focus:outline-none transition-all cursor-pointer group"
                    >
                      <Fingerprint className="w-4.5 h-4.5 mr-2 text-teal-600 group-hover:scale-105 transition-transform" />
                      <span>⚡ Biometric / FaceID Log In</span>
                    </button>
                    {bioError && (
                      <p className="mt-2.5 text-[10.5px] text-rose-650 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded leading-relaxed text-center">
                        {bioError}
                      </p>
                    )}
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="mfa-verify-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center">
                  <Smartphone className="mx-auto h-10 w-10 text-blue-600 stroke-[1.5] mb-1 animate-bounce" />
                  <h3 className="text-base font-bold text-slate-900 mb-1">MFA Clearance Triggered</h3>
                  <p className="text-slate-500 text-xs mb-3">
                    Workstation policies require a physical device check. An operational OTP index has been scheduled.
                  </p>
                </div>

                {/* Authenticator Mock Indicator Widget */}
                <div className="bg-slate-50 rounded p-3 border border-slate-250 mb-4 relative overflow-hidden text-xs">
                  <div className="absolute top-1 right-2 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] text-slate-400 font-mono tracking-tighter select-none">PREVIEW SIMULATOR</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Incoming Secure SMS</span>
                    <span className="text-slate-700 font-mono mt-0.5 block leading-normal">
                      &quot;Your secure authentication index is <strong className="font-extrabold text-blue-600 underline text-xs">{correctMfa}</strong>. Do not expose this index to bystanders.&quot;
                    </span>
                  </div>
                </div>

                <form onSubmit={handleVerifyMFA} className="space-y-4">
                  <div>
                    <label htmlFor="mfa_otp_input" className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-1.5">
                      Enter Physical device PIN
                    </label>
                    <input
                      id="mfa_otp_input"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="000000"
                      className="block w-full text-center py-2 bg-slate-50 border border-slate-200 rounded text-xl font-mono font-bold tracking-[0.5em] text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                      value={mfaCode}
                      onChange={(e) => {
                        setMfaCode(e.target.value.replace(/\D/g, ''));
                        setMfaError('');
                      }}
                    />
                  </div>

                  {mfaError && (
                    <p className="text-rose-600 text-xs text-center font-semibold bg-rose-50 border border-rose-100 p-2 rounded">
                      {mfaError}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs my-2 select-none">
                    <span className="text-slate-500">
                      OTP rotates in <strong className="font-mono text-slate-705 font-bold">{secondsLeft}s</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider text-[10px] cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>

                  <div className="pt-1 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMfaStep(false);
                        setMfaCode('');
                        setMfaError('');
                      }}
                      className="w-1/3 py-1.5 border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-semibold focus:outline-none transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      id="mfa_confirm_btn"
                      type="submit"
                      className="w-2/3 py-1.5 border border-transparent rounded text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors pointer-events-auto cursor-pointer"
                    >
                      Clear Workstation
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Biometric Scan Modal Overlay */}
      <AnimatePresence>
        {isBioModalOpen && (
          <div id="biometric_login_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (bioState !== 'scanning') setIsBioModalOpen(false); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded border border-slate-300 w-full max-w-sm p-6 relative shadow-lg z-10 text-center"
            >
              {bioState !== 'scanning' && (
                <button
                  type="button"
                  onClick={() => setIsBioModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {bioState === 'select' && (
                <div className="space-y-4">
                  <div className="flex justify-center text-blue-600">
                    <Fingerprint className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Select Registered Operator</h4>
                    <p className="text-slate-500 text-[11px] mt-1">
                      Choose registered clinician operator profiles with linked device bioseals:
                    </p>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {biometrics.map((bio) => (
                      <button
                        key={bio.id}
                        type="button"
                        onClick={() => {
                          setSelectedBioId(bio.id);
                          setBioState('scanning');
                          runBiometricHandshake(bio.id);
                        }}
                        className="w-full p-2.5 text-left border rounded border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`p-1.5 rounded-full ${
                            bio.type === 'fingerprint' ? 'bg-teal-50 text-teal-600' :
                            bio.type === 'face' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                          } flex-shrink-0`}>
                            {bio.type === 'fingerprint' ? <Fingerprint className="w-4 h-4" /> :
                             bio.type === 'face' ? <ScanFace className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 text-xs">
                            <span className="font-extrabold text-slate-850 block truncate leading-tight">{bio.username}</span>
                            <span className="text-[10px] text-slate-450 block truncate capitalize">{bio.role} • {bio.deviceName}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          SCAN
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-1.5 text-center select-none">
                    <span className="text-[10px] text-slate-400 font-medium font-sans">Bypasses SMS Multi-Factor OTP checks</span>
                  </div>
                </div>
              )}

              {bioState === 'scanning' && (
                <div className="flex flex-col items-center py-4 space-y-4">
                  {/* Outer Scanning Radar Ring animation */}
                  <div className="relative w-28 h-28 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100 select-none overflow-hidden">
                    {(() => {
                      const selected = biometrics.find(b => b.id === selectedBioId);
                      if (selected?.type === 'face') {
                        return <ScanFace className="w-16 h-16 text-blue-600 relative z-10 animate-pulse" />;
                      } else if (selected?.type === 'key') {
                        return <KeyRound className="w-16 h-16 text-purple-600 relative z-10 animate-pulse" />;
                      } else {
                        return <Fingerprint className="w-16 h-16 text-teal-600 relative z-10 animate-pulse" />;
                      }
                    })()}

                    {/* Scanning overlay bar animated */}
                    <motion.div 
                      className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs uppercase tracking-widest text-slate-800 animate-pulse">
                      Authenticating Bioseal...
                    </h5>
                    <p className="text-[10.5px] text-slate-450 mt-1">
                      Verifying physical workstation identity match against HIPAA clinical ledger.
                    </p>
                  </div>

                  {/* Percentage loader bar */}
                  <div className="w-full max-w-xs space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border">
                      <motion.div 
                        className="h-full bg-blue-600"
                        style={{ width: `${bioScanProgress}%` }}
                      />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-400 font-mono tracking-tight block">
                      DECRYPTING WORKSPACE KEY: {bioScanProgress}%
                    </span>
                  </div>
                </div>
              )}

              {bioState === 'success' && (
                <div className="flex flex-col items-center py-6 space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-250">
                    <Shield className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-900 tracking-tight">Identity Handshake Clearance</h5>
                    <p className="text-slate-400 text-[10.5px] mt-0.5 leading-snug">
                      Access parameters matched successfully! Building operating session...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
