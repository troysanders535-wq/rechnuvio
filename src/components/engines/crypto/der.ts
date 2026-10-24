/**
 * A small DER parser.
 *
 * It reads the ASN.1 Distinguished Encoding Rules that X.509 certificates and
 * PKCS#10 certificate requests use, so the certificate decoders can show the
 * real subject, issuer and validity dates without a library.
 */

export interface DerNode {
  /** The tag byte in hex, for example "06" for an OBJECT IDENTIFIER. */
  tag: string;
  /** The decoded tag number. */
  tagNumber: number;
  /** Whether the node is constructed. */
  constructed: boolean;
  /** The raw content bytes. */
  content: Uint8Array;
  /** The child nodes of a constructed node. */
  children: DerNode[];
  /** The offset of the node in the buffer. */
  offset: number;
  /** The length of the whole node, header included. */
  totalLength: number;
}

const textDecoder = new TextDecoder("latin1");

/* The project targets ES2017, so the BigInt values are built at runtime. */
const BIG_ZERO = BigInt(0);
const BIG_256 = BigInt(256);
const BIG_ONE = BigInt(1);

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Read one DER node at the given offset. */
export function readDer(bytes: Uint8Array, offset = 0): DerNode | null {
  if (offset >= bytes.length) return null;

  const start = offset;
  const tagByte = bytes[offset];
  offset += 1;

  const tagNumber = tagByte & 0x1f;
  let length = bytes[offset];
  offset += 1;

  if (length & 0x80) {
    const count = length & 0x7f;
    length = 0;
    for (let i = 0; i < count; i += 1) {
      length = length * 256 + bytes[offset];
      offset += 1;
    }
  }

  const content = bytes.slice(offset, offset + length);
  const totalLength = offset + length - start;

  const node: DerNode = {
    tag: tagByte.toString(16).padStart(2, "0"),
    tagNumber,
    constructed: (tagByte & 0x20) !== 0,
    content,
    children: [],
    offset: start,
    totalLength,
  };

  if (node.constructed) {
    let childOffset = 0;
    while (childOffset < content.length) {
      const child = readDer(content, childOffset);
      if (!child) break;
      node.children.push(child);
      childOffset += child.totalLength;
    }
  }

  return node;
}

/** Decode a PEM block into its DER bytes. */
export function pemToDer(text: string): { der: Uint8Array; label: string } | null {
  const match = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/.exec(text);
  if (!match) return null;
  const label = match[1].trim();
  const base64 = match[2].replace(/\s+/g, "");
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { der: bytes, label };
  } catch {
    return null;
  }
}

