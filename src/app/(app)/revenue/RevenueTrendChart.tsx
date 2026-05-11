"use client";

import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyPoint = {
  label: string;
  revenue: number;
  hours: number;
};

export function RevenueTrendChart({
  lang,
  data,
}: {
  lang: "zh" | "en";
  data: MonthlyPoint[];
}) {
  if (data.length === 0) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            yAxisId="rev"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `S$${v}`}
          />
          <YAxis
            yAxisId="hrs"
            orientation="right"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => (lang === "zh" ? `${v}小时` : `${v}h`)}
          />
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (String(name).includes("收入") || String(name).includes("Revenue"))
                return [`S$${n}`, name];
              return [`${n} h`, name];
            }}
          />
          <Legend />
          <Line
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name={lang === "zh" ? "收入 (S$)" : "Revenue (S$)"}
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: "#7dd3fc", r: 4, strokeWidth: 0 }}
          />
          <Line
            yAxisId="hrs"
            type="monotone"
            dataKey="hours"
            name={lang === "zh" ? "上课小时" : "Hours (h)"}
            stroke="#475569"
            strokeWidth={2}
            dot={{ fill: "#94a3b8", r: 4, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
