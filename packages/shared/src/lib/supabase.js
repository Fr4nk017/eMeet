import { createClient } from '@supabase/supabase-js';
export function createAnonClient(authToken) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    return createClient(url, key, authToken ? { global: { headers: { Authorization: `Bearer ${authToken}` } } } : undefined);
}
export function createServiceRoleClient() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
//# sourceMappingURL=supabase.js.map