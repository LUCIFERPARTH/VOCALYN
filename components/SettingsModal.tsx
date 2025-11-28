import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import * as authService from '../services/authService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUserUpdate: (user: User) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, user, onUserUpdate }) => {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled || false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Enrollment State
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [enrollmentData, setEnrollmentData] = useState<{ id: string; secret: string; qr_code: string } | null>(null);
    const [verifyCode, setVerifyCode] = useState('');

    // Disabling State
    const [isDisabling, setIsDisabling] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTwoFactorEnabled(user.twoFactorEnabled || false);
            setError(null);
            setIsEnrolling(false);
            setIsDisabling(false);
            setEnrollmentData(null);
            setVerifyCode('');
        }
    }, [isOpen, user]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            onClose();
          }
        };
    
        if (isOpen) {
          document.addEventListener('keydown', handleKeyDown);
        }
    
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const handleStartEnrollment = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.enrollMFA();
            setEnrollmentData({
                id: data.id,
                secret: data.totp.secret,
                qr_code: data.totp.qr_code
            });
            setIsEnrolling(true);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to start enrollment. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyEnrollment = async () => {
        if (!enrollmentData || verifyCode.length !== 6) return;
        setIsLoading(true);
        setError(null);
        try {
            await authService.verifyMFAEnrollment(enrollmentData.id, verifyCode);
            setTwoFactorEnabled(true);
            setIsEnrolling(false);
            setEnrollmentData(null);
            const updatedUser = { ...user, twoFactorEnabled: true };
            onUserUpdate(updatedUser);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Invalid code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDisable = async () => {
        if (verifyCode.length !== 6) return;
        setIsLoading(true);
        setError(null);
        try {
            // Now requires code to disable
            const updatedUser = await authService.disableMFA(verifyCode);
            setTwoFactorEnabled(false);
            setIsDisabling(false);
            setVerifyCode('');
            if (updatedUser) {
                onUserUpdate(updatedUser);
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to disable 2FA. Code may be incorrect.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
            aria-labelledby="settings-modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 animate-fade-in max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <h2 id="settings-modal-title" className="text-xl font-bold text-white">
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-sm border border-red-800">
                        {error}
                    </div>
                )}
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium text-blue-300 mb-2">Security</h3>
                        
                        {/* 2FA Status Block */}
                        <div className="bg-gray-900/50 p-4 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-gray-200 font-medium">Two-Factor Authentication</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {twoFactorEnabled ? 'Active' : 'Not enabled'}
                                </p>
                            </div>
                            {!isEnrolling && !isDisabling && (
                                <button
                                    onClick={() => {
                                        if (twoFactorEnabled) {
                                            setIsDisabling(true);
                                            setVerifyCode('');
                                            setError(null);
                                        } else {
                                            handleStartEnrollment();
                                        }
                                    }}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                        twoFactorEnabled 
                                        ? 'bg-red-900/50 text-red-300 hover:bg-red-900' 
                                        : 'bg-blue-600 text-white hover:bg-blue-500'
                                    }`}
                                >
                                    {isLoading ? 'Processing...' : (twoFactorEnabled ? 'Disable' : 'Setup 2FA')}
                                </button>
                            )}
                        </div>

                        {/* Disabling Flow */}
                        {isDisabling && (
                            <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-red-900/50 animate-fade-in">
                                <h4 className="text-white font-semibold mb-2">Confirm Disabling 2FA</h4>
                                <p className="text-sm text-gray-300 mb-4">
                                    Please enter the code from your authenticator app to confirm you want to turn off security.
                                </p>
                                
                                <div className="space-y-2">
                                    <label htmlFor="verify-disable" className="block text-sm font-medium text-gray-300">
                                        Verification Code
                                    </label>
                                    <input
                                        id="verify-disable"
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-center font-mono tracking-widest focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleConfirmDisable}
                                        disabled={isLoading || verifyCode.length !== 6}
                                        className="w-full py-2 mt-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-medium disabled:opacity-50"
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify & Disable'}
                                    </button>
                                    <button
                                        onClick={() => { setIsDisabling(false); setVerifyCode(''); }}
                                        className="w-full py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Enrollment Flow */}
                        {isEnrolling && enrollmentData && (
                            <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600 animate-fade-in">
                                <h4 className="text-white font-semibold mb-2">Scan QR Code</h4>
                                <p className="text-sm text-gray-300 mb-4">
                                    Use your authenticator app (like Google Authenticator) to scan this code.
                                </p>
                                <div className="flex justify-center bg-white p-2 rounded-md mb-4 w-fit mx-auto">
                                    <img src={enrollmentData.qr_code} alt="2FA QR Code" className="w-40 h-40" />
                                </div>
                                <div className="mb-4">
                                    <p className="text-xs text-gray-400 text-center mb-1">Unable to scan?</p>
                                    <p className="text-xs text-gray-300 font-mono text-center bg-gray-800 p-1 rounded break-all select-all">
                                        {enrollmentData.secret}
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="verify-enrollment" className="block text-sm font-medium text-gray-300">
                                        Verify Code
                                    </label>
                                    <input
                                        id="verify-enrollment"
                                        type="text"
                                        value={verifyCode}
                                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white text-center font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleVerifyEnrollment}
                                        disabled={isLoading || verifyCode.length !== 6}
                                        className="w-full py-2 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium disabled:opacity-50"
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify & Activate'}
                                    </button>
                                    <button
                                        onClick={() => setIsEnrolling(false)}
                                        className="w-full py-2 text-sm text-gray-400 hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-700">
                         <div className="flex items-center justify-between text-sm text-gray-400">
                            <span>Account Email</span>
                            <span className="text-gray-200">{user.email}</span>
                         </div>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;