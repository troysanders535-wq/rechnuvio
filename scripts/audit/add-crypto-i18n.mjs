/**
 * Add the crypto workspace strings to the message catalogues.
 *
 * Usage: node scripts/audit/add-crypto-i18n.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const EN = {
  jwtTokenPlaceholder: "Paste a JWT here...",
  jwtHeaderLabel: "HEADER: Algorithm & Token Type",
  jwtPayloadLabel: "PAYLOAD: Data Claims",
  jwtEncoderHeading: "Encode and sign a token",
  jwtSigningKey: "Signing key (secret)",
  jwtSigningKeyPlaceholder: "Signing key (secret) used for the HMAC signature",
  jwtAlgorithm: "Algorithm",
  jwtClaimsLabel: "Claims (JSON)",
  jwtClaimsPlaceholder: '{"sub":"1234567890","name":"John Doe","iat":1516239022}',
  jwtSignedTokenLabel: "Signed token",
  jwtEncoderNote:
    "The token is signed with HMAC-SHA256 in your browser. The signing key never leaves your device.",
  copyToken: "Copy token",
  editClaimsAgain: "Edit the claims again",

  asn1DecoderTitle: "ASN.1 Decoder",
  asn1DecoderSubtitle: "Read the tag, length and value of every ASN.1 structure.",
  asn1DecoderPlaceholder:
    "Paste a DER structure as a hexadecimal string, for example 30 06 02 01 01 02 01 05",
  csrDecoderTitle: "CSR Decoder",
  csrDecoderSubtitle: "Read the subject and the public key of a certificate signing request.",
  csrDecoderPlaceholder: "Paste a PEM encoded certificate signing request here...",
  pemDecoderTitle: "PEM Decoder",
  pemDecoderSubtitle: "Read a PEM block and the structure it carries.",
  pemDecoderPlaceholder: "Paste a PEM block, for example -----BEGIN CERTIFICATE-----",
  sslCertificateDecoderTitle: "SSL Certificate Decoder",
  sslCertificateDecoderSubtitle: "Read the issuer, the subject and the validity of an X.509 certificate.",
  sslCertificateDecoderPlaceholder: "Paste a PEM encoded certificate here...",

  clear: "Clear",
  decodeStructure: "Decode the structure",
  decodedStructure: "Decoded structure",
  emptyInput: "Please paste a document first.",
  loadExample: "Load example",
  pemNotReadable:
    "This is neither a PEM block nor a hexadecimal string. A PEM block starts with -----BEGIN and a DER input is written as hex bytes.",
  hexNotReadable: "The hexadecimal input is not valid: it needs an even number of hex digits.",
  derNotReadable: "The bytes could not be read as a DER structure.",
  csrNotReadable: "This PEM block does not carry a certificate signing request.",
  certificateNotReadable: "This PEM block does not carry an X.509 certificate.",

  pemLabel: "PEM label",
  pemSize: "Size",
  pemHeader: "Header byte",

  csrVersion: "Version",
  csrSubject: "Subject",
  csrPublicKey: "Public key",
  csrSignatureAlgorithm: "Signature algorithm",

  certificateVersion: "Version",
  certificateSerial: "Serial number",
  certificateIssuer: "Issuer",
  certificateSubject: "Subject",
  certificateValidFrom: "Valid from",
  certificateValidUntil: "Valid until",
  certificateAlgorithm: "Signature algorithm",
  certificatePublicKey: "Public key",
  certificateAlternativeNames: "Alternative names",
};

const DE = {
  jwtTokenPlaceholder: "JWT hier einfügen ...",
  jwtHeaderLabel: "HEADER: Algorithmus & Tokentyp",
  jwtPayloadLabel: "PAYLOAD: Datenansprüche",
  jwtEncoderHeading: "Token kodieren und signieren",
  jwtSigningKey: "Signaturschlüssel (Secret)",
  jwtSigningKeyPlaceholder: "Signaturschlüssel (Secret) für die HMAC-Signatur",
  jwtAlgorithm: "Algorithmus",
  jwtClaimsLabel: "Ansprüche (JSON)",
  jwtClaimsPlaceholder: '{"sub":"1234567890","name":"John Doe","iat":1516239022}',
  jwtSignedTokenLabel: "Signiertes Token",
  jwtEncoderNote:
    "Das Token wird in Ihrem Browser mit HMAC-SHA256 signiert. Der Signaturschlüssel verlässt Ihr Gerät nie.",
  copyToken: "Token kopieren",
  editClaimsAgain: "Ansprüche erneut bearbeiten",

  asn1DecoderTitle: "ASN.1-Decoder",
  asn1DecoderSubtitle: "Tag, Länge und Wert jeder ASN.1-Struktur lesen.",
  asn1DecoderPlaceholder:
    "Eine DER-Struktur als Hexadezimal einfügen, zum Beispiel 30 06 02 01 01 02 01 05",
  csrDecoderTitle: "CSR-Decoder",
  csrDecoderSubtitle: "Subject und öffentlichen Schlüssel einer Zertifikatsanfrage lesen.",
  csrDecoderPlaceholder: "Eine PEM-kodierte Zertifikatsanfrage hier einfügen ...",
  pemDecoderTitle: "PEM-Decoder",
  pemDecoderSubtitle: "Einen PEM-Block und die enthaltene Struktur lesen.",
  pemDecoderPlaceholder: "Einen PEM-Block einfügen, zum Beispiel -----BEGIN CERTIFICATE-----",
  sslCertificateDecoderTitle: "SSL-Zertifikat-Decoder",
  sslCertificateDecoderSubtitle:
    "Aussteller, Subject und Gültigkeit eines X.509-Zertifikats lesen.",
  sslCertificateDecoderPlaceholder: "Ein PEM-kodiertes Zertifikat hier einfügen ...",

  clear: "Leeren",
  decodeStructure: "Struktur auswerten",
  decodedStructure: "Ausgewertete Struktur",
  emptyInput: "Bitte zuerst ein Dokument einfügen.",
  loadExample: "Beispiel laden",
  pemNotReadable:
    "Das ist weder ein PEM-Block noch eine Hexadezimalfolge. Ein PEM-Block beginnt mit -----BEGIN, eine DER-Eingabe wird als Hex-Bytes geschrieben.",
  hexNotReadable:
    "Die Hexadezimaleingabe ist ungültig: Sie braucht eine gerade Anzahl von Hex-Ziffern.",
  derNotReadable: "Die Bytes konnten nicht als DER-Struktur gelesen werden.",
  csrNotReadable: "Dieser PEM-Block enthält keine Zertifikatsanfrage.",
  certificateNotReadable: "Dieser PEM-Block enthält kein X.509-Zertifikat.",

  pemLabel: "PEM-Kennung",
  pemSize: "Größe",
  pemHeader: "Header-Byte",

  csrVersion: "Version",
  csrSubject: "Subject",
  csrPublicKey: "Öffentlicher Schlüssel",
  csrSignatureAlgorithm: "Signaturalgorithmus",

  certificateVersion: "Version",
  certificateSerial: "Seriennummer",
  certificateIssuer: "Aussteller",
  certificateSubject: "Subject",
  certificateValidFrom: "Gültig ab",
  certificateValidUntil: "Gültig bis",
  certificateAlgorithm: "Signaturalgorithmus",
  certificatePublicKey: "Öffentlicher Schlüssel",
  certificateAlternativeNames: "Alternative Namen",
};

const enPath = join(root, "src", "messages", "en.json");
const dePath = join(root, "src", "messages", "de.json");

const en = JSON.parse(readFileSync(enPath, "utf8"));
const de = JSON.parse(readFileSync(dePath, "utf8"));

en.ui.engines.CryptoHashEngine = { ...(en.ui.engines.CryptoHashEngine || {}), ...EN };
de.ui.engines.CryptoHashEngine = { ...(de.ui.engines.CryptoHashEngine || {}), ...DE };

writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(dePath, JSON.stringify(de, null, 2) + "\n", "utf8");

const missingDe = Object.keys(EN).filter((key) => !(key in de.ui.engines.CryptoHashEngine));
console.log(`en keys: ${Object.keys(en.ui.engines.CryptoHashEngine).length}`);
console.log(`de keys: ${Object.keys(de.ui.engines.CryptoHashEngine).length}`);
console.log(missingDe.length ? `MISSING in de: ${missingDe.join(", ")}` : "German coverage complete");
