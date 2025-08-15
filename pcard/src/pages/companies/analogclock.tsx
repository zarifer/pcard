import React, { useEffect, useMemo, useState } from "react";

type Props = {
  tz: string;
  size?: number;
  mode?: "light" | "dark";
};

function getTZParts(tz: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

export const AnalogClock: React.FC<Props> = ({
  tz,
  size = 90,
  mode = "light",
}) => {
  const [now, setNow] = useState(() => getTZParts(tz));
  useEffect(() => {
    const id = setInterval(() => setNow(getTZParts(tz)), 1000);
    return () => clearInterval(id);
  }, [tz]);

  const { hourAngle, minuteAngle, secondAngle } = useMemo(() => {
    const h = now.h % 12;
    const hourAngle = (h + now.m / 60) * 30;
    const minuteAngle = (now.m + now.s / 60) * 6;
    const secondAngle = now.s * 6;
    return { hourAngle, minuteAngle, secondAngle };
  }, [now]);

  const r = size / 2;
  const cx = r;
  const cy = r;

  const faceFill = mode === "dark" ? "#111" : "#fff";
  const faceStroke = mode === "dark" ? "#333" : "#d9d9d9";
  const handColor = mode === "dark" ? "#eaeaea" : "#333";
  const secondColor = "#7c3aed";

  const polar = (angleDeg: number, radius: number) => {
    const rad = (Math.PI / 180) * (angleDeg - 90);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30;
    const p1 = polar(a, r - 6);
    const p2 = polar(a, r - 12);
    return (
      <line
        key={i}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={faceStroke}
        strokeWidth={2}
      />
    );
  });

  const hourEnd = polar(hourAngle, r - 22);
  const minuteEnd = polar(minuteAngle, r - 14);
  const secondEnd = polar(secondAngle, r - 10);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Analog clock for ${tz}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r - 2}
        fill={faceFill}
        stroke={faceStroke}
        strokeWidth={2}
      />
      {ticks}
      <line
        x1={cx}
        y1={cy}
        x2={hourEnd.x}
        y2={hourEnd.y}
        stroke={handColor}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy}
        x2={minuteEnd.x}
        y2={minuteEnd.y}
        stroke={handColor}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <line
        x1={cx}
        y1={cy}
        x2={secondEnd.x}
        y2={secondEnd.y}
        stroke={secondColor}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={2.6} fill={secondColor} />
    </svg>
  );
};
