import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IMPRESSUM, hasImpressum, pageAlternates } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung von Rechnuvio (rechnuvio.de) gemäß § 5 DDG.",
  alternates: pageAlternates("/impressum"),
};

/** Renders only once IMPRESSUM in src/lib/brand.ts is filled in. */
export default function ImpressumPage() {
  if (!hasImpressum()) notFound();
  const i = IMPRESSUM;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Impressum</h1>

      <section className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Angaben gemäß § 5 DDG</h2>
          <p className="mt-2">
            {i.name}
            <br />
            {i.street}
            <br />
            {i.city}
            <br />
            {i.country}
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Kontakt</h2>
          <p className="mt-2">
            E-Mail: {i.email}
            {i.phone && (
              <>
                <br />
                Telefon: {i.phone}
              </>
            )}
          </p>
        </div>

        {i.vatId && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Umsatzsteuer-ID</h2>
            <p className="mt-2">Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {i.vatId}</p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p className="mt-2">{i.responsible || i.name}, Anschrift wie oben</p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hinweis zu den Rechnern</h2>
          <p className="mt-2">
            Alle Rechner auf rechnuvio.de werden sorgfältig geprüft. Die Ergebnisse dienen der Orientierung und
            ersetzen keine steuerliche, rechtliche oder medizinische Beratung.
          </p>
        </div>
      </section>
    </div>
  );
}
