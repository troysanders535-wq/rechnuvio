"use client";

import React from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbsProps {
  items: {
    label: string;
    href?: string;
  }[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const locale = useLocale();
  const isGerman = locale.startsWith("de");

  const baseUrl = isGerman
    ? process.env.NEXT_PUBLIC_DE_DOMAIN || "https://de.digitaltoolpad.com"
    : process.env.NEXT_PUBLIC_EN_DOMAIN || "https://www.digitaltoolpad.com";

  const homeLabel = isGerman ? "Startseite" : "Home";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: homeLabel,
        item: baseUrl,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        item: item.href
          ? `${baseUrl}${item.href}`
          : undefined,
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label={isGerman ? "Brotkrumennavigation" : "Breadcrumb"} className="min-w-0 flex-1 py-2">
        <ol className="flex flex-wrap items-center gap-x-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
          <li className="shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded hover:text-sky-800 focus-visible:outline-2 dark:hover:text-sky-200"
            >
              <Home className="size-3.5" />
              <span>{homeLabel}</span>
            </Link>
          </li>
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-x-2">
                <ChevronRight className="size-3.5 text-slate-400" />
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="rounded hover:text-sky-800 focus-visible:outline-2 dark:hover:text-sky-200"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
