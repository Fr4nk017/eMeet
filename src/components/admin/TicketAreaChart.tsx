'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Mock data — replace with API call when ticket-sales endpoint is available
const MOCK_DATA = [
  { month: 'Nov', tickets: 820 },
  { month: 'Dic', tickets: 1340 },
  { month: 'Ene', tickets: 980 },
  { month: 'Feb', tickets: 1560 },
  { month: 'Mar', tickets: 1280 },
  { month: 'Abr', tickets: 1890 },
]

interface CustomTooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-em-border bg-em-surface px-3 py-2 shadow-xl">
      <p className="text-[11px] text-em-muted">{label}</p>
      <p className="text-sm font-bold text-em-accent">{payload[0].value.toLocaleString('es-CL')} tickets</p>
    </div>
  )
}

export default function TicketAreaChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={MOCK_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2329" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#848E9C', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#848E9C', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#FF6B00', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="tickets"
          stroke="#FF6B00"
          strokeWidth={2}
          fill="url(#ticketGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#FF6B00', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
