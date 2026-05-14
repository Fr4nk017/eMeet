-- Migration: add status + expires_at to chat_rooms
-- Usa TEXT + CHECK en lugar de ENUM para evitar problemas de naming en Supabase.
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run

-- 1. Agregar columnas (idempotente con IF NOT EXISTS)
ALTER TABLE "public"."chat_rooms"
  ADD COLUMN IF NOT EXISTS "status"     TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'deleted')),
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ;

-- 2. Si la columna ya existía pero le falta el DEFAULT, forzarlo
ALTER TABLE "public"."chat_rooms"
  ALTER COLUMN "status" SET DEFAULT 'active';

-- 3. Índice para el cleanup job
CREATE INDEX IF NOT EXISTS idx_chat_rooms_status_expires
  ON "public"."chat_rooms" (status, expires_at)
  WHERE status = 'active';
