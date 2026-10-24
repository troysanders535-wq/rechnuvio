/**
 * The address arithmetic of the subnet tools.
 *
 * IPv4 is calculated with plain numbers (an address fits into 32 bits), IPv6
 * with `BigInt` (an address needs 128 bits). The project compiles to ES2017,
 * so no `BigInt` literal (`0n`) may be used - every value is created with the
 * `BigInt()` function instead.
 */

/* ----------------------------------------------------------------- IPv4 --- */

/** Parse an IPv4 address into its numeric value, or null when it is invalid. */
export function parseIpv4(value: string): number | null {
  const parts = value.trim().split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = parseInt(part, 10);
    if (octet > 255) return null;
    result = result * 256 + octet;
  }
  return result;
}

/** Format a numeric IPv4 address. */
export function formatIpv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join(".");
}

/** The subnet mask of a prefix length. */
export function ipv4Mask(prefix: number): number {
  return prefix <= 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

/** The subnet of an IPv4 address. */
export interface Ipv4Subnet {
  network: number;
  broadcast: number;
  mask: number;
  wildcard: number;
  firstHost: number;
  lastHost: number;
  total: number;
  usable: number;
}

/** Calculate the subnet of an IPv4 address and a prefix length. */
export function ipv4Subnet(address: number, prefix: number): Ipv4Subnet {
  const mask = ipv4Mask(prefix);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const size = Math.pow(2, 32 - prefix);

  let firstHost = network;
  let lastHost = broadcast;
  let usable = size;

  if (prefix <= 30) {
    firstHost = network + 1;
    lastHost = broadcast - 1;
    usable = size - 2;
  } else if (prefix === 31) {
    usable = 2;
  } else {
    usable = 1;
  }

  return {
    network,
    broadcast,
    mask,
    wildcard: ~mask >>> 0,
    firstHost,
    lastHost,
    total: size,
    usable,
  };
}

/* ----------------------------------------------------------------- IPv6 --- */

/** The 128 bit all ones mask. */
const IPV6_ALL = BigInt("0x" + "f".repeat(32));

/** Parse an IPv6 address into its numeric value, or null when it is invalid. */
export function parseIpv6(value: string): bigint | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;

  const doubleColon = text.indexOf("::");
  if (doubleColon !== -1 && doubleColon !== text.lastIndexOf("::")) return null;

  const parseGroups = (part: string): number[] | null => {
    if (part === "") return [];
    const chunks = part.split(":");
    const groups: number[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      if (chunk.includes(".")) {
        // An embedded IPv4 address is only allowed as the last group.
        if (i !== chunks.length - 1) return null;
        const octets = chunk.split(".");
        if (octets.length !== 4) return null;
        const numbers = octets.map((octet) =>
          /^\d{1,3}$/.test(octet) ? parseInt(octet, 10) : Number.NaN,
        );
        if (numbers.some((n) => Number.isNaN(n) || n > 255)) return null;
        groups.push(numbers[0] * 256 + numbers[1]);
        groups.push(numbers[2] * 256 + numbers[3]);
        continue;
      }
      if (!/^[0-9a-f]{1,4}$/.test(chunk)) return null;
      groups.push(parseInt(chunk, 16));
    }
    return groups;
  };

  const head = parseGroups(doubleColon === -1 ? text : text.slice(0, doubleColon));
  const tail = parseGroups(doubleColon === -1 ? "" : text.slice(doubleColon + 2));
  if (!head || !tail) return null;

  let groups: number[];
  if (doubleColon === -1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const gap = 8 - head.length - tail.length;
    if (gap < 1) return null;
    groups = [...head, ...new Array(gap).fill(0), ...tail];
  }

  const hex = groups.map((group) => group.toString(16).padStart(4, "0")).join("");
  return BigInt("0x" + hex);
}

/** Format a numeric IPv6 address in the compressed notation. */
export function formatIpv6(value: bigint): string {
  const hex = value.toString(16).padStart(32, "0");
  const groups: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    groups.push(hex.slice(i * 4, i * 4 + 4).replace(/^0+/, "") || "0");
  }

  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  for (let i = 0; i <= groups.length; i += 1) {
    if (i < groups.length && groups[i] === "0") {
      if (runStart === -1) runStart = i;
    } else if (runStart !== -1) {
      const length = i - runStart;
      if (length > bestLength) {
        bestStart = runStart;
        bestLength = length;
      }
      runStart = -1;
    }
  }
  if (bestLength < 2) {
    bestStart = -1;
    bestLength = 0;
  }

  if (bestStart === -1) return groups.join(":");
  const head = groups.slice(0, bestStart).join(":");
  const tail = groups.slice(bestStart + bestLength).join(":");
  return `${head}::${tail}`;
}

/** Format a numeric IPv6 address without the compression of the zero groups. */
export function formatIpv6Expanded(value: bigint): string {
  const hex = value.toString(16).padStart(32, "0");
  const groups: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    groups.push(hex.slice(i * 4, i * 4 + 4));
  }
  return groups.join(":");
}

