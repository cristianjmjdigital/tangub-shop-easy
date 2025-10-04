-- Migration 0008: Extend vendors table with operational & branding fields
-- Adds columns used by vendor settings UI and public listings.
-- Safe to run multiple times (IF NOT EXISTS guards / default additions).

begin;

alter table public.vendors
  add column if not exists contact_phone text,
  add column if not exists accepting_orders boolean not null default true,
  add column if not exists base_delivery_fee numeric(10,2) not null default 0,
  add column if not exists hero_image_url text,
  add column if not exists logo_url text;

-- Simple trigger already exists for updated_at; ensure updated_at updates on changes.
-- (Assumes set_updated_at() exists)

commit;
