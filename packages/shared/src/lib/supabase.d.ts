import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
export declare function createAnonClient(authToken?: string): SupabaseClient<Database>;
export declare function createServiceRoleClient(): SupabaseClient<Database>;
//# sourceMappingURL=supabase.d.ts.map