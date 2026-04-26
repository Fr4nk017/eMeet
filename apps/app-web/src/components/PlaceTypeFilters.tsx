import type { PlaceType } from '../types'
import { PLACE_TYPE_CONFIG } from '../services/placesService'

const ORDERED_TYPES: PlaceType[] = ['restaurant', 'bar', 'night_club', 'cafe']

interface PlaceTypeFiltersProps {
  selectedTypes: PlaceType[]
  onToggleType: (type: PlaceType) => void
  className?: string
}

export default function PlaceTypeFilters({
  selectedTypes,
  onToggleType,
  className,
}: PlaceTypeFiltersProps) {
  const selectedSet = new Set(selectedTypes)

  return (
    <div className={className ?? 'flex gap-2'}>
      {ORDERED_TYPES.map((type) => {
        const cfg = PLACE_TYPE_CONFIG[type]
        const isOn = selectedSet.has(type)
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggleType(type)}
            style={{
              backgroundColor: isOn ? cfg.color : 'rgba(10,12,30,0.88)',
              borderColor: cfg.color,
              color: isOn ? '#fff' : cfg.color,
              boxShadow: isOn ? `0 0 10px ${cfg.color}55` : 'none',
            }}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-all duration-200 whitespace-nowrap select-none"
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.category}</span>
          </button>
        )
      })}
    </div>
  )
}