/** The subnet mask of an IPv6 prefix length. */
export function ipv6Mask(prefix: number): bigint {
  const clamped = Math.min(Math.max(prefix, 0), 128);
  return ((BigInt(1) << BigInt(clamped)) - BigInt(1)) << BigInt(128 - clamped);
}

/** The subnet of an IPv6 address. */
export interface Ipv6Subnet {
  network: bigint;
  last: bigint;
  mask: bigint;
  wildcard: bigint;
  firstHost: bigint;
  lastHost: bigint;
  total: bigint;
  usable: bigint;
}

/** Calculate the subnet of an IPv6 address and a prefix length. */
export function ipv6Subnet(address: bigint, prefix: number): Ipv6Subnet {
  const clamped = Math.min(Math.max(prefix, 0), 128);
  const mask = ipv6Mask(clamped);
  const wildcard = IPV6_ALL & ~mask;
  const network = address & mask;
  const last = network | wildcard;
  const total = BigInt(1) << BigInt(128 - clamped);

  let firstHost = network;
  let lastHost = last;
  let usable = total;

  if (clamped <= 126) {
    firstHost = network + BigInt(1);
    lastHost = last - BigInt(1);
    usable = total - BigInt(2);
  } else if (clamped === 127) {
    usable = BigInt(2);
  } else {
    usable = BigInt(1);
  }

  return { network, last, mask, wildcard, firstHost, lastHost, total, usable };
}

/* ----------------------------------------------------------------- VLSM --- */

/** One subnet that the user wants to allocate. */
export interface VlsmRequest {
  /** The row the request came from. */
  index: number;
  /** The number of hosts the subnet has to carry. */
  hosts: number;
}

/** The allocation of one subnet. */
export interface VlsmAllocation extends VlsmRequest {
  prefix: number;
  network: number;
  mask: number;
  wildcard: number;
  firstHost: number;
  lastHost: number;
  usable: number;
  broadcast: number;
  /** false when the subnet does not fit into the parent block. */
  fits: boolean;
}

/** The result of the VLSM calculation. */
export interface VlsmResult {
  allocations: VlsmAllocation[];
  parentPrefix: number;
  parentNetwork: number;
  parentBroadcast: number;
  parentTotal: number;
  used: number;
  leftover: number;
  /** false when at least one subnet does not fit into the parent block. */
  fits: boolean;
}

/** The smallest prefix length that carries the requested number of hosts. */
export function prefixForHosts(hosts: number): number {
  let prefix = 32;
  while (prefix > 0 && Math.pow(2, 32 - prefix) - 2 < hosts) prefix -= 1;
  return prefix;
}

/**
 * Allocate the requested subnets inside the parent block, the largest subnet
 * first. A subnet that does not fit is reported instead of being dropped.
 */
export function allocateVlsm(
  parentAddress: number,
  parentPrefix: number,
  requests: VlsmRequest[],
): VlsmResult {
  const parentMask = ipv4Mask(parentPrefix);
  const parentNetwork = (parentAddress & parentMask) >>> 0;
  const parentTotal = Math.pow(2, 32 - parentPrefix);
  const parentBroadcast = (parentNetwork + parentTotal - 1) >>> 0;

  const sorted = [...requests].sort((a, b) => b.hosts - a.hosts || a.index - b.index);

  let cursor = parentNetwork;
  let used = 0;
  let fits = true;
  const allocations: VlsmAllocation[] = [];

  for (const request of sorted) {
    const prefix = prefixForHosts(request.hosts);
    const size = Math.pow(2, 32 - prefix);
    const mask = ipv4Mask(prefix);

    // A subnet is only bigger than the parent block when its prefix length is
    // smaller than the one of the parent block.
    if (prefix < parentPrefix || cursor + size > parentNetwork + parentTotal) {
      fits = false;
      allocations.push({
        ...request,
        prefix,
        network: cursor,
        mask,
        wildcard: ~mask >>> 0,
        firstHost: cursor,
        lastHost: cursor,
        usable: 0,
        broadcast: cursor,
        fits: false,
      });
      continue;
    }

    const network = cursor;
    const broadcast = (network + size - 1) >>> 0;
    const firstHost = prefix <= 30 ? network + 1 : network;
    const lastHost = prefix <= 30 ? broadcast - 1 : broadcast;
    const usable = prefix <= 30 ? size - 2 : size;

    allocations.push({
      ...request,
      prefix,
      network,
      mask,
      wildcard: ~mask >>> 0,
      firstHost,
      lastHost,
      usable,
      broadcast,
      fits: true,
    });

    cursor = (cursor + size) >>> 0;
    used += size;
  }

  return {
    allocations,
    parentPrefix,
    parentNetwork,
    parentBroadcast,
    parentTotal,
    used,
    leftover: Math.max(0, parentTotal - used),
    fits,
  };
}
