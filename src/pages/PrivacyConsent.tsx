import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";

const PrivacyConsent = () => {
  const navigate = useNavigate();
  const { user, requiresPrivacyConsent, acceptPrivacyPolicy } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (!requiresPrivacyConsent) return <Navigate to="/" replace />;

  const handleContinue = async () => {
    if (!accepted || submitting) return;

    setSubmitting(true);
    const success = await acceptPrivacyPolicy();
    if (success) {
      navigate("/", { replace: true });
      return;
    }

    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 space-y-2 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileCheck2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Confirmacion de privacidad</h1>
          <p className="text-sm text-muted-foreground">
            Antes de usar FichaFuente, necesitamos registrar tu aceptacion de la politica de privacidad.
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="privacy-consent"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="privacy-consent" className="text-xs leading-relaxed text-muted-foreground">
            He leido y acepto la
            {" "}
            <Link
              to="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              politica de privacidad
            </Link>
            {" "}(version {PRIVACY_POLICY_VERSION}).
          </Label>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!accepted || submitting}
          className="mt-5 w-full"
        >
          {submitting ? "Guardando aceptacion..." : "Continuar"}
        </Button>
      </section>
    </main>
  );
};

export default PrivacyConsent;
