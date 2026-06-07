interface DistanceFilterProps {
  selectedKm: number
  onChange: (km: number) => void
  className?: string
}

const DISTANCE_OPTIONS = [1, 3, 5]

export default function DistanceFilter({ selectedKm, onChange, className }: DistanceFilterProps) {
  return (
    <div className={className ?? 'flex gap-2'}>
      {DISTANCE_OPTIONS.map((km) => {
        const isSelected = selectedKm === km
        return (
          <button
            key={km}
            type="button"
            onClick={() => onChange(km)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              isSelected
                ? 'border-primary bg-primary text-white shadow-[0_0_12px_rgba(124,58,237,0.45)]'
                : 'border-white/20 bg-[rgba(10,12,30,0.82)] text-slate-300 hover:border-primary/60'
            }`}
          >
            {km} km
          </button>
        )
      })}
    </div>
  )
}
