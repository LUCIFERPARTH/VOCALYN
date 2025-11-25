import React, { useState, useMemo } from 'react';
import * as authService from '../services/authService';
import GoogleIcon from './icons/GoogleIcon';

interface SignUpViewProps {
    onSignUpSuccess: () => void;
    onSwitchToSignIn: () => void;
}

const Requirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <div className={`flex items-center transition-colors ${met ? 'text-green-400' : 'text-gray-500'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {met ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        </svg>
        <span>{text}</span>
    </div>
);

const SignUpView: React.FC<SignUpViewProps> = ({ onSignUpSuccess, onSwitchToSignIn }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const passwordValidity = useMemo(() => {
        const hasMinLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);
        return { hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial };
    }, [password]);

    const isValidEmail = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
    const isPasswordStrong = useMemo(() => Object.values(passwordValidity).every(Boolean), [passwordValidity]);
    const passwordsMatch = useMemo(() => password && password === confirmPassword, [password, confirmPassword]);

    const isFormValid = isValidEmail && isPasswordStrong && passwordsMatch;

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!isValidEmail) {
            setError('Please enter a valid email address.');
            return;
        }
        if (!isPasswordStrong) {
            setError("Password does not meet all requirements.");
            return;
        }
        if (!passwordsMatch) {
            setError("Passwords do not match.");
            return;
        }
        
        setIsLoading(true);
        try {
            await authService.signUp(email, password);
            onSignUpSuccess();
        } catch (err) {
            setError((err as Error).message || 'Failed to sign up. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await authService.signInWithGoogle(); // Uses the same flow for simplicity
            onSignUpSuccess();
        } catch (err) {
            setError((err as Error).message || 'Failed to sign up with Google.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm animate-fade-in">
            <h2 className="text-3xl font-bold text-center text-gray-100 mb-6">Create Account</h2>
            {error && (
                <div className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4 text-center">
                    {error}
                </div>
            )}
            <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                    <label htmlFor="email-signup" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                        type="email"
                        id="email-signup"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password-signup" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                    <input
                        type="password"
                        id="password-signup"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                        autoComplete="new-password"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs px-1">
                    <Requirement met={passwordValidity.hasMinLength} text="At least 8 characters" />
                    <Requirement met={passwordValidity.hasUpper} text="One uppercase letter" />
                    <Requirement met={passwordValidity.hasLower} text="One lowercase letter" />
                    <Requirement met={passwordValidity.hasNumber} text="One number" />
                    <Requirement met={passwordValidity.hasSpecial} text="One special character" />
                </div>
                <div>
                    <label htmlFor="confirm-password-signup" className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password-signup"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full p-3 bg-gray-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 ${confirmPassword && !passwordsMatch ? 'ring-red-500' : 'focus:ring-blue-500'}`}
                        required
                        autoComplete="new-password"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
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
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <GoogleIcon />
                    <span>Sign up with Google</span>
                </button>
            </div>
            <p className="mt-6 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <button onClick={onSwitchToSignIn} className="font-medium text-blue-400 hover:underline">
                    Sign in
                </button>
            </p>
        </div>
    );
};

export default SignUpView;