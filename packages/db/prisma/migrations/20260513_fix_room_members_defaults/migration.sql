-- Migration: garantiza DEFAULT now() en joined_at y last_read_at de room_members
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run

ALTER TABLE "public"."room_members"
  ALTER COLUMN "joined_at"    SET DEFAULT now(),
  ALTER COLUMN "last_read_at" SET DEFAULT now();
