import React, { useState } from 'react';
import * as authService from '../services/authService';
import GoogleIcon from './icons/GoogleIcon';
import type { User } from '../types';

interface LoginViewProps {
    onLoginSuccess: () => void;
    onSwitchToSignUp: () => void;
}

const isValidEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
};

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onSwitchToSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // 2FA State
    const [show2FA, setShow2FA] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [tempUser, setTempUser] = useState<User | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const user = await authService.signIn(email, password);
            
            if (user.twoFactorEnabled) {
                setTempUser(user);
                setShow2FA(true);
                setIsLoading(false);
            } else {
                onLoginSuccess();
            }
        } catch (err) {
            setError((err as Error).message || 'Failed to sign in. Please check your credentials.');
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        // tempUser check is just to ensure we are in the right flow, though verifyLoginMFA relies on the active session
        if (!tempUser || !twoFactorCode) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const isValid = await authService.verifyLoginMFA(twoFactorCode);
            if (isValid) {
                onLoginSuccess();
            } else {
                setError('Invalid code. Please try again.');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Verification failed. Code may be expired.');
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await authService.signInWithGoogle();
            onLoginSuccess();
        } catch (err) {
            setError((err as Error).message || 'Failed to sign in with Google.');
        } finally {
            setIsLoading(false);
        }
    };

    if (show2FA) {
        return (
             <div className="w-full max-w-sm animate-fade-in">
                <h2 className="text-2xl font-bold text-center text-gray-100 mb-2">Two-Factor Authentication</h2>
                <p className="text-center text-gray-400 text-sm mb-6">
                    Enter the 6-digit code from your authenticator app.
                </p>
                
                 {error && (
                    <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleVerify2FA} className="space-y-6">
                    <div>
                        <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-300 mb-1 text-center">Authentication Code</label>
                        <input
                            type="text"
                            id="2fa-code"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full p-3 bg-gray-700 rounded-md text-gray-100 text-center text-2xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="000000"
                            maxLength={6}
                            required
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || twoFactorCode.length !== 6}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShow2FA(false);
                            setTempUser(null);
                            setTwoFactorCode('');
                            setError(null);
                        }}
                        className="w-full py-2 px-4 text-gray-400 hover:text-gray-200 transition-colors text-sm"
                    >
                        Back to Login
                    </button>
                </form>
             </div>
        );
    }

    return (
        <div className="w-full max-w-sm animate-fade-in">
            <h2 className="text-3xl font-bold text-center text-gray-100 mb-6">Sign In</h2>
            {error && (
                <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center">
                    {error}
                </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        autoComplete="current-password"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Sign In' : 'Sign In'}
                </button>
            </form>
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                </div>
            </div>
            <div>
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <GoogleIcon />
                    <span>Sign in with Google</span>
                </button>
            </div>
            <p className="mt-6 text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <button onClick={onSwitchToSignUp} className="font-medium text-blue-400 hover:underline">
                    Sign up
                </button>
            </p>
        </div>
    );
};

export default LoginView;