/**
 * Functional specs for the 13 tools of the crypto-hash engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real control
 * and reads the real rendered result. The expected digests are the published
 * test vectors - RFC 1321 for MD5, FIPS 180-1 for SHA-1 and FIPS 180-4 for
 * SHA-256 and SHA-512 - and the JWT expectations follow RFC 7515.
 *
 * The four decoders are checked with a real certificate and a real
 * certificate signing request: the files are read from the fixtures folder
 * and every expected value is established with node:crypto, never with the
 * code of the site. A stub that only prints a label cannot pass these
 * specs.
 */

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { X509Certificate, createHash } from "node:crypto";

import {
  spec,
  fillArea,
  clickButton,
  workspaceText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertMatches,
  sleep,
} from "../lib/test-helpers.mjs";

/* --------------------------------------------------------------- helpers -- */

/** The text of the engine panel only, without the page chrome around it. */
async function panel(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    return root.innerText || "";
  });
}

/** Every label and control the engine panel offers. */
async function panelLabels(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const t = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const parts = [];
    root
      .querySelectorAll("button, label, option, h1, h2, h3, h4, p, span, td")
      .forEach((el) => {
        const s = t(el);
        if (s && s.length < 140) parts.push(s);
      });
    root.querySelectorAll("input, select, textarea").forEach((el) => {
      parts.push(el.getAttribute("placeholder") || "");
      parts.push(el.getAttribute("aria-label") || "");
    });
    return parts;
  });
}

/** Every control of the engine panel with its label. */
async function panelControls(page) {
  return page.evaluate(() => {
    const hosts = Array.from(document.querySelectorAll("main div")).filter(
      (d) => d.className === "mt-6",
    );
    const root = hosts[0] || document.querySelector("main") || document.body;
    const t = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    return Array.from(root.querySelectorAll("button, input, select, textarea")).map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") || "",
      text: t(el).slice(0, 60),
      placeholder: el.getAttribute("placeholder") || "",
      aria: el.getAttribute("aria-label") || "",
    }));
  });
}

/** Assert that the panel offers a control that matches one of the keywords. */
async function requireControlByLabel(page, keywords, what) {
  const controls = await panelControls(page);
  const found = controls.some((c) =>
    keywords.some((k) =>
      `${c.text} ${c.placeholder} ${c.aria}`.toLowerCase().includes(k.toLowerCase()),
    ),
  );
  assert(
    found,
    `the tool offers no ${what} control (looked for ${keywords.join(", ")}; the panel has: ${controls
      .map((c) => `${c.tag}:${c.text || c.placeholder || c.aria}`)
      .join(" | ")
      .slice(0, 400)})`,
  );
}

/** The digest shown in the hash card with the given label. */
async function hashValue(page, label) {
  return page.evaluate((wanted) => {
    const el = Array.from(document.querySelectorAll("main span")).find(
      (s) => (s.textContent || "").trim() === wanted,
    );
    if (!el || !el.parentElement) return null;
    const value = el.parentElement.nextElementSibling;
    return value ? (value.textContent || "").trim() : null;
  }, label);
}

/** The generated password. */
async function generatedPassword(page) {
  return page.evaluate(() => {
    const el = document.querySelector("main span.select-all");
    return el ? (el.textContent || "").trim() : null;
  });
}

/** The value of the field with the given label. */
async function factValue(page, label) {
  return page.evaluate((wanted) => {
    const nodes = Array.from(document.querySelectorAll("main dt"));
    const el = nodes.find((node) => (node.textContent || "").trim() === wanted);
    if (!el || !el.nextElementSibling) return null;
    return (el.nextElementSibling.textContent || "").trim();
  }, label);
}

/* --------------------------------------------------------------- fixtures -- */

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(here, "..", "fixtures");

