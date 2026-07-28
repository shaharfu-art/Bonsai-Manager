-- Run in Supabase SQL Editor to create announcements system

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'free', 'premium', 'specific')),
  target_users uuid[] DEFAULT '{}',
  active boolean DEFAULT true,
  send_push boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "Announcements are publicly readable"
  ON announcements FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Examples:
-- To all users:
-- INSERT INTO announcements (title, body, type, target) VALUES ('ברוכים הבאים!', 'תודה שהצטרפתם ל-YUTAKA.', 'success', 'all');

-- To free users only (upgrade promo):
-- INSERT INTO announcements (title, body, type, target) VALUES ('🎉 מבצע שדרוג!', 'שדרג ל-Premium ב-50% הנחה החודש', 'info', 'free');

-- To specific users:
-- INSERT INTO announcements (title, body, type, target, target_users) VALUES ('שלום!', 'הודעה אישית', 'info', 'specific', ARRAY['user-uuid-here']::uuid[]);

-- Expires in 7 days:
-- INSERT INTO announcements (title, body, type, target, expires_at) VALUES ('מבצע מוגבל!', 'רק עד סוף השבוע', 'warning', 'all', now() + interval '7 days');
