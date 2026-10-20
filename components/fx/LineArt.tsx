import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const INK = "#1A1B1C";

export type LineArtProps = {
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
};

function Frame({
  size,
  className,
  children,
}: {
  size: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function RadialHatch({
  size = 240,
  strokeWidth = 0.75,
  color = INK,
  className,
}: LineArtProps) {
  const cx = size / 2;
  const cy = size / 2;
  const count = 72;
  const lines = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const petal = 0.3 + 0.7 * Math.abs(Math.cos(angle * 3));
    const radius = size * 0.46 * petal;
    lines.push(
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(angle) * radius}
        y2={cy + Math.sin(angle) * radius}
        stroke={color}
        strokeWidth={strokeWidth}
      />,
    );
  }
  return (
    <Frame size={size} className={className}>
      {lines}
    </Frame>
  );
}

export function ContourCurves({
  size = 240,
  strokeWidth = 0.75,
  color = INK,
  className,
}: LineArtProps) {
  const layers = 6;
  const curves = [];
  for (let layer = 0; layer < layers; layer++) {
    const yBase = size * (0.28 + layer * 0.1);
    const amp = size * (0.12 + layer * 0.012);
    let d = "";
    const steps = 42;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = size * (0.1 + t * 0.8);
      const bell = Math.exp(-((t - 0.5) * (t - 0.5)) / 0.07);
      const y = yBase - bell * amp;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    curves.push(<path key={layer} d={d} stroke={color} strokeWidth={strokeWidth} />);
  }

  const ticks = [0.22, 0.4, 0.58, 0.76].map((t) => {
    const x = size * (0.1 + t * 0.8);
    return (
      <line
        key={t}
        x1={x}
        y1={size * 0.2}
        x2={x}
        y2={size * 0.84}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  });

  return (
    <Frame size={size} className={className}>
      {curves}
      {ticks}
    </Frame>
  );
}

export function Spiral({
  size = 240,
  strokeWidth = 0.75,
  color = INK,
  className,
}: LineArtProps) {
  const cx = size / 2;
  const cy = size / 2;
  const turns = 3.25;
  const steps = 140;
  let d = "";
  const ticks = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const radius = size * 0.045 + t * size * 0.4;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    if (i % 14 === 0) {
      const outer = radius + size * 0.04;
      ticks.push(
        <line
          key={i}
          x1={x}
          y1={y}
          x2={cx + Math.cos(angle) * outer}
          y2={cy + Math.sin(angle) * outer}
          stroke={color}
          strokeWidth={strokeWidth}
        />,
      );
    }
  }

  return (
    <Frame size={size} className={className}>
      <path d={d} stroke={color} strokeWidth={strokeWidth} />
      {ticks}
    </Frame>
  );
}

export function HatchFill({
  size = 240,
  strokeWidth = 1,
  color = INK,
  className,
}: LineArtProps) {
  const gap = 8;
  const count = Math.ceil((size * 2) / gap);
  const lines = [];
  for (let i = 0; i < count; i++) {
    const start = i * gap - size;
    lines.push(
      <line
        key={i}
        x1={start}
        y1={0}
        x2={start + size}
        y2={size}
        stroke={color}
        strokeWidth={strokeWidth}
      />,
    );
  }
  return (
    <Frame size={size} className={cn("bg-white", className)}>
      {lines}
    </Frame>
  );
}
