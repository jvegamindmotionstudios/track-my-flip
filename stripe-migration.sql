-- Run this in your Supabase SQL Editor to prepare your database for Stripe subscriptions

-- 1. Add the "is_pro" column to your user profiles table
ALTER TABLE user_profiles ADD COLUMN is_pro BOOLEAN DEFAULT false;

-- 2. Optional: If you want to track stripe customer ID for refunds/cancellations
ALTER TABLE user_profiles ADD COLUMN stripe_customer_id TEXT;

-- That's it! Your Edge Function will automatically flip "is_pro" to true when they pay.
