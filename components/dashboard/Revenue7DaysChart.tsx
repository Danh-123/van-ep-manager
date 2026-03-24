'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RevenuePoint = {
  date: string;
  revenue: number;
};

type Revenue7DaysChartProps = {
  data: RevenuePoint[];
};

function formatVnd(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Revenue7DaysChart({ data }: Revenue7DaysChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="date" stroke="#64748B" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#64748B"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(46, 125, 50, 0.08)' }}
            formatter={(value) => formatVnd(Number(value))}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -15px rgba(15, 23, 42, 0.45)',
            }}
          />
          <Bar dataKey="revenue" fill="#2E7D32" radius={[10, 10, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
