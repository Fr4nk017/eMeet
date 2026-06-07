import { createAnonClient } from '../lib/supabase';
import { unauthorized, serverError } from '../utils/http';

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000;
const authCache = new Map();

export async function withAuth(req, res, next) {
    try {
        const rawAuth = req.headers.authorization;
        const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7) : null;
        if (!token) {
            return unauthorized(res, 'Falta token de autorización.');
        }
        const cached = authCache.get(token);
        if (cached && cached.expiresAt > Date.now()) {
            req.supabase = createAnonClient(token);
            req.authUser = cached.user;
            return next();
        }
        const supabase = createAnonClient(token);
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
            return unauthorized(res, 'Sesión inválida o expirada.');
        }
        authCache.set(token, { user: data.user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
        req.supabase = supabase;
        req.authUser = data.user;
        next();
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error interno de autenticación.';
        console.error('[withAuth] fatal:', message);
        return serverError(res, message);
    }
}
//# sourceMappingURL=auth.js.map
