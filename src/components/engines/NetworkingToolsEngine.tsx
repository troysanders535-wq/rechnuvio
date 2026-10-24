"use client";

import React from "react";
import { SubnetCalculator } from "./networking/SubnetCalculator";
import { SubnetCheatSheet } from "./networking/SubnetCheatSheet";
import { VlsmCalculator } from "./networking/VlsmCalculator";

interface NetworkingToolsEngineProps {
  slug: string;
}

/** The workspaces the networking engine can render. */
type NetworkingView = "subnet" | "cheatsheet" | "vlsm";

/**
 * The workspace of every tool of the engine.
 *
 * The CIDR calculator and the subnet calculator share the subnet workspace,
 * the IPv6 calculator starts in the IPv6 mode of it, the cheat sheet lists
 * every prefix length and the VLSM calculator splits a block into subnets of
 * different sizes. The mapping is explicit - a slug is never matched by a
 * part of its name.
 */
const VIEW_BY_SLUG: Record<string, NetworkingView> = {
  "cidr-calculator": "subnet",
  "subnet-calculator": "subnet",
  "ipv6-subnet-calculator": "subnet",
  "subnet-cheat-sheet": "cheatsheet",
  "vlsm-calculator": "vlsm",
};

/** The address family a tool starts with. */
const FAMILY_BY_SLUG: Record<string, "ipv4" | "ipv6"> = {
  "ipv6-subnet-calculator": "ipv6",
};

export function NetworkingToolsEngine({ slug }: NetworkingToolsEngineProps) {
  const view = VIEW_BY_SLUG[slug] ?? "subnet";

  switch (view) {
    case "cheatsheet":
      return <SubnetCheatSheet />;
    case "vlsm":
      return <VlsmCalculator />;
    case "subnet":
    default:
      return (
        <SubnetCalculator
          key={slug}
          defaultFamily={FAMILY_BY_SLUG[slug] ?? "ipv4"}
        />
      );
  }
}
