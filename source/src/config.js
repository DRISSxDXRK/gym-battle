// Supabase connection config — wired 2026-10-12.
export const SUPABASE_URL = 'https://dqlzqnezvfqladtuvbgu.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbHpxbmV6dmZxbGFkdHV2Ymd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MzcwNzEsImV4cCI6MjEwNzQxMzA3MX0.bmid4pbTsFQg9ij-5hmSMcP5ecXj-DVblVp3xYfCqvQ'

export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY')
