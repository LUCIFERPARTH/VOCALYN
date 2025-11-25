import { supabase } from './supabaseClient';
import type { User } from '../types';

// Get current session user
export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) return null;

        // Check MFA status via Supabase Auth API
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedMFA = factors?.totp?.some(f => f.status === 'verified') ?? false;

        return {
            id: session.user.id,
            email: session.user.email || null,
            twoFactorEnabled: hasVerifiedMFA
        };
    } catch (error) {
        console.error("Failed to retrieve user session", error);
        return null;
    }
};

// Sign In
export const signIn = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        throw new Error(error.message);
    }

    if (!data.user) {
        throw new Error("User not found.");
    }

    // Check MFA status via Supabase Auth API
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasVerifiedMFA = factors?.totp?.some(f => f.status === 'verified') ?? false;

    return {
        id: data.user.id,
        email: data.user.email || null,
        twoFactorEnabled: hasVerifiedMFA
    };
};

// Enroll in MFA (TOTP)
export const enrollMFA = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return data; // Contains id, type, secret, qr_code
};

// Verify MFA Enrollment
export const verifyMFAEnrollment = async (factorId: string, code: string) => {
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) throw challenge.error;

    const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
    });

    if (verify.error) throw verify.error;
    return true;
};

// Disable MFA
export const disableMFA = async (): Promise<User | null> => {
     const { data: factors } = await supabase.auth.mfa.listFactors();
     if (factors?.totp) {
         // Unenroll all verified factors
         const verifiedFactors = factors.totp.filter(f => f.status === 'verified');
         for (const factor of verifiedFactors) {
             await supabase.auth.mfa.unenroll({ factorId: factor.id });
         }
     }
     
     return await getCurrentUser();
};

// Verify Login MFA
export const verifyLoginMFA = async (code: string): Promise<boolean> => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find(f => f.status === 'verified');
    if (!factor) throw new Error("No MFA configuration found.");
    
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) throw challenge.error;
    
    const verify = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code
    });
    
    if (verify.error) throw verify.error;
    return true;
};

// Sign Up
export const signUp = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        throw new Error(error.message);
    }

    if (!data.user) {
        throw new Error("Sign up failed.");
    }

    return {
        id: data.user.id,
        email: data.user.email || null,
        twoFactorEnabled: false
    };
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    });
    if (error) throw error;
};

// Sign Out
export const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
};