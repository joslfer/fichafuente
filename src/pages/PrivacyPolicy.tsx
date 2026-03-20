import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { PRIVACY_POLICY_EFFECTIVE_DATE, PRIVACY_POLICY_VERSION } from "@/lib/privacy";

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <header className="mb-8 space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Politica de privacidad</h1>
          <p className="text-sm text-muted-foreground">
            Version: {PRIVACY_POLICY_VERSION} · Fecha de entrada en vigor: {PRIVACY_POLICY_EFFECTIVE_DATE}
          </p>
        </header>

        <section className="space-y-6 text-sm leading-7 text-foreground/95">
          <p>
            Esta politica describe como FichaFuente trata los datos personales dentro del uso de la aplicacion.
          </p>

          <div>
            <h2 className="text-base font-semibold">1. Datos que se recogen</h2>
            <p>
              Se recogen los datos proporcionados a traves de Google Auth:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email, nombre, identificador de usuario y foto de perfil (si aplica).</li>
              <li>Contenido creado en la app (fichas).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold">2. Uso de los datos</h2>
            <p>
              Los datos se usan unicamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permitir el acceso a la cuenta y a las fichas.</li>
              <li>Guardar y recuperar las fichas creadas en la app.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold">3. Almacenamiento</h2>
            <p>
              Los datos se almacenan en Supabase, el servicio utilizado para conservar la informacion de la app.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold">4. Comparticion de datos</h2>
            <p>
              Los datos no se comparten con terceros, excepto lo necesario para el funcionamiento de la app:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google Auth para el inicio de sesion.</li>
              <li>Supabase para el almacenamiento.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold">5. Cookies y tracking</h2>
            <p>
              No se usan cookies ni herramientas de seguimiento o analitica.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold">6. Usuarios</h2>
            <p>
              Se permite el registro a cualquier persona con una cuenta de Google.
            </p>
          </div>
        </section>

        <footer className="mt-10 flex items-center gap-4 text-sm">
          <Link to="/auth" className="text-primary underline underline-offset-2 hover:text-primary/90">
            Volver al acceso
          </Link>
        </footer>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
