export interface LocalProfile {
  id: string;
  name: string;
  created_at: string;
}

/* The query adapter intentionally mirrors Supabase's dynamic row result API. */
/* eslint-disable @typescript-eslint/no-explicit-any */
type LocalRow = Record<string, any>;
type QueryResult = { data: any; error: Error | null; count: number | null };
/* eslint-enable @typescript-eslint/no-explicit-any */
type Filter = { column: string; operator: 'eq' | 'neq' | 'gte'; value: unknown };
type QueryAction = 'select' | 'insert' | 'update' | 'delete';

const STORAGE_PREFIX = 'greenfit.local.v1';
const PROFILES_KEY = `${STORAGE_PREFIX}.profiles`;
const ACTIVE_PROFILE_KEY = `${STORAGE_PREFIX}.active-profile`;

const DEFAULT_ROUTINES = [
  { name: 'Drink a glass of water', icon: 'Droplet', time_of_day: 'morning', sort_order: 1 },
  { name: 'Stretch for 2 minutes', icon: 'Activity', time_of_day: 'morning', sort_order: 2 },
  { name: 'Eat a healthy breakfast', icon: 'Apple', time_of_day: 'morning', sort_order: 3 },
  { name: 'Take a short walk', icon: 'Footprints', time_of_day: 'afternoon', sort_order: 4 },
  { name: 'Practice deep breathing', icon: 'Wind', time_of_day: 'afternoon', sort_order: 5 },
  { name: 'Tidy your workspace', icon: 'Sparkles', time_of_day: 'afternoon', sort_order: 6 },
  { name: 'Reflect on your day', icon: 'NotebookPen', time_of_day: 'evening', sort_order: 7 },
  { name: 'Turn off screens early', icon: 'Moon', time_of_day: 'evening', sort_order: 8 },
];

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalProfiles(): LocalProfile[] {
  if (typeof window === 'undefined') return [];
  return readJson<LocalProfile[]>(PROFILES_KEY, []);
}

export function getActiveLocalProfile(): LocalProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedActiveId = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
    let activeId = storedActiveId;
    if (storedActiveId) {
      try {
        activeId = JSON.parse(storedActiveId) as string;
      } catch {
        activeId = storedActiveId;
      }
    }
    return getLocalProfiles().find((profile) => profile.id === activeId) || null;
  } catch {
    return null;
  }
}

export function setActiveLocalProfile(profileId: string): void {
  if (!getLocalProfiles().some((profile) => profile.id === profileId)) {
    throw new Error('Local profile was not found.');
  }
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

export function clearActiveLocalProfile(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
}

export function createLocalProfile(name: string): LocalProfile {
  const cleanName = name.trim().slice(0, 40);
  if (!cleanName) throw new Error('Enter a profile name.');

  const profile: LocalProfile = {
    id: createId(),
    name: cleanName,
    created_at: new Date().toISOString(),
  };
  writeJson(PROFILES_KEY, [...getLocalProfiles(), profile]);
  window.localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);

  const createdAt = new Date().toISOString();
  writeRows(profile.id, 'app_state', [{
    id: createId(),
    user_id: profile.id,
    school_name: '',
    grade: '',
    division: '',
    student_count: 0,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    total_points: 0,
    created_at: createdAt,
  }]);
  writeRows(profile.id, 'routine_items', DEFAULT_ROUTINES.map((routine) => ({
    ...routine,
    id: createId(),
    user_id: profile.id,
    created_at: createdAt,
  })));

  return profile;
}

function dataKey(profileId: string, table: string): string {
  return `${STORAGE_PREFIX}.${profileId}.${table}`;
}

function readRows(profileId: string, table: string): LocalRow[] {
  return readJson<LocalRow[]>(dataKey(profileId, table), []);
}

function writeRows(profileId: string, table: string, rows: LocalRow[]): void {
  writeJson(dataKey(profileId, table), rows);
}

function compare(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return left < right ? -1 : 1;
}

class LocalQuery implements PromiseLike<QueryResult> {
  private action: QueryAction = 'select';
  private values: LocalRow[] = [];
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rowLimit: number | null = null;
  private singleResult = false;
  private returning = false;

  constructor(private readonly table: string) {}

  select(_columns = '*', _options?: unknown): this {
    void _columns;
    void _options;
    this.returning = true;
    return this;
  }

  insert(values: LocalRow | LocalRow[]): this {
    this.action = 'insert';
    this.values = Array.isArray(values) ? values : [values];
    return this;
  }

  update(values: LocalRow): this {
    this.action = 'update';
    this.values = [values];
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'neq', value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ column, operator: 'gte', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(value: number): this {
    this.rowLimit = value;
    return this;
  }

  single(): this {
    this.singleResult = true;
    return this;
  }

  maybeSingle(): this {
    this.singleResult = true;
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined);
  }

  private async execute(): Promise<QueryResult> {
    const profile = getActiveLocalProfile();
    if (!profile) return { data: null, error: new Error('Choose a local profile first.'), count: null };

    try {
      let rows = readRows(profile.id, this.table);
      let affected: LocalRow[] = [];

      if (this.action === 'insert') {
        affected = this.values.map((value) => ({
          ...value,
          id: value.id || createId(),
          created_at: value.created_at || new Date().toISOString(),
        }));
        rows = [...rows, ...affected];
        writeRows(profile.id, this.table, rows);
      } else {
        const matches = (row: LocalRow) => this.filters.every((filter) => {
          const value = row[filter.column];
          if (filter.operator === 'eq') return value === filter.value;
          if (filter.operator === 'neq') return value !== filter.value;
          return compare(value, filter.value) >= 0;
        });

        if (this.action === 'update') {
          affected = rows.filter(matches).map((row) => Object.assign(row, this.values[0]));
          if (affected.length) writeRows(profile.id, this.table, rows);
        } else if (this.action === 'delete') {
          affected = rows.filter(matches);
          rows = rows.filter((row) => !matches(row));
          if (affected.length) writeRows(profile.id, this.table, rows);
        } else {
          affected = rows.filter(matches);
          if (this.orderBy) {
            const direction = this.orderBy.ascending ? 1 : -1;
            affected.sort((left, right) => direction * compare(left[this.orderBy!.column], right[this.orderBy!.column]));
          }
          if (this.rowLimit !== null) affected = affected.slice(0, this.rowLimit);
        }
      }

      const data = this.action === 'select' || this.returning
        ? this.singleResult ? affected[0] || null : affected
        : null;
      return { data, error: null, count: affected.length };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Local storage is unavailable.'),
        count: null,
      };
    }
  }
}

export const supabase = {
  from: (table: string): LocalQuery => new LocalQuery(table),
};
