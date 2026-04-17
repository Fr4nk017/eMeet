'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data — replace with API call for real category distribution
const MOCK_DATA = [
  { name: 'Gastronomía', value: 34 },
  { name: 'Música', value: 22 },
  { name: 'Fiesta', value: 18 },
  { name: 'Cultura', value: 12 },
  { name: 'Deporte', value: 8 },
  { name: 'Otros', value: 6 },
]

const COLORS = ['#FF6B00', '#FF8C3B', '#F0B90B', '#0ECB81', '#3B82F6', '#848E9C']

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number }[]
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-em-border bg-em-surface px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-em-text">{payload[0].name}</p>
      <p className="text-sm font-bold text-em-accent">{payload[0].value}%</p>
    </div>
  )
}

export default function CategoryDonut() {
  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={MOCK_DATA}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {MOCK_DATA.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <ul className="space-y-1.5">
        {MOCK_DATA.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-em-muted">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {item.name}
            </span>
            <span className="font-semibold text-em-text-dim">{item.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
