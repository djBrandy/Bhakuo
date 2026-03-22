# Supabase Configuration for Project Alexander

To fix the errors and enable all features, follow these steps in your [Supabase Dashboard](https://supabase.com).

## 1. Create the Database Table
Go to the **SQL Editor** in the left sidebar, click **"New Query"**, paste this code, and click **Run**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the translations table
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES auth.users(id),
  source_language TEXT NOT NULL, -- 'english' or 'swahili'
  source_word TEXT NOT NULL,
  kitaveta TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view translations
CREATE POLICY "Public can read translations" 
ON public.translations FOR SELECT 
USING (true);

-- Allow logged-in users to add translations
CREATE POLICY "Authenticated users can insert translations" 
ON public.translations FOR INSERT 
WITH CHECK (auth.uid() = creator_id);
```

## 2. Set Up Audio Storage
Go to **Storage** in the left sidebar:
1.  Click **"New Bucket"**.
2.  Name it exactly: `pronunciations`.
3.  Set the toggle to **Public** (important for learners to hear the audio).
4.  Go to the **Policies** tab for this bucket:
    - Add a policy to allow **"INSERT"** for **Authenticated** users.
    - Add a policy to allow **"SELECT"** for **All Users (Public)**.

## 3. Verify Connections
After running the SQL, the error "Could not find the table public.translations" will disappear.
