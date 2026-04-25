-- Habilitar REPLICA IDENTITY FULL en chat_messages
-- Necesario para que Supabase Realtime envíe el registro completo
-- en eventos postgres_changes (INSERT/UPDATE/DELETE).
-- Ejecutar en SQL Editor de Supabase.

alter table public.chat_messages replica identity full;