/** Decode a hexadecimal string into bytes. */
export function hexToBytes(text: string): Uint8Array | null {
  const clean = text.replace(/[^0-9a-fA-F]/g, "");
  if (!clean.length || clean.length % 2 !== 0) return null;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

/** The names of the object identifiers that appear in a certificate. */
const OID_NAMES: Record<string, string> = {
  "2.5.4.3": "CN",
  "2.5.4.4": "SN",
  "2.5.4.5": "serialNumber",
  "2.5.4.6": "C",
  "2.5.4.7": "L",
  "2.5.4.8": "ST",
  "2.5.4.9": "street",
  "2.5.4.10": "O",
  "2.5.4.11": "OU",
  "2.5.4.12": "title",
  "2.5.4.42": "GN",
  "0.9.2342.19200300.100.1.25": "DC",
  "0.9.2342.19200300.100.1.1": "UID",
  "1.2.840.113549.1.1.1": "rsaEncryption",
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.113549.1.1.10": "RSASSA-PSS",
  "1.2.840.10045.2.1": "id-ecPublicKey",
  "1.2.840.10045.3.1.7": "prime256v1",
  "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.3.101.112": "Ed25519",
  "2.5.29.17": "subjectAltName",
  "2.5.29.19": "basicConstraints",
  "1.3.6.1.5.5.7.1.1": "authorityInfoAccess",
  "1.3.6.1.5.5.7.3.1": "serverAuth",
  "1.3.6.1.5.5.7.3.2": "clientAuth",
};

/** The size of the named curves. */
const CURVE_SIZES: Record<string, string> = {
  prime256v1: "P-256",
  secp256r1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521",
  secp192r1: "P-192",
};

/**
 * The size of an RSA modulus in bits.
 *
 * The modulus is an INTEGER with a leading zero byte, so the length of the
 * content and the leading zero bits have to be taken off.
 */
function rsaKeyBits(keyBytes: Uint8Array): number {
  /* The first byte of a bit string carries the number of unused bits. */
  const inner = readDer(keyBytes.subarray(1));
  if (!inner || !inner.children.length) return 0;
  const modulus = inner.children[0];
  if (!modulus) return 0;

  let bits = modulus.content.length * 8;
  for (const byte of modulus.content) {
    if (byte === 0) {
      bits -= 8;
      continue;
    }
    let value = byte;
    let leading = 0;
    while (value && !(value & 0x80)) {
      value *= 2;
      leading += 1;
    }
    bits -= leading;
    break;
  }
  return bits;
}

export interface PublicKeyInfo {
  /** The algorithm of the key, for example "rsaEncryption". */
  algorithm: string;
  /** The size of the key, for example "RSA 2048 bits". */
  keySize: string;
  /** The bytes of the key. */
  bytes: Uint8Array;
}

/**
 * Reads the public key of a SubjectPublicKeyInfo.
 */
export function readPublicKey(node: DerNode): PublicKeyInfo {
  const algorithmNode = node.children[0];
  const oid = algorithmNode?.children?.[0];
  const algorithm = oid ? oidName(oid) : "";
  const bytes = node.children[1]?.content || new Uint8Array(0);

  let keySize = "";
  const curve = algorithmNode?.children?.[1]?.children?.[0];
  if (algorithm.indexOf("rsaEncryption") >= 0) {
    const bits = rsaKeyBits(bytes);
    keySize = bits ? `RSA ${bits} bits` : "RSA";
  } else if (curve) {
    const name = oidName(curve);
    const size = CURVE_SIZES[name] || name;
    keySize = `EC ${size}`;
  } else if (algorithm.indexOf("Ed25519") >= 0) {
    keySize = "Ed25519";
  }

  return { algorithm, keySize, bytes };
}

/**
 * The alternative names of a certificate.
 *
 * The names live in the subjectAltName extension: the value of the extension
 * holds a GeneralNames structure with one entry per name.
 */
export function readAlternativeNames(tbs: DerNode): string[] {
  const names: string[] = [];
  for (const wrapper of tbs.children) {
    if (wrapper.tag !== "a3") continue;
    for (const list of wrapper.children) {
      if (list.tag !== "30") continue;
      for (const extension of list.children) {
        if (extension.tag !== "30") continue;
        const oid = extension.children[0];
        if (!oid || oid.tag !== "06") continue;
        if (oidName(oid).indexOf("2.5.29.17") < 0) continue;
        const value = extension.children[1];
        if (!value || value.tag !== "04") continue;
        const generalNames = readDer(value.content);
        if (!generalNames) continue;
        for (const entry of generalNames.children) {
          if (entry.tag === "82") names.push(`DNS:${derText(entry)}`);
          if (entry.tag === "87") names.push(`IP:${hex(entry.content)}`);
        }
      }
    }
  }
  return names;
}

/** The readable name of an OBJECT IDENTIFIER. */
export function oidName(node: DerNode): string {
  if (node.tag !== "06") return node.tag;
  const bytes = node.content;
  if (!bytes.length) return node.tag;
  const parts: number[] = [];
  const first = Math.floor(bytes[0] / 40);
  const second = bytes[0] % 40;
  parts.push(first, second);
  let value = 0;
  for (let i = 1; i < bytes.length; i += 1) {
    value = value * 128 + (bytes[i] & 0x7f);
    if ((bytes[i] & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  const oid = parts.join(".");
  return OID_NAMES[oid] ? `${oid} (${OID_NAMES[oid]})` : oid;
}

/** The text of a PrintableString, UTF8String or IA5String. */
export function derText(node: DerNode): string {
  return textDecoder.decode(node.content).replace(/\0+$/, "");
}

/** The name of a tag, for the tree view. */
export function tagLabel(node: DerNode): string {
  const names: Record<string, string> = {
    "01": "BOOLEAN",
    "02": "INTEGER",
    "03": "BIT STRING",
    "04": "OCTET STRING",
    "05": "NULL",
    "06": "OBJECT IDENTIFIER",
    "0c": "UTF8String",
    "13": "PrintableString",
    "16": "IA5String",
    "17": "UTCTime",
    "18": "GeneralizedTime",
    "30": "SEQUENCE",
    "31": "SET",
    "a0": "CONTEXT [0]",
    "a3": "CONTEXT [3]",
  };
  return names[node.tag] || `TAG ${node.tag}`;
}

/** A readable one line description of a node. */
export function describeNode(node: DerNode): string {
  const label = tagLabel(node);
  if (node.tag === "06") return `${label} ${oidName(node)}`;
  if (node.tag === "13" || node.tag === "0c" || node.tag === "16" || node.tag === "17" || node.tag === "18") {
    return `${label} "${derText(node)}"`;
  }
  if (node.tag === "02") {
    let value = BIG_ZERO;
    for (const byte of node.content) value = value * BIG_256 + BigInt(byte);
    return `${label} ${value.toString()}`;
  }
  if (node.tag === "01") return `${label} ${node.content[0] ? "true" : "false"}`;
  if (node.constructed) return `${label} (${node.children.length} entries)`;
  return `${label} ${hex(node.content).slice(0, 48)}${node.content.length > 24 ? "…" : ""}`;
}

/** The relative distinguished names of a Name (issuer or subject). */
export function readName(node: DerNode): string[] {
  const names: string[] = [];
  for (const rdn of node.children) {
    for (const pair of rdn.children) {
      if (!pair.children || pair.children.length < 2) continue;
      const attribute = pair.children[0];
      const value = pair.children[1];
      names.push(`${attributeKey(attribute)}=${derText(value)}`);
    }
  }
  return names;
}

/**
 * The short name of an attribute type, for example "CN".
 *
 * A known object identifier carries its name in brackets, an unknown one is
 * shown with the identifier itself.
 */
function attributeKey(attribute: DerNode): string {
  const named = oidName(attribute);
  const match = /\(([^)]*)\)\s*$/.exec(named);
  return match ? match[1] : named;
}

export interface CertificateInfo {
  version: string;
  serialNumber: string;
  signatureAlgorithm: string;
  issuer: string[];
  subject: string[];
  notBefore: string;
  notAfter: string;
  publicKey: string;
  /** The size of the public key, for example "RSA 2048 bits". */
  keySize: string;
  signature: string;
  subjectAlternativeNames: string[];
}

/** Read the fields of an X.509 certificate. */
export function readCertificate(root: DerNode): CertificateInfo | null {
  const tbs = root.children[0];
  if (!tbs) return null;

  const items = [...tbs.children];
  // The optional version is wrapped in a CONTEXT [0] node.
  let index = 0;
  let version = "v1";
  if (items[0] && items[0].tag === "a0") {
    const inner = items[0].children[0];
    version = inner ? `v${Number(BigInt(`0x${hex(inner.content)}`) + BIG_ONE)}` : "v3";
    index = 1;
  }

  const serial = items[index];
  const signatureAlgorithmNode = items[index + 1];
  const issuer = items[index + 2];
  const validity = items[index + 3];
  const subject = items[index + 4];
  const subjectPublicKeyInfo = items[index + 5];

  const algorithmName = signatureAlgorithmNode?.children?.[0]
    ? oidName(signatureAlgorithmNode.children[0])
    : "";

  const notBefore = validity?.children?.[0] ? derText(validity.children[0]) : "";
  const notAfter = validity?.children?.[1] ? derText(validity.children[1]) : "";

  let publicKey = "";
  let keySize = "";
  if (subjectPublicKeyInfo) {
    const key = readPublicKey(subjectPublicKeyInfo);
    keySize = key.keySize;
    publicKey = key.bytes.length
      ? `${key.algorithm} ${hex(key.bytes).match(/.{1,2}/g)?.slice(0, 24).join(" ")}${
          key.bytes.length > 48 ? " …" : ""
        }`
      : key.algorithm;
  }

  const sans = readAlternativeNames(tbs);

  let serialText = "";
  if (serial) {
    let value = BIG_ZERO;
    for (const byte of serial.content) value = value * BIG_256 + BigInt(byte);
    serialText = value.toString(16).toUpperCase();
  }

  const signatureBytes = root.children[2]?.content;

  return {
    version,
    serialNumber: serialText,
    signatureAlgorithm: algorithmName,
    issuer: issuer ? readName(issuer) : [],
    subject: subject ? readName(subject) : [],
    notBefore,
    notAfter,
    publicKey,
    keySize,
    signature: signatureBytes ? hex(signatureBytes).slice(0, 64) : "",
    subjectAlternativeNames: sans,
  };
}

export interface CsrInfo {
  version: string;
  subject: string[];
  publicKey: string;
  /** The size of the public key, for example "RSA 2048 bits". */
  keySize: string;
  signatureAlgorithm: string;
}

/** Read the fields of a PKCS#10 certificate signing request. */
export function readCsr(root: DerNode): CsrInfo | null {
  const info = root.children[0];
  if (!info) return null;
  const items = info.children;
  const version = items[0];
  const subject = items[1];
  const publicKeyInfo = items[2];

  const key = publicKeyInfo
    ? readPublicKey(publicKeyInfo)
    : { algorithm: "", keySize: "", bytes: new Uint8Array(0) };
  const publicKey = key.bytes.length
    ? `${key.algorithm} ${hex(key.bytes).match(/.{1,2}/g)?.slice(0, 24).join(" ")}${
        key.bytes.length > 48 ? " …" : ""
      }`
    : key.algorithm;

  return {
    version: version ? `v${Number(BigInt(`0x${hex(version.content)}`) + BIG_ONE)}` : "v1",
    subject: subject ? readName(subject) : [],
    publicKey,
    keySize: key.keySize,
    signatureAlgorithm: root.children[1]?.children?.[0]
      ? oidName(root.children[1].children[0])
      : "",
  };
}
