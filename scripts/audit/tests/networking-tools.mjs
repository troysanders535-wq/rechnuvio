/**
 * Functional specs for the 5 tools of the networking engine.
 *
 * Every spec drives the real UI in Chrome: it types into the real address
 * field, picks a prefix in the real <select> and reads the rendered result
 * rows.
 *
 * Expected values come from the definition of an IPv4 subnet (the host part of
 * the address is masked off with the prefix mask, the broadcast address is the
 * last address of the block and the usable hosts are the addresses in
 * between) and from RFC 4291 for IPv6 - never from this site's own
 * implementation.
 */

import {
  spec,
  fillInput,
  selectOption,
  mainText,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
} from "../lib/test-helpers.mjs";

/**
 * The value of a rendered label/value row of the result panel.
 */
async function row(page, label) {
  return page.evaluate((wanted) => {
    const spans = Array.from(document.querySelectorAll("main span"));
    const node = spans.find((n) => (n.textContent || "").trim() === wanted);
    if (!node || !node.parentElement) return null;
    const sibling = Array.from(node.parentElement.querySelectorAll("span")).find(
      (n) => n !== node && !(n.textContent || "").trim().startsWith(wanted),
    );
    return sibling ? (sibling.textContent || "").trim() : null;
  }, label);
}

/** The options offered by the prefix selector. */
async function prefixOptions(page) {
  return page.locator("main select").first().locator("option").allTextContents();
}

export function register() {
  spec("cidr-calculator", "splits 192.168.1.1/24 into network, broadcast and hosts", async (page) => {
    await fillInput(page, "192.168.1.1", 0, "text");
    await selectOption(page, "24", 0);

    // /24 -> 255.255.255.0, so the host part of .1 is masked off to .0 and the
    // last address of the block is .255; the 254 addresses in between are usable.
    assertEqual(await row(page, "Network Address:"), "192.168.1.0", "network address");
    assertEqual(await row(page, "Broadcast Address:"), "192.168.1.255", "broadcast address");
    assertEqual(await row(page, "Subnet Mask:"), "255.255.255.0", "subnet mask");
    assertEqual(await row(page, "Wildcard Mask:"), "0.0.0.255", "wildcard mask");
    assertEqual(
      await row(page, "Usable Host Range:"),
      "192.168.1.1 - 192.168.1.254",
      "usable host range",
    );
    assertEqual(await row(page, "Total Usable Hosts:"), "254", "usable host count");
    assertEqual(await row(page, "CIDR Notation:"), "192.168.1.0/24", "CIDR notation");
  });

  spec("subnet-calculator", "splits 192.168.1.130/26 into network, broadcast and hosts", async (page) => {
    await fillInput(page, "192.168.1.130", 0, "text");
    await selectOption(page, "26", 0);

    // /26 -> 255.255.255.192; 130 AND 192 = 128 and 130 + 63 = 191.
    assertEqual(await row(page, "Network Address:"), "192.168.1.128", "network address");
    assertEqual(await row(page, "Broadcast Address:"), "192.168.1.191", "broadcast address");
    assertEqual(await row(page, "Subnet Mask:"), "255.255.255.192", "subnet mask");
    assertEqual(await row(page, "Wildcard Mask:"), "0.0.0.63", "wildcard mask");
    assertEqual(
      await row(page, "Usable Host Range:"),
      "192.168.1.129 - 192.168.1.190",
      "usable host range",
    );
    assertEqual(await row(page, "Total Usable Hosts:"), "62", "usable host count");
    assertEqual(await row(page, "CIDR Notation:"), "192.168.1.128/26", "CIDR notation");
  });

  spec("ipv6-subnet-calculator", "accepts an IPv6 address and a /64 prefix", async (page) => {
    await fillInput(page, "2001:db8::1", 0, "text");

    const t = await mainText(page);
    assertNotIncludes(t, "Please enter a valid IPv4 address", "an IPv6 address must be accepted");

    // RFC 4291: an IPv6 prefix length runs up to /128 and /64 is the usual
    // subnet size, so the prefix selector has to offer it.
    const options = await prefixOptions(page);
    assertIncludes(options.join(" "), "/64", "the prefix selector offers /64");
  });

  spec("subnet-cheat-sheet", "lists the mask and the host count of every prefix length", async (page) => {
    // A cheat sheet has to show the masks of the other prefix lengths as well,
    // not only the one that is currently selected.
    const t = await mainText(page);
    assertIncludes(t, "255.0.0.0", "/8 mask");
    assertIncludes(t, "255.255.0.0", "/16 mask");
    assertIncludes(t, "255.255.255.252", "/30 mask");
  });

  spec("vlsm-calculator", "allocates variable length subnets from a host requirement", async (page) => {
    // VLSM needs the host requirement of every subnet next to the base
    // network, so the workspace has to offer more than the address field.
    const fields = page.locator('main input[type="text"]');
    assertEqual(
      (await fields.count()) >= 2,
      true,
      "the VLSM workspace offers a field for the host requirement of each subnet",
    );

    await fillInput(page, "192.168.1.0", 0, "text");
    await selectOption(page, "24", 0);
    await fillInput(page, "100", 1, "text");

    // 100 hosts need a /25 (126 usable addresses), so the largest block of
    // 192.168.1.0/24 is 192.168.1.0/25.
    const t = await mainText(page);
    assertIncludes(t, "192.168.1.0/25", "the first allocation");
  });
}
