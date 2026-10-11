-- Alleen voor de lokale tests.
-- Supabase levert zelf het schema "auth" en de rollen anon/authenticated.
-- Deze nabootsing maakt het mogelijk de toegangsregels te testen in een
-- gewone Postgres-database, zonder Supabase-account of Docker.
-- De functies auth.uid() en auth.jwt() lezen net als bij Supabase de
-- instelling "request.jwt.claims".

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  -- De kolommen hieronder gebruikt alleen het laden van de demo-gegevens.
  instance_id uuid,
  aud text,
  role text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text
);

create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- Supabase geeft nieuwe tabellen en functies in "public" standaard aan deze
-- rollen. De migratie moet dat zelf weer dichtzetten; zo wordt dat meegetest.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
