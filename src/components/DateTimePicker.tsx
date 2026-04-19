'use client'

import { useState, useRef, useEffect } from 'react'
import { FiCalendar, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_SHORT = ['Do','Lu','Ma','Mi','Ju','Vi','Sa']
const QUICK_TIMES = [
  { label: '12:00', h: 12, m: 0 },
  { label: '16:00', h: 16, m: 0 },
  { label: '18:00', h: 18, m: 0 },
  { label: '20:00', h: 20, m: 0 },
  { label: '22:00', h: 22, m: 0 },
  { label: '00:00', h: 0, m: 0 },
]

function parseIso(val: string) {
  if (!val) return null
  const [datePart, timePart] = val.split('T')
  if (!datePart) return null
  const [y, mo, d] = datePart.split('-').map(Number)
  const [h, mi] = (timePart ?? '00:00').split(':').map(Number)
  if (!y || !mo || !d) return null
  return { year: y, month: mo - 1, day: d, hour: h ?? 0, minute: mi ?? 0 }
}

function toIso(year: number, month: number, day: number, hour: number, minute: number) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`
}

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function DateTimePicker({ value, onChange, className }: DateTimePickerProps) {
  const today = new Date()
  const parsed = parseIso(value)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'date' | 'time'>('date')
  const [calYear, setCalYear] = useState(parsed?.year ?? today.getFullYear())
  const [calMonth, setCalMonth] = useState(parsed?.month ?? today.getMonth())
  const [selYear, setSelYear] = useState<number | null>(parsed?.year ?? null)
  const [selMonth, setSelMonth] = useState<number | null>(parsed?.month ?? null)
  const [selDay, setSelDay] = useState<number | null>(parsed?.day ?? null)
  const [hour, setHour] = useState(parsed?.hour ?? 20)
  const [minute, setMinute] = useState(parsed?.minute ?? 0)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = parseIso(value)
    if (!p) {
      setSelYear(null); setSelMonth(null); setSelDay(null)
      setHour(20); setMinute(0)
      setCalYear(today.getFullYear()); setCalMonth(today.getMonth())
    } else {
      setSelYear(p.year); setSelMonth(p.month); setSelDay(p.day)
      setCalYear(p.year); setCalMonth(p.month)
      setHour(p.hour); setMinute(p.minute)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function pickDay(day: number) {
    setSelYear(calYear); setSelMonth(calMonth); setSelDay(day)
    setTab('time')
  }

  function confirm() {
    if (selYear == null || selMonth == null || selDay == null) return
    onChange(toIso(selYear, selMonth, selDay, hour, minute))
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full bg-surface border border-card focus:border-primary outline-none py-3 px-4 rounded-lg text-left flex items-center gap-3 hover:border-white/20 transition-colors"
      >
        <FiCalendar className="text-primary-light flex-shrink-0" size={16} />
        {parsed ? (
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">
              {parsed.day} de {MONTHS[parsed.month]}, {parsed.year}
            </p>
            <p className="text-primary-light text-xs">
              {String(parsed.hour).padStart(2,'0')}:{String(parsed.minute).padStart(2,'0')} hrs
            </p>
          </div>
        ) : (
          <span className="text-muted text-sm">Seleccionar fecha y hora *</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-[#14152a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              type="button"
              onClick={() => setTab('date')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                tab === 'date' ? 'bg-primary/20 text-primary-light' : 'text-white/40 hover:text-white'
              }`}
            >
              <FiCalendar size={12} />
              Fecha
              {selDay != null && selMonth != null && selYear != null && (
                <span className="ml-1 text-[10px] text-white/50">{selDay}/{selMonth + 1}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('time')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                tab === 'time' ? 'bg-primary/20 text-primary-light' : 'text-white/40 hover:text-white'
              }`}
            >
              <FiClock size={12} />
              Hora
              <span className="ml-1 text-[10px] text-white/50">{String(hour).padStart(2,'0')}:{String(minute).padStart(2,'0')}</span>
            </button>
          </div>

          {tab === 'date' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className="text-white font-semibold text-sm">{MONTHS[calMonth]} {calYear}</span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-white/25 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDay }, (_, i) => <div key={`b${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const isSelected = selDay === day && selMonth === calMonth && selYear === calYear
                  const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                  const isPast = new Date(calYear, calMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isPast}
                      onClick={() => pickDay(day)}
                      className={`aspect-square rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-lg'
                          : isPast
                          ? 'text-white/20 cursor-not-allowed'
                          : isToday
                          ? 'border border-primary/60 text-primary-light hover:bg-primary/20'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'time' && (
            <div className="p-4 flex flex-col items-center gap-4">
              {selDay != null ? (
                <p className="text-white/40 text-xs">{selDay} de {MONTHS[selMonth ?? 0]}, {selYear}</p>
              ) : (
                <p className="text-amber-400/80 text-xs">← Elige primero una fecha</p>
              )}

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setHour(h => (h + 1) % 24)}
                    className="w-10 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors font-bold"
                  >▲</button>
                  <div className="w-14 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-2xl font-bold text-white tabular-nums">
                    {String(hour).padStart(2,'0')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHour(h => (h - 1 + 24) % 24)}
                    className="w-10 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors font-bold"
                  >▼</button>
                  <span className="text-[10px] text-white/25 font-semibold">HORA</span>
                </div>

                <span className="text-3xl font-bold text-white/20 pb-5">:</span>

                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMinute(m => (m + 15) % 60)}
                    className="w-10 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors font-bold"
                  >▲</button>
                  <div className="w-14 h-12 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-2xl font-bold text-white tabular-nums">
                    {String(minute).padStart(2,'0')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMinute(m => (m - 15 + 60) % 60)}
                    className="w-10 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors font-bold"
                  >▼</button>
                  <span className="text-[10px] text-white/25 font-semibold">MIN</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_TIMES.map(({ label, h, m }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setHour(h); setMinute(m) }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      hour === h && minute === m
                        ? 'bg-primary/30 border-primary/60 text-primary-light'
                        : 'border-white/10 text-white/40 hover:text-white hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 pb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 py-2 text-xs text-white/40 hover:text-white rounded-lg border border-white/10 hover:border-white/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={selDay == null}
              className="flex-1 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selDay == null ? 'Elige una fecha' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
