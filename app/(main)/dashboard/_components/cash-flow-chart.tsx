"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export type FlowPoint = {
  label: string;
  income: number;
  expense: number;
};

function axisMoney(value: number) {
  return formatCompactCurrency(value);
}

function SquareTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-[3px] border-[#1A1B1C] bg-white px-3 py-2 text-xs text-[#1A1B1C]">
      <p className="label">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-2 font-num">
          <span className="inline-block h-2.5 w-2.5" style={{ background: entry.color }} />
          {entry.name} {formatCurrency(Number(entry.value))}
        </p>
      ))}
    </div>
  );
}

function SquareLegend({ payload }: { payload?: Array<{ value?: string; color?: string }> }) {
  return (
    <ul className="flex flex-wrap justify-end gap-4 pt-2">
      {(payload ?? []).map((entry) => (
        <li key={entry.value} className="label flex items-center gap-2 text-[10px]">
          <span className="inline-block h-2.5 w-2.5" style={{ background: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  );
}

export function CashFlowChart({ flow }: { flow: FlowPoint[] }) {
  const peak = Math.max(0, ...flow.flatMap((point) => [point.income, point.expense]));
  return (
    <div className="h-full w-full" data-chart-ready="true">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={flow} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="#1A1B1C" strokeOpacity={0.2} />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={16}
          tick={{ fill: "#1A1B1C", fontSize: 10 }}
          axisLine={{ stroke: "#1A1B1C", strokeWidth: 1 }}
          tickLine={false}
        />
        <YAxis
          domain={[0, peak > 0 ? peak : 1]}
          tickFormatter={axisMoney}
          width={64}
          tick={{ fill: "#1A1B1C", fontSize: 10 }}
          axisLine={{ stroke: "#1A1B1C", strokeWidth: 1 }}
          tickLine={false}
        />
        <Tooltip
          content={(props) => (
            <SquareTooltip
              active={props.active}
              label={typeof props.label === "string" ? props.label : undefined}
              payload={props.payload as Array<{ name?: string; value?: number | string; color?: string }>}
            />
          )}
          cursor={{ fill: "#E3E7EB" }}
        />
        <Legend content={(props) => <SquareLegend payload={props.payload as Array<{ value?: string; color?: string }>} />} />
        <Bar dataKey="income" name="INCOME" fill="#1A1B1C" radius={0} maxBarSize={28} isAnimationActive={false} />
        <Bar dataKey="expense" name="EXPENSE" fill="#FF5F14" radius={0} maxBarSize={28} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
