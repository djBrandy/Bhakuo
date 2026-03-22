# Final Supabase Setup for Project Alexander

Copy and paste this entire block into your **Supabase SQL Editor** and click **Run**. This will clean up duplicates, set up the unique constraints, and create the profiles table with its automatic trigger.

```sql
-- 1. CLEAN UP DUPLICATES (If you have 'Dad'/'Bhakuo' twice, this removes the extra one)
DELETE FROM public.translations 
WHERE id IN (
    SELECT id 
    FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY source_word, kitaveta ORDER BY created_at) as row_num 
        FROM public.translations
    ) t 
    WHERE t.row_num > 1
);

-- 2. ADD UNIQUENESS CONSTRAINT (Prevents exact duplicates in the future)
ALTER TABLE public.translations 
ADD CONSTRAINT unique_translation UNIQUE (source_word, kitaveta);

-- 3. CREATE PROFILES TABLE (For roles like Mentor/Learner)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'learner', -- 'mentor' or 'learner'
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SETUP AUTOMATIC PROFILE CREATION
-- This makes sure every new user gets a profile entry automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- 5. UPDATE PERMISSIONS (Enable RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

### Storage Bucket Reminder
Ensure your `pronunciations` bucket in **Storage** has these policies:
1. **SELECT**: Allow Public (All users).
2. **INSERT**: Allow Authenticated (Logged-in users).
