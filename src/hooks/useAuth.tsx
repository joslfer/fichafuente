import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  markAcceptedPrivacyPolicyVersion,
  PRIVACY_POLICY_VERSION,
} from "@/lib/privacy";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  requiresPrivacyConsent: boolean;
  acceptPrivacyPolicy: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  requiresPrivacyConsent: false,
  acceptPrivacyPolicy: async () => false,
  signOut: async () => {},
});

const hasAcceptedCurrentPrivacyPolicy = (user: User | null) => {
  if (!user) return false;

  const consent = user.user_metadata?.privacy_consent as
    | { version?: string; accepted_at?: string }
    | undefined;

  return consent?.version === PRIVACY_POLICY_VERSION && Boolean(consent?.accepted_at);
};

const isNewUser = (user: User | null) => {
  if (!user?.created_at || !user.last_sign_in_at) return false;

  const createdAt = Date.parse(user.created_at);
  const lastSignInAt = Date.parse(user.last_sign_in_at);
  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return false;

  // In first login, created_at and last_sign_in_at are nearly equal.
  return Math.abs(lastSignInAt - createdAt) <= 5 * 60 * 1000;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPrivacyConsent, setRequiresPrivacyConsent] = useState(false);

  const syncPrivacyState = (nextSession: Session | null) => {
    setSession(nextSession);
    setLoading(false);

    const nextUser = nextSession?.user ?? null;
    if (hasAcceptedCurrentPrivacyPolicy(nextUser)) {
      markAcceptedPrivacyPolicyVersion(PRIVACY_POLICY_VERSION);
      setRequiresPrivacyConsent(false);
      return;
    }

    setRequiresPrivacyConsent(isNewUser(nextUser));
  };

  const acceptPrivacyPolicy = async () => {
    if (!session?.user) return false;

    const acceptedAt = new Date().toISOString();
    const { error } = await supabase.auth.updateUser({
      data: {
        privacy_policy_version: PRIVACY_POLICY_VERSION,
        privacy_consent: {
          accepted: true,
          version: PRIVACY_POLICY_VERSION,
          accepted_at: acceptedAt,
          source: "in-app-consent",
        },
      },
    });

    if (error) {
      return false;
    }

    markAcceptedPrivacyPolicyVersion(PRIVACY_POLICY_VERSION);
    setRequiresPrivacyConsent(false);

    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    return true;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncPrivacyState(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncPrivacyState(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        requiresPrivacyConsent,
        acceptPrivacyPolicy,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
