"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MousePointer2, Move, RotateCcw, ScrollText } from "lucide-react";
import { DevicePanel, DeviceStat, deviceButtonClass } from "./kit";

/**
 * The test of a mouse.
 *
 * The panel counts the presses of the three buttons, the scrolls of the
 * wheel, the double clicks and the distance the pointer travelled.
 */
export function MouseTest() {
  const t = useTranslations("ui.engines.device");
  const areaRef = useRef<HTMLDivElement>(null);

  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [middle, setMiddle] = useState(0);
  const [scroll, setScroll] = useState(0);
  const [doubleClicks, setDoubleClicks] = useState(0);
  const [distance, setDistance] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [last, setLast] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 0) setLeft((value) => value + 1);
    else if (event.button === 1) setMiddle((value) => value + 1);
    else if (event.button === 2) setRight((value) => value + 1);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = areaRef.current?.getBoundingClientRect();
    const x = bounds ? Math.round(event.clientX - bounds.left) : 0;
    const y = bounds ? Math.round(event.clientY - bounds.top) : 0;
    setPosition({ x, y });
    setLast((previous) => {
      if (!previous) return { x, y };
      const moved = Math.abs(x - previous.x) + Math.abs(y - previous.y);
      if (moved > 0) {
        setDistance((value) => value + moved);
      }
      return { x, y };
    });
  };

  const reset = () => {
    setLeft(0);
    setRight(0);
    setMiddle(0);
    setScroll(0);
    setDoubleClicks(0);
    setDistance(0);
    setPosition({ x: 0, y: 0 });
    setLast(null);
  };

  return (
    <DevicePanel title={t("mouse.title")} subtitle={t("mouse.subtitle")}>
      <div
        ref={areaRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onDoubleClick={() => setDoubleClicks((value) => value + 1)}
        onWheel={(event) => setScroll((value) => value + Math.round(event.deltaY))}
        onContextMenu={(event) => event.preventDefault()}
        className="relative h-56 cursor-crosshair select-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/60"
      >
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-700 bg-sky-500/20"
          style={{ left: position.x, top: position.y }}
        />
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/80 px-2 py-1 font-mono text-[11px] text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
          {t("mouse.pointerPosition", { x: position.x, y: position.y })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <DeviceStat label={t("mouse.leftButton")} value={String(left)} />
        <DeviceStat label={t("mouse.rightButton")} value={String(right)} />
        <DeviceStat label={t("mouse.middleButton")} value={String(middle)} />
        <DeviceStat
          label={t("mouse.doubleClicks")}
          value={String(doubleClicks)}
          hint={t("mouse.doubleClickHint")}
        />
        <DeviceStat
          label={t("mouse.scrollDistance")}
          value={`${scroll} px`}
          hint={t("mouse.scrollHint")}
        />
        <DeviceStat
          label={t("mouse.movement")}
          value={`${distance} px`}
          hint={t("mouse.movementHint")}
        />
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <MousePointer2 className="size-4" />
        {t("mouse.hint")}
      </p>
      <p className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <Move className="size-4" />
        <ScrollText className="size-4" />
        {t("mouse.scrollHint2")}
      </p>

      <div>
        <button type="button" onClick={reset} className={deviceButtonClass}>
          <RotateCcw className="size-3.5" />
          {t("mouse.reset")}
        </button>
      </div>
    </DevicePanel>
  );
}
