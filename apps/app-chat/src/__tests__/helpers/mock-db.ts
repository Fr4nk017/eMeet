// Shared in-memory store — all mock Supabase clients read/write here.
export const db = {
  chat_rooms: new Map<string, Record<string, any>>(),
  room_members: new Map<string, Record<string, any>>(),
  chat_messages: new Map<string, Record<string, any>>(),
  profiles: new Map<string, Record<string, any>>(),
}

export function resetDb(): void {
  for (const table of Object.values(db)) table.clear()
}

export function seedProfile(id: string, name: string, avatarUrl: string | null = null): void {
  db.profiles.set(id, { id, name, avatar_url: avatarUrl })
}

// ─── Key helpers ──────────────────────────────────────────────────────────────

function rowKey(table: string, row: Record<string, any>): string {
  return table === 'room_members' ? `${row.room_id}:${row.user_id}` : String(row.id)
}

function conflictKey(table: string, row: Record<string, any>, onConflict = 'id'): string {
  if (onConflict === 'room_id,user_id') return `${row.room_id}:${row.user_id}`
  return String(row[onConflict] ?? row.id)
}

function applyFilters(
  rows: Record<string, any>[],
  filters: { col: string; op: string; val: any }[],
): Record<string, any>[] {
  return rows.filter(row =>
    filters.every(({ col, op, val }) => {
      switch (op) {
        case 'eq':  return row[col] === val
        case 'neq': return row[col] !== val
        case 'lt':  return String(row[col]) < String(val)
        case 'gt':  return String(row[col]) > String(val)
        case 'in':  return Array.isArray(val) && val.includes(row[col])
        default:    return true
      }
    }),
  )
}

// ─── QueryBuilder ─────────────────────────────────────────────────────────────

class QueryBuilder {
  private t: string
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private filters: { col: string; op: string; val: any }[] = []
  private insertRows: Record<string, any>[] = []
  private updateData: Record<string, any> | null = null
  private upsertRows: Record<string, any>[] = []
  private upsertOpts: any = null
  private orderCol?: string
  private orderAsc = true
  private limitTo?: number
  private countMode = false
  private withSelect = false

  constructor(table: string) { this.t = table }

  private map(): Map<string, any> { return (db as any)[this.t] ?? new Map() }
  private all(): Record<string, any>[] { return Array.from(this.map().values()) }
  private filtered(): Record<string, any>[] { return applyFilters(this.all(), this.filters) }

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.countMode = opts?.count === 'exact'
    if (['insert', 'update', 'delete'].includes(this.op)) this.withSelect = true
    else this.op = 'select'
    return this
  }

  insert(data: Record<string, any> | Record<string, any>[]) {
    this.insertRows = Array.isArray(data) ? data : [data]
    this.op = 'insert'
    return this
  }

  update(data: Record<string, any>) { this.updateData = data; this.op = 'update'; return this }

  upsert(data: Record<string, any> | Record<string, any>[], opts?: any) {
    this.upsertRows = Array.isArray(data) ? data : [data]
    this.upsertOpts = opts
    this.op = 'upsert'
    return this
  }

  delete() { this.op = 'delete'; return this }

  eq(c: string, v: any)  { this.filters.push({ col: c, op: 'eq',  val: v }); return this }
  neq(c: string, v: any) { this.filters.push({ col: c, op: 'neq', val: v }); return this }
  lt(c: string, v: any)  { this.filters.push({ col: c, op: 'lt',  val: v }); return this }
  gt(c: string, v: any)  { this.filters.push({ col: c, op: 'gt',  val: v }); return this }
  in(c: string, vals: any[]) { this.filters.push({ col: c, op: 'in', val: vals }); return this }

  order(col: string, opts?: { ascending: boolean }) {
    this.orderCol = col; this.orderAsc = opts?.ascending ?? true; return this
  }

  limit(n: number) { this.limitTo = n; return this }

  private exec(): { data: any; error: any; count?: number } {
    const map = this.map()

    switch (this.op) {
      case 'select': {
        let rows = this.filtered()
        if (this.orderCol) {
          const col = this.orderCol, asc = this.orderAsc
          rows = [...rows].sort((a, b) =>
            String(a[col]) < String(b[col]) ? (asc ? -1 : 1) :
            String(a[col]) > String(b[col]) ? (asc ? 1 : -1) : 0,
          )
        }
        if (this.limitTo !== undefined) rows = rows.slice(0, this.limitTo)
        if (this.countMode) return { data: null, error: null, count: rows.length }
        return { data: rows, error: null }
      }

      case 'insert': {
        const inserted: Record<string, any>[] = []
        for (const row of this.insertRows) {
          map.set(rowKey(this.t, row), { ...row })
          inserted.push(row)
        }
        return { data: inserted.length === 1 ? inserted[0] : inserted, error: null }
      }

      case 'upsert': {
        for (const row of this.upsertRows) {
          const key = conflictKey(this.t, row, this.upsertOpts?.onConflict)
          const existing = map.get(key)
          if (!(existing && this.upsertOpts?.ignoreDuplicates)) {
            map.set(key, { ...(existing ?? {}), ...row })
          }
        }
        return { data: null, error: null }
      }

      case 'update': {
        const matching = this.filtered()
        const updated: Record<string, any>[] = []
        for (const row of matching) {
          const updatedRow = { ...row, ...this.updateData }
          map.set(rowKey(this.t, row), updatedRow)
          updated.push(updatedRow)
        }
        return { data: updated, error: null }
      }

      case 'delete': {
        const matching = this.filtered()
        for (const row of matching) map.delete(rowKey(this.t, row))
        return { data: matching, error: null }
      }

      default:
        return { data: null, error: null }
    }
  }

  then(resolve: (v: any) => any, reject?: (r: any) => any) {
    return Promise.resolve(this.exec()).then(resolve, reject)
  }

  async single(): Promise<{ data: any; error: any }> {
    const r = this.exec()
    if (r.error) return r
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    return row
      ? { data: row, error: null }
      : { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const r = this.exec()
    if (r.error) return r
    const row = Array.isArray(r.data) ? (r.data[0] ?? null) : r.data
    return { data: row, error: null }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createMockClient() {
  return {
    from: (table: string) => new QueryBuilder(table),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  }
}