/**
 * A real certificate and a real certificate signing request.
 *
 * Both files were written once with OpenSSL and are kept with the specs:
 *
 *   audit-cert.pem  a certificate for "audit.example.com", signed by the
 *                   audit root CA, with the alternative name
 *                   "DNS:audit.example.com", an RSA key with 2048 bits and
 *                   a validity that ends on the 21st of October 2036.
 *   audit-csr.pem   the signing request for the same key and the same
 *                   subject.
 */
const CERT_PEM = readFileSync(join(FIXTURE_DIR, "audit-cert.pem"), "utf8");
const CSR_PEM = readFileSync(join(FIXTURE_DIR, "audit-csr.pem"), "utf8");

/** The time of a date in the notation of a DER UTCTime. */
function derTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${String(date.getUTCFullYear()).slice(2)}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/**
 * The expected values, established with node:crypto.
 *
 * Node reads the certificate on its own, so the expectations do not depend
 * on the code of the site: the fingerprint is the SHA-256 digest over the
 * DER bytes of the file and the key size is the length of the modulus.
 */
const certificate = new X509Certificate(CERT_PEM);
const CERT_DER = certificate.raw;
const EXPECTED_SUBJECT = certificate.subject.split("\n").join(", ");
const EXPECTED_ISSUER = certificate.issuer.split("\n").join(", ");
const EXPECTED_SAN = certificate.subjectAltName;
const EXPECTED_KEY_SIZE = `RSA ${certificate.publicKey.asymmetricKeyDetails.modulusLength} bits`;
const EXPECTED_FINGERPRINT = createHash("sha256").update(CERT_DER).digest("hex");
const EXPECTED_NOT_AFTER = derTime(certificate.validToDate);
const EXPECTED_SIZE = `${CERT_DER.length} bytes`;

/*
 * Node cannot read a signing request, so its subject is written down here.
 * It is the subject of the certificate above, because the request was the
 * request for that certificate.
 */
const EXPECTED_CSR_SUBJECT = EXPECTED_SUBJECT;

/** The DER bytes of the certificate as a hexadecimal string. */
const CERT_DER_HEX = CERT_DER.toString("hex");

