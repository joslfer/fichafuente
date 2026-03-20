export const PRIVACY_POLICY_VERSION = "2026-03-20";
export const PRIVACY_POLICY_EFFECTIVE_DATE = "20 de marzo de 2026";

const PENDING_PRIVACY_CONSENT_KEY = "fichafuente_pending_privacy_consent";
const ACCEPTED_PRIVACY_POLICY_VERSION_KEY = "fichafuente_accepted_privacy_policy_version";

type PendingPrivacyConsent = {
  acceptedAt: string;
  version: string;
  source: "auth-google";
};

export const savePendingPrivacyConsent = () => {
  if (typeof window === "undefined") return;

  const payload: PendingPrivacyConsent = {
    acceptedAt: new Date().toISOString(),
    version: PRIVACY_POLICY_VERSION,
    source: "auth-google",
  };

  localStorage.setItem(PENDING_PRIVACY_CONSENT_KEY, JSON.stringify(payload));
};

export const getPendingPrivacyConsent = (): PendingPrivacyConsent | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PENDING_PRIVACY_CONSENT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingPrivacyConsent;
    if (!parsed?.acceptedAt || !parsed?.version || !parsed?.source) {
      localStorage.removeItem(PENDING_PRIVACY_CONSENT_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(PENDING_PRIVACY_CONSENT_KEY);
    return null;
  }
};

export const clearPendingPrivacyConsent = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_PRIVACY_CONSENT_KEY);
};

export const markAcceptedPrivacyPolicyVersion = (version = PRIVACY_POLICY_VERSION) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCEPTED_PRIVACY_POLICY_VERSION_KEY, version);
};

export const hasAcceptedPrivacyPolicyVersion = (version = PRIVACY_POLICY_VERSION) => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ACCEPTED_PRIVACY_POLICY_VERSION_KEY) === version;
};
