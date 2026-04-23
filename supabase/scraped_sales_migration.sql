-- Run this in your Supabase SQL Editor to prepare your database for Background Cron Scraping

-- 0. Enable required extensions for background jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create the scraped_sales cache table
CREATE TABLE IF NOT EXISTS public.scraped_sales (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    url TEXT,
    source TEXT,
    address TEXT,
    city TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable simple read access so the frontend can query it instantly
ALTER TABLE public.scraped_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
    ON public.scraped_sales FOR SELECT
    USING (true);

-- 3. Setup the Cron schedule using pg_cron and pg_net extension
-- IMPORTANT: Make sure the 'pg_net' extension is enabled in your Supabase Dashboard
-- Replace [PROJECT_REF] and [ANON_KEY] with your actual Supabase credentials found in API Settings.

-- Uncomment 'SELECT cron.schedule...' below AFTER updating your URL and ANON_KEY!

SELECT cron.schedule(
    'scrape-cron-job',
    '0 0,4,8,12,16,20 * * *', -- Run every 4 hours automatically
    $$
    SELECT net.http_post(
        url:='https://[PROJECT_REF].supabase.co/functions/v1/scrape-cron',
        headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb,
        body:='{"regions": ["sfbay", "losangeles", "newyork", "chicago"]}'::jsonb
    ) as request_id;
    $$
);