/** The certificate as a PEM block with the usual line breaks. */
function derToPem(der, label = "CERTIFICATE") {
  const body = der.toString("base64").replace(/(.{64})/g, "$1\n").replace(/\n$/, "");
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

/* --------------------------------------------------------------- vectors -- */

/* RFC 1321, appendix A.5 and the well known "abc" vector. */
const MD5_EMPTY = "d41d8cd98f00b204e9800998ecf8427e";
const MD5_ABC = "900150983cd24fb0d6963f7d28e17f72";
/* FIPS 180-1, appendix A and the "abc" vector. */
const SHA1_EMPTY = "da39a3ee5e6b4b0d3255bfef95601890afd80709";
const SHA1_ABC = "a9993e364706816aba3e25717850c26c9cd0d89d";
/* FIPS 180-4, the empty message and the "abc" message. */
const SHA256_EMPTY =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_ABC =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const SHA512_EMPTY =
  "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e";
const SHA512_ABC =
  "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f";

/* RFC 7519 example token: {"alg":"HS256","typ":"JWT"} / {"sub":"1234567890",...} */
const JWT_HEADER_SEGMENT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const JWT_PAYLOAD_SEGMENT =
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";
const JWT_SAMPLE = `${JWT_HEADER_SEGMENT}.${JWT_PAYLOAD_SEGMENT}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;

/**
 * A payload whose base64url encoding contains a "-".
 *
 * RFC 7515 requires the JWS header and payload to be encoded with base64url,
 * so the segment "eyJkIjoiYT9-In0" is the valid encoding of {"d":"a?~"} and a
 * decoder that only understands the plain base64 alphabet cannot read it.
 */
const JWT_PAYLOAD_BASE64URL_DASH = "eyJkIjoiYT9-In0";

/* --------------------------------------------------------------- specs ---- */

export function register() {
  spec("md5-generator", "computes the MD5 digest of the text", async (page) => {
    await fillArea(page, "abc", 0);
    await sleep(500);
    assertEqual(
      await hashValue(page, "MD5 Hash"),
      MD5_ABC,
      "MD5(\"abc\") is the RFC 1321 test vector 900150983cd24fb0d6963f7d28e17f72",
    );

    await fillArea(page, "", 0);
    await sleep(500);
    assertEqual(
      await hashValue(page, "MD5 Hash"),
      MD5_EMPTY,
      "MD5 of the empty string is d41d8cd98f00b204e9800998ecf8427e (RFC 1321)",
    );
  });

  spec("sha256-generator", "computes the SHA-256 digest of the text", async (page) => {
    await fillArea(page, "abc", 0);
    await sleep(500);
    assertEqual(
      await hashValue(page, "SHA-256 Hash"),
      SHA256_ABC,
      "SHA-256(\"abc\") is the FIPS 180-4 vector ba7816bf...15ad",
    );

    await fillArea(page, "", 0);
    await sleep(500);
    assertEqual(
      await hashValue(page, "SHA-256 Hash"),
      SHA256_EMPTY,
      "SHA-256 of the empty string is e3b0c442...b855 (FIPS 180-4)",
    );
  });

  spec("hash-generator", "computes all four digests of the text", async (page) => {
    await fillArea(page, "abc", 0);
    await sleep(500);
    assertEqual(await hashValue(page, "MD5 Hash"), MD5_ABC, "the MD5 digest is wrong");
    assertEqual(await hashValue(page, "SHA-1 Hash"), SHA1_ABC, "the SHA-1 digest is wrong");
    assertEqual(
      await hashValue(page, "SHA-256 Hash"),
      SHA256_ABC,
      "the SHA-256 digest is wrong",
    );
    assertEqual(
      await hashValue(page, "SHA-512 Hash"),
      SHA512_ABC,
      "the SHA-512 digest is wrong",
    );

    await fillArea(page, "", 0);
    await sleep(500);
    assertEqual(await hashValue(page, "MD5 Hash"), MD5_EMPTY, "the MD5 digest of the empty text is wrong");
    assertEqual(await hashValue(page, "SHA-1 Hash"), SHA1_EMPTY, "the SHA-1 digest of the empty text is wrong");
    assertEqual(
      await hashValue(page, "SHA-256 Hash"),
      SHA256_EMPTY,
      "the SHA-256 digest of the empty text is wrong",
    );
    assertEqual(
      await hashValue(page, "SHA-512 Hash"),
      SHA512_EMPTY,
      "the SHA-512 digest of the empty text is wrong",
    );
  });

  spec("jwt-decoder", "decodes the header and the payload of a token", async (page) => {
    await fillArea(page, JWT_SAMPLE, 0);
    await sleep(600);
    const text = await panel(page);
    assertIncludes(text, '"alg": "HS256"', "the header must be decoded");
    assertIncludes(text, '"typ": "JWT"', "the header must be decoded");
    assertIncludes(text, '"sub": "1234567890"', "the payload must be decoded");
    assertIncludes(text, '"name": "John Doe"', "the payload must be decoded");
    assertIncludes(text, '"iat": 1516239022', "the payload must be decoded");
    assertNotIncludes(text, "Invalid JWT", "a valid token must not be rejected");

    // RFC 7515 encodes the header and the payload with base64url, so a
    // segment may hold "-" and "_" and not only the plain base64 alphabet.
    const base64urlToken = `${JWT_HEADER_SEGMENT}.${JWT_PAYLOAD_BASE64URL_DASH}.c2lnbmF0dXJl`;
    await fillArea(page, base64urlToken, 0);
    await sleep(600);
    const urlText = await panel(page);
    assertNotIncludes(
      urlText,
      "Invalid JWT",
      "a token whose payload uses base64url characters must be decoded",
    );
    assertIncludes(urlText, '"d": "a?~"', "the base64url payload must be decoded");
  });

  spec("jwt-decoder-encoder", "decodes a token and encodes a payload", async (page) => {
    await fillArea(page, JWT_SAMPLE, 0);
    await sleep(600);
    const text = await panel(page);
    assertIncludes(text, '"alg": "HS256"', "the decoder must decode the header");
    assertIncludes(text, '"sub": "1234567890"', "the decoder must decode the payload");

    // the encoder half of the tool is missing: there is no control that turns
    // claims into a signed token.
    await requireControlByLabel(
      page,
      ["secret", "signing key", "encode", "sign"],
      "JWT encoding",
    );
  });

  spec("jwt-encoder", "encodes claims into a signed token", async (page) => {
    await fillArea(page, '{"sub":"1234567890","name":"John Doe","iat":1516239022}', 0);
    await sleep(600);
    const text = await panel(page);
    assertNotIncludes(
      text,
      "Invalid JWT",
      "an encoder must not treat the claims as a token and report them as invalid",
    );
    // a signed JWT is three base64url segments separated by two dots
    const token = await page.evaluate(() => {
      const el = document.querySelector("main textarea");
      return el ? (el.value || "").trim() : "";
    });
    assertMatches(
      token,
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/,
      "the encoder must produce a JWT made of three base64url segments",
    );
  });

  spec("password-generator", "generates a password of the requested length", async (page) => {
    await page.locator('main input[type="range"]').fill("24");
    await sleep(500);
    const text = await panel(page);
    const announced = /Password Length:\s*(\d+)/.exec(text);
    assert(announced, `the tool must show the requested length, panel says: ${text.slice(0, 200)}`);
    const password = await generatedPassword(page);
    assertEqual(
      password.length,
      Number(announced[1]),
      `the tool announces ${announced[1]} characters but shows a ${password.length} character password`,
    );
    assertMatches(
      password,
      /^[A-Za-z0-9!@#$%^&*()\-_=+\[\]{}|;:,.<>?]+$/,
      "the password may only use the offered characters",
    );

    // a fresh generation must honour the requested length as well
    await clickButton(page, "Regenerate Password");
    await sleep(500);
    assertEqual(
      (await generatedPassword(page)).length,
      Number(announced[1]),
      "the regenerated password must have the announced length",
    );
  });

  spec("random-password-generator", "generates a different password every time", async (page) => {
    const first = await generatedPassword(page);
    await clickButton(page, "Regenerate Password");
    await sleep(500);
    const second = await generatedPassword(page);
    assert(second !== first, "regenerating must produce a different password");
    assertEqual(second.length, 16, "the password keeps the default length of 16 characters");
  });

  spec("strong-password-generator", "mixes every enabled character class", async (page) => {
    await page.locator('main input[type="range"]').fill("64");
    await sleep(400);
    await clickButton(page, "Regenerate Password");
    await sleep(500);
    const password = await generatedPassword(page);
    assertEqual(password.length, 64, "the password must have the requested length");
    assertMatches(password, /[A-Z]/, "a strong password must contain an upper case letter");
    assertMatches(password, /[a-z]/, "a strong password must contain a lower case letter");
    assertMatches(password, /[0-9]/, "a strong password must contain a digit");
    assertMatches(password, /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/, "a strong password must contain a symbol");
  });

  spec("asn1-decoder", "decodes the tags and the values of an ASN.1 structure", async (page) => {
    // SEQUENCE { INTEGER 1, INTEGER 5 }
    await fillArea(page, "30 06 02 01 01 02 01 05", 0);
    await clickButton(page, "Decode the structure");
    await sleep(600);
    let text = await panel(page);
    assertIncludes(text, "SEQUENCE (2 entries)", "the decoder must show the structure");
    assertIncludes(text, "INTEGER 1", "the decoder must show the value of the first integer");
    assertIncludes(text, "INTEGER 5", "the decoder must show the value of the second integer");

    // the structure of the real certificate
    await fillArea(page, CERT_DER_HEX, 0);
    await clickButton(page, "Decode the structure");
    await sleep(800);
    text = await panel(page);
    assertIncludes(
      text,
      "OBJECT IDENTIFIER 2.5.4.3 (CN)",
      "the decoder must name the object identifiers of the certificate",
    );
    assertIncludes(
      text,
      "audit.example.com",
      "the decoder must show the common name of the certificate",
    );
    assertIncludes(
      text,
      "OBJECT IDENTIFIER 2.5.29.17 (subjectAltName)",
      "the decoder must show the extension of the certificate",
    );
    assertNotIncludes(
      text,
      "MD5 Hash",
      "an ASN.1 decoder must not be a hash generator",
    );
  });

  spec("csr-decoder", "decodes a certificate signing request", async (page) => {
    await fillArea(page, CSR_PEM, 0);
    await clickButton(page, "Decode the structure");
    await sleep(700);

    assertEqual(
      await factValue(page, "Subject"),
      EXPECTED_CSR_SUBJECT,
      "the decoder must show the subject of the signing request",
    );
    assertEqual(
      await factValue(page, "Key size"),
      EXPECTED_KEY_SIZE,
      "the decoder must show the size of the key of the signing request",
    );
    const text = await panel(page);
    assertIncludes(
      text,
      "sha256WithRSAEncryption",
      "the decoder must show the algorithm of the signature",
    );
    assertNotIncludes(text, "MD5 Hash", "a CSR decoder must not be a hash generator");
  });

  spec("pem-decoder", "decodes a PEM block and shows its fingerprint", async (page) => {
    await fillArea(page, CERT_PEM, 0);
    await clickButton(page, "Decode the structure");
    await sleep(700);

    assertEqual(
      await factValue(page, "PEM label"),
      "CERTIFICATE",
      "the decoder must show the label of the PEM block",
    );
    assertEqual(
      await factValue(page, "Size"),
      EXPECTED_SIZE,
      "the decoder must show the size of the DER bytes of the block",
    );
    assertEqual(
      await factValue(page, "SHA-256 fingerprint"),
      EXPECTED_FINGERPRINT,
      "the decoder must show the SHA-256 fingerprint of the DER bytes",
    );

    // PEM -> DER -> PEM has to reproduce the input, and the result has to
    // decode to the very same certificate.
    const roundTrip = derToPem(CERT_DER);
    assertEqual(
      roundTrip,
      CERT_PEM,
      "the round trip from PEM to DER and back must reproduce the input",
    );

    await fillArea(page, roundTrip, 0);
    await clickButton(page, "Decode the structure");
    await sleep(700);
    assertEqual(
      await factValue(page, "SHA-256 fingerprint"),
      EXPECTED_FINGERPRINT,
      "the certificate of the round trip must have the same fingerprint",
    );
  });

  spec("ssl-certificate-decoder", "decodes the fields of an X.509 certificate", async (page) => {
    await fillArea(page, CERT_PEM, 0);
    await clickButton(page, "Decode the structure");
    await sleep(700);

    assertEqual(
      await factValue(page, "Subject"),
      EXPECTED_SUBJECT,
      "the decoder must show the subject of the certificate",
    );
    assertEqual(
      await factValue(page, "Issuer"),
      EXPECTED_ISSUER,
      "the decoder must show the issuer of the certificate",
    );
    assertEqual(
      await factValue(page, "Alternative names"),
      EXPECTED_SAN,
      "the decoder must show the alternative name of the certificate",
    );
    assertEqual(
      await factValue(page, "Key size"),
      EXPECTED_KEY_SIZE,
      "the decoder must show the size of the key of the certificate",
    );
    assertEqual(
      await factValue(page, "Valid until"),
      EXPECTED_NOT_AFTER,
      "the decoder must show the end of the validity of the certificate",
    );
    assertEqual(
      await factValue(page, "SHA-256 fingerprint"),
      EXPECTED_FINGERPRINT,
      "the decoder must show the SHA-256 fingerprint of the certificate",
    );

    const text = await panel(page);
    assertNotIncludes(text, "MD5 Hash", "a certificate decoder must not be a hash generator");
  });
}
