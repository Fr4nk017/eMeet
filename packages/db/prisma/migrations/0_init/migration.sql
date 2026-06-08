-- eMeet — Migración inicial completa
-- Generada: 2026-06-06
-- Aplicar con: npx prisma migrate resolve --applied "0_init"
-- (después de ejecutar rls-triggers.sql en el SQL Editor de Supabase)

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'locatario', 'admin');

-- CreateEnum
CREATE TYPE "public"."EventCategory" AS ENUM (
  'gastronomia',
  'musica',
  'cultura',
  'networking',
  'deporte',
  'fiesta',
  'teatro',
  'arte'
);

-- CreateEnum
CREATE TYPE "public"."UserEventAction" AS ENUM ('like', 'save');

-- CreateEnum
CREATE TYPE "public"."ChatRoomStatus" AS ENUM ('active', 'expired', 'deleted');

-- CreateTable profiles
CREATE TABLE "public"."profiles" (
  "id"                UUID        NOT NULL,
  "name"              TEXT        NOT NULL DEFAULT '',
  "bio"               TEXT        NOT NULL DEFAULT '',
  "avatar_url"        TEXT,
  "location"          TEXT        NOT NULL DEFAULT 'Santiago, Chile',
  "interests"         "public"."EventCategory"[] NOT NULL DEFAULT ARRAY[]::"public"."EventCategory"[],
  "role"              "public"."UserRole" NOT NULL DEFAULT 'user',
  "business_name"     TEXT,
  "business_location" TEXT,
  "is_banned"         BOOLEAN     NOT NULL DEFAULT false,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable profile_followers
CREATE TABLE "public"."profile_followers" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "follower_id" UUID        NOT NULL,
  "followed_id" UUID        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "profile_followers_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "profile_followers_unique"  UNIQUE ("follower_id", "followed_id"),
  CONSTRAINT "no_self_follow"            CHECK ("follower_id" <> "followed_id")
);

-- CreateTable locatario_events
CREATE TABLE "public"."locatario_events" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "creator_id"       UUID        NOT NULL,
  "title"            TEXT        NOT NULL,
  "description"      TEXT        NOT NULL DEFAULT '',
  "category"         "public"."EventCategory" NOT NULL,
  "event_date"       TIMESTAMPTZ NOT NULL,
  "address"          TEXT        NOT NULL DEFAULT '',
  "price"            DECIMAL(10, 2),
  "image_url"        TEXT,
  "video_url"        TEXT,
  "audio_url"        TEXT,
  "organizer_name"   TEXT        NOT NULL DEFAULT '',
  "organizer_avatar" TEXT,
  "lat"              FLOAT8,
  "lng"              FLOAT8,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "locatario_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_events
-- NOTA: event_id es TEXT (no UUID) — soporta IDs de Google Places
CREATE TABLE "public"."user_events" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         UUID        NOT NULL,
  "event_id"        TEXT        NOT NULL,
  "event_title"     TEXT,
  "event_image_url" TEXT,
  "event_address"   TEXT,
  "action"          "public"."UserEventAction" NOT NULL,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "user_events_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "user_events_user_event_action_key" UNIQUE ("user_id", "event_id", "action")
);

-- CreateTable chat_rooms
CREATE TABLE "public"."chat_rooms" (
  "id"              TEXT        NOT NULL,
  "event_title"     TEXT        NOT NULL,
  "event_image_url" TEXT,
  "event_address"   TEXT,
  "status"          "public"."ChatRoomStatus" NOT NULL DEFAULT 'active',
  "expires_at"      TIMESTAMPTZ,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable room_members
CREATE TABLE "public"."room_members" (
  "room_id"      TEXT        NOT NULL,
  "user_id"      UUID        NOT NULL,
  "joined_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "last_read_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "room_members_pkey" PRIMARY KEY ("room_id", "user_id")
);

-- CreateTable chat_messages
CREATE TABLE "public"."chat_messages" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "room_id"    TEXT        NOT NULL,
  "user_id"    UUID        NOT NULL,
  "text"       TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey profiles → auth.users
ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey profile_followers → profiles
ALTER TABLE "public"."profile_followers"
  ADD CONSTRAINT "profile_followers_follower_id_fkey"
  FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."profile_followers"
  ADD CONSTRAINT "profile_followers_followed_id_fkey"
  FOREIGN KEY ("followed_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey locatario_events → profiles
ALTER TABLE "public"."locatario_events"
  ADD CONSTRAINT "locatario_events_creator_id_fkey"
  FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey user_events → profiles
ALTER TABLE "public"."user_events"
  ADD CONSTRAINT "user_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey room_members → chat_rooms
ALTER TABLE "public"."room_members"
  ADD CONSTRAINT "room_members_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey room_members → profiles
ALTER TABLE "public"."room_members"
  ADD CONSTRAINT "room_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey chat_messages → chat_rooms
ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_room_id_fkey"
  FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey chat_messages → profiles
ALTER TABLE "public"."chat_messages"
  ADD CONSTRAINT "chat_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_profiles_role"      ON "public"."profiles"("role");
CREATE INDEX "idx_profiles_is_banned" ON "public"."profiles"("is_banned");
CREATE INDEX "idx_pf_follower"        ON "public"."profile_followers"("follower_id");
CREATE INDEX "idx_pf_followed"        ON "public"."profile_followers"("followed_id");
CREATE INDEX "idx_le_creator"         ON "public"."locatario_events"("creator_id");
CREATE INDEX "idx_le_event_date"      ON "public"."locatario_events"("event_date");
CREATE INDEX "idx_le_category"        ON "public"."locatario_events"("category");
CREATE INDEX "idx_ue_user_id"         ON "public"."user_events"("user_id");
CREATE INDEX "idx_ue_event_id"        ON "public"."user_events"("event_id");
CREATE INDEX "idx_ue_action"          ON "public"."user_events"("action");
CREATE INDEX "idx_cr_status"          ON "public"."chat_rooms"("status");
CREATE INDEX "idx_cr_expires_at"      ON "public"."chat_rooms"("expires_at");
CREATE INDEX "idx_rm_user_id"         ON "public"."room_members"("user_id");
CREATE INDEX "idx_cm_room_id"         ON "public"."chat_messages"("room_id");
CREATE INDEX "idx_cm_room_time"       ON "public"."chat_messages"("room_id", "created_at" DESC);
