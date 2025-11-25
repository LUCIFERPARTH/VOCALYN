
import React, { useState } from 'react';
import LoginView from './LoginView';
import SignUpView from './SignUpView';

interface AuthProps {
    onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
                    Vocalyn
                </h1>
                <p className="text-gray-400 mt-2">Your AI Emotional Knowledge Companion</p>
            </div>
            <div className="w-full max-w-sm bg-gray-800/50 rounded-2xl shadow-2xl p-8">
                {isLoginView ? (
                    <LoginView onLoginSuccess={onAuthSuccess} onSwitchToSignUp={() => setIsLoginView(false)} />
                ) : (
                    <SignUpView onSignUpSuccess={onAuthSuccess} onSwitchToSignIn={() => setIsLoginView(true)} />
                )}
            </div>
        </div>
    );
};

export default Auth;
