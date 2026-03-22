# Supabase Configuration for Project Alexander (v2)

## 1. Create the Profiles Table (Roles)
Run this to manage who is a Mentor and who is a Learner.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'learner', -- 'mentor' or 'learner'
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 2. Update Translations Table & Policies
Run this to allow authenticated users to manage their own data.

```sql
-- Add uniqueness constraint to prevent exact duplicates (Same word, same translation)
ALTER TABLE public.translations 
ADD CONSTRAINT unique_translation UNIQUE (source_word, kitaveta);

-- Update Policies for Translations
DROP POLICY IF EXISTS "Users can insert translations" ON public.translations;
CREATE POLICY "Mentors can insert" ON public.translations 
FOR INSERT WITH CHECK (true); -- We will verify role in the app logic

-- Update Policies for Storage (pronunciations bucket)
-- Ensure you go to Storage -> pronunciations -> Policies
-- 1. SELECT: Allow Public
-- 2. INSERT: Allow Authenticated
-- 3. DELETE: Allow Authenticated (Owner)
```
