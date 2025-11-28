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

    // Check MFA status
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
    // Refresh session to ensure we have valid permissions to enroll a factor
    const { error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
        console.error("Session refresh failed", refreshError);
        throw new Error("Session expired. Please sign out and sign in again.");
    }

    // CLEANUP: Attempt to remove old factors to keep the list clean.
    // We swallow errors here because we don't want to block enrollment if cleanup fails.
    try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors?.totp) {
            const factorsToRemove = factors.totp.filter((f: any) => 
                f.status === 'unverified' || 
                (f.friendly_name && f.friendly_name.startsWith('Vocalyn Authenticator'))
            );
            
            for (const factor of factorsToRemove) {
                await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }
        }
    } catch (e) {
        console.warn("Cleanup of old factors failed, proceeding with enrollment anyway.", e);
    }
    
    // Generate a unique friendly name to prevent "already exists" errors
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const friendlyName = `Vocalyn Authenticator ${uniqueSuffix}`;

    const { data, error } = await supabase.auth.mfa.enroll({ 
        factorType: 'totp', 
        issuer: 'Vocalyn',
        friendlyName: friendlyName 
    });
    
    if (error) throw error;
    return data; // Contains id, type, secret, qr_code
};

// Verify MFA Enrollment
export const verifyMFAEnrollment = async (factorId: string, code: string) => {
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
        console.error("MFA Challenge Error:", challenge.error);
        throw challenge.error;
    }

    const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
    });

    if (verify.error) {
        console.error("MFA Verify Error:", verify.error);
        throw verify.error;
    }
    
    // Refresh session to ensure claims are updated immediately
    await supabase.auth.refreshSession();
    
    return true;
};

// Disable MFA with code verification
export const disableMFA = async (code: string): Promise<User | null> => {
     // Ensure we are fresh before modifying security settings
     const { error: refreshError } = await supabase.auth.refreshSession();
     if (refreshError) throw new Error("Session expired. Please re-authenticate.");

     const { data: factors } = await supabase.auth.mfa.listFactors();
     
     if (!factors?.totp || factors.totp.length === 0) {
         // No factors exist, effectively disabled already
         return await getCurrentUser();
     }

     // Find a verified factor to validate the code against
     const verifiedFactor = factors.totp.find(f => f.status === 'verified');
     if (!verifiedFactor) {
         throw new Error("Security Error: No verified 2FA factor found to validate request.");
     }

     // Verify Code before disabling
     const challenge = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
     if (challenge.error) throw challenge.error;

     const verify = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challenge.data.id,
        code
     });

     if (verify.error) {
         throw new Error("Invalid code. Cannot disable 2FA.");
     }

     // Code is valid, proceed to unenroll ALL TOTP factors
     for (const factor of factors.totp) {
         await supabase.auth.mfa.unenroll({ factorId: factor.id });
     }
     
     await supabase.auth.refreshSession();
     return await getCurrentUser();
};

// Verify Login MFA
export const verifyLoginMFA = async (code: string): Promise<boolean> => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    
    if (!factors || !factors.totp || factors.totp.length === 0) {
        throw new Error("No MFA configuration found.");
    }

    const factor = factors.totp.find(f => f.status === 'verified');
    if (!factor) throw new Error("No verified MFA factor found.");
    
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error) throw challenge.error;
    
    const verify = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code
    });
    
    if (verify.error) throw verify.error;
    
    // Refresh session to apply AAL2 status to the current session
    await supabase.auth.refreshSession();

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