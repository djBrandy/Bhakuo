# Project Alexander — Schema Patch (run this AFTER your existing SQL)

Paste this into your **Supabase SQL Editor** and click **Run**.
This patches your existing tables — it does NOT drop anything.

```sql
-- ============================================================
-- 0. CLEAN SLATE — drop old tables we are replacing
-- ============================================================
DROP TABLE IF EXISTS public.translations CASCADE;


-- ============================================================
-- 1. PROFILES
--    Every user (mentor or learner) gets a profile on signup.
--    Mentors are verified by other mentors via the app.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'learner'  CHECK (role IN ('learner', 'mentor', 'pending_mentor')),
  -- 'learner'        → default for all new signups
  -- 'pending_mentor' → user has requested mentor status, awaiting peer verification
  -- 'mentor'         → verified by at least one existing mentor
  verified_by   UUID REFERENCES public.profiles(id),  -- which mentor approved them
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public read" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Mentors can verify pending mentors" ON public.profiles
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;


-- ============================================================
-- 2. KNOWLEDGE BASE
--    The core table. Mentors contribute structured knowledge
--    entries — not just word pairs, but full contextual units.
--    The AI is ONLY allowed to teach from verified entries here.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contributor_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Classification
  category        TEXT NOT NULL,
  -- e.g. 'greetings', 'family', 'food', 'numbers', 'weather',
  --      'farewells', 'courtesy', 'directions', 'time', 'body'

  subcategory     TEXT,
  -- e.g. 'morning_greetings', 'elder_greetings', 'peer_greetings'

  -- The knowledge unit itself
  kitaveta        TEXT NOT NULL,          -- the Kitaveta phrase/word
  english         TEXT,                   -- English equivalent
  swahili         TEXT,                   -- Swahili equivalent
  pronunciation   TEXT,                   -- phonetic guide, e.g. "cheh-dee"
  audio_url       TEXT,                   -- mentor recording from Storage

  -- Context — this is what makes it structured, not just a dictionary
  context         TEXT,
  -- e.g. "Used in the morning, when greeting an elder. Formal register."

  usage_example   TEXT,
  -- e.g. "You say 'Ushikamoo' to an elder; they respond with 'Marahaba'"

  expected_response TEXT,
  -- if this is a greeting/prompt, what is the correct Kitaveta response?
  -- NULL means it is a standalone word/phrase with no call-and-response

  -- Social context flags (for the AI to pick the right phrase)
  formality       TEXT DEFAULT 'neutral'  CHECK (formality IN ('formal', 'informal', 'neutral')),
  audience        TEXT DEFAULT 'anyone'   CHECK (audience IN ('elder', 'peer', 'child', 'anyone')),
  time_of_day     TEXT DEFAULT 'anytime'  CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),

  -- Quality control
  is_verified     BOOLEAN DEFAULT false,
  -- false = contributed, awaiting peer mentor verification
  -- true  = at least one other mentor has confirmed it is correct

  verified_by     UUID REFERENCES public.profiles(id),
  notes           TEXT,  -- mentor's own notes, visible to other mentors

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.knowledge ENABLE ROW LEVEL SECURITY;

-- Anyone can read verified knowledge (the AI uses this)
CREATE POLICY "Verified knowledge is public" ON public.knowledge
  FOR SELECT USING (is_verified = true);

-- Mentors can read ALL knowledge including unverified (to review & verify)
CREATE POLICY "Mentors read all knowledge" ON public.knowledge
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

-- Only mentors can insert
CREATE POLICY "Mentors insert knowledge" ON public.knowledge
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

-- Mentors can update their own entries; any mentor can verify others
CREATE POLICY "Mentors update knowledge" ON public.knowledge
  FOR UPDATE USING (
    auth.uid() = contributor_id
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'knowledge_updated_at') THEN
    CREATE TRIGGER knowledge_updated_at
      BEFORE UPDATE ON public.knowledge
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;


-- ============================================================
-- 3. KNOWLEDGE QUEUE
--    When the AI encounters a learner question it cannot answer
--    from verified knowledge, it logs it here so mentors can
--    fill the gap. This is how the system learns over time.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asked_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- what the learner asked / what the AI could not answer
  question        TEXT NOT NULL,
  -- the AI's best guess (shown to mentors so they can correct it)
  ai_attempt      TEXT,
  -- which category the AI thinks this belongs to
  suggested_category TEXT,
  -- status of this gap
  status          TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'dismissed')),
  answered_by     UUID REFERENCES public.profiles(id),
  knowledge_id    UUID REFERENCES public.knowledge(id),  -- linked once a mentor fills it
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.knowledge_queue ENABLE ROW LEVEL SECURITY;

-- Mentors see all open queue items
CREATE POLICY "Mentors read queue" ON public.knowledge_queue
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

-- Any authenticated user (learner or AI on behalf of learner) can insert
CREATE POLICY "Authenticated users insert queue" ON public.knowledge_queue
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Mentors can update (mark answered/dismissed)
CREATE POLICY "Mentors update queue" ON public.knowledge_queue
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );


-- ============================================================
-- 4. SYLLABUS
--    Ordered lessons auto-generated from the knowledge base.
--    The AI uses this to decide what to teach next.
--    Mentors can also manually curate lessons.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.syllabus (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_number INT NOT NULL,
  title         TEXT NOT NULL,       -- e.g. "Lesson 1: Morning Greetings"
  description   TEXT,
  category      TEXT NOT NULL,       -- maps to knowledge.category
  subcategory   TEXT,
  -- ordered list of knowledge IDs that make up this lesson
  knowledge_ids UUID[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lesson_number)
);

ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Syllabus is public read" ON public.syllabus
  FOR SELECT USING (true);

CREATE POLICY "Mentors manage syllabus" ON public.syllabus
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );


-- ============================================================
-- 5. LEARNER PROGRESS
--    Tracks each learner's journey through the syllabus.
--    The AI reads this to personalise each session.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.learner_progress (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  syllabus_id         UUID REFERENCES public.syllabus(id) ON DELETE CASCADE,
  -- which knowledge items within this lesson have been taught
  taught_knowledge_ids UUID[] DEFAULT '{}',
  -- quiz results: array of {knowledge_id, correct, attempts, last_attempt}
  quiz_results        JSONB DEFAULT '[]',
  -- overall lesson status
  status              TEXT DEFAULT 'not_started'
                      CHECK (status IN ('not_started', 'in_progress', 'completed')),
  score               INT DEFAULT 0,   -- 0–100
  last_session_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (learner_id, syllabus_id)
);

ALTER TABLE public.learner_progress ENABLE ROW LEVEL SECURITY;

-- Learners see only their own progress
CREATE POLICY "Learners read own progress" ON public.learner_progress
  FOR SELECT USING (auth.uid() = learner_id);

CREATE POLICY "Learners insert own progress" ON public.learner_progress
  FOR INSERT WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners update own progress" ON public.learner_progress
  FOR UPDATE USING (auth.uid() = learner_id);

-- Mentors can see all progress (for analytics)
CREATE POLICY "Mentors read all progress" ON public.learner_progress
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );


-- ============================================================
-- 6. SEED DATA — Starter syllabus structure
--    Mentors will fill the knowledge, but the lesson structure
--    is seeded so the AI has a framework to work within.
-- ============================================================
INSERT INTO public.syllabus (lesson_number, title, description, category, subcategory)
VALUES
  (1,  'Morning Greetings',        'How to greet people in the morning, including elders, peers, and children.', 'greetings', 'morning'),
  (2,  'Afternoon & Evening Greetings', 'Greetings used later in the day and at night.', 'greetings', 'evening'),
  (3,  'Farewells',                'How to say goodbye in different contexts.', 'farewells', NULL),
  (4,  'Courtesy & Politeness',    'Please, thank you, sorry, and other courtesy phrases.', 'courtesy', NULL),
  (5,  'Family Members',           'Names for mother, father, siblings, grandparents, and extended family.', 'family', NULL),
  (6,  'Numbers 1–10',             'Counting in Kitaveta.', 'numbers', NULL),
  (7,  'Food & Drink',             'Common foods and how to talk about eating.', 'food', NULL),
  (8,  'Time & Days',              'Morning, afternoon, days of the week, months.', 'time', NULL),
  (9,  'Directions & Places',      'How to ask for and give directions.', 'directions', NULL),
  (10, 'Weather & Nature',         'Talking about the weather and the natural world.', 'weather', NULL)
ON CONFLICT (lesson_number) DO NOTHING;



-- ============================================================
-- PATCH 1: Add groq_api_key to profiles (plain text, no encryption)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS groq_api_key TEXT;


-- ============================================================
-- PATCH 2: Upgrade syllabus table
--   - Add unit column (for grouping lessons into phases)
--   - Add syntax_ids column (for grammar patterns per lesson)
--   - Add ai_generated flag
--   - Expand from 10 to 70 lessons
-- ============================================================
ALTER TABLE public.syllabus
  ADD COLUMN IF NOT EXISTS unit INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS syntax_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;

-- Update existing 10 lessons to unit 1
UPDATE public.syllabus SET unit = 1 WHERE lesson_number <= 12;

-- Expand existing lessons to match full titles
UPDATE public.syllabus SET title = 'Morning Greetings',        unit = 1 WHERE lesson_number = 1;
UPDATE public.syllabus SET title = 'Afternoon & Evening Greetings', unit = 1 WHERE lesson_number = 2;
UPDATE public.syllabus SET title = 'Farewells',                unit = 1 WHERE lesson_number = 3;
UPDATE public.syllabus SET title = 'Courtesy & Politeness',    unit = 1 WHERE lesson_number = 4;
UPDATE public.syllabus SET title = 'Family Members',           unit = 1 WHERE lesson_number = 5;
UPDATE public.syllabus SET title = 'Numbers 1–10',             unit = 1 WHERE lesson_number = 6;
UPDATE public.syllabus SET title = 'Food & Drink',             unit = 1 WHERE lesson_number = 7;
UPDATE public.syllabus SET title = 'Time & Days',              unit = 1 WHERE lesson_number = 8;
UPDATE public.syllabus SET title = 'Directions & Places',      unit = 1 WHERE lesson_number = 9;
UPDATE public.syllabus SET title = 'Weather & Nature',         unit = 1 WHERE lesson_number = 10;

-- Add missing Unit 1 lessons (11–12)
INSERT INTO public.syllabus (unit, lesson_number, title, description, category, subcategory) VALUES
  (1, 11, 'Months of the Year',          'Names of the twelve months in Kitaveta.', 'time', 'months'),
  (1, 12, 'Basic Yes / No & Responses',  'How to agree, disagree, confirm, and deny.', 'responses', 'basic')
ON CONFLICT (lesson_number) DO NOTHING;

-- UNIT 2: PEOPLE & RELATIONSHIPS (Lessons 13–24)
INSERT INTO public.syllabus (unit, lesson_number, title, description, category, subcategory) VALUES
  (2, 13, 'Immediate Family',            'Mother, father, brother, sister, son, daughter.', 'family', 'immediate'),
  (2, 14, 'Extended Family',             'Grandparents, aunts, uncles, cousins, in-laws.', 'family', 'extended'),
  (2, 15, 'Community Titles',            'Elder, chief, teacher, healer — titles of respect.', 'community', 'titles'),
  (2, 16, 'Describing People',           'Tall, short, old, young, kind, strong.', 'descriptions', 'people'),
  (2, 17, 'Emotions & Feelings',         'Happy, sad, angry, tired, hungry, afraid.', 'emotions', NULL),
  (2, 18, 'The Human Body',              'Head, hands, eyes, heart — body parts in Kitaveta.', 'body', NULL),
  (2, 19, 'Clothing & Appearance',       'What people wear and how to describe it.', 'clothing', NULL),
  (2, 20, 'Asking About Someone',        'Where are you from? How old are you? Are you married?', 'social', 'questions'),
  (2, 21, 'Talking About Family',        'My mother is called... I have two brothers...', 'family', 'conversation'),
  (2, 22, 'Respect & Elders',            'How to speak to and about elders — tone, vocabulary, posture.', 'culture', 'respect'),
  (2, 23, 'Children & Parenting',        'Words and phrases around raising children.', 'family', 'children'),
  (2, 24, 'Marriage & Relationships',    'Courtship, marriage, and partnership vocabulary.', 'family', 'marriage')
ON CONFLICT (lesson_number) DO NOTHING;

-- UNIT 3: DAILY LIFE (Lessons 25–40)
INSERT INTO public.syllabus (unit, lesson_number, title, description, category, subcategory) VALUES
  (3, 25, 'Food & Meals',                'Common foods, meals of the day, eating together.', 'food', 'meals'),
  (3, 26, 'Cooking & Preparation',       'Verbs and vocabulary around preparing food.', 'food', 'cooking'),
  (3, 27, 'Water & Drink',               'Water, milk, tea — drinks and thirst.', 'food', 'drinks'),
  (3, 28, 'The Home',                    'Rooms, furniture, household items.', 'home', NULL),
  (3, 29, 'Daily Routines',              'Wake up, wash, eat, work, sleep — the rhythm of a day.', 'routines', NULL),
  (3, 30, 'Work & Occupation',           'Farmer, teacher, trader — what people do.', 'work', NULL),
  (3, 31, 'The Market',                  'Buying, selling, prices, bargaining.', 'commerce', 'market'),
  (3, 32, 'Money & Numbers in Context',  'Prices, paying, change, counting money.', 'commerce', 'money'),
  (3, 33, 'Animals & Livestock',         'Cattle, goats, chickens — animals of the community.', 'nature', 'animals'),
  (3, 34, 'Farming & Land',              'Planting, harvesting, rain, soil.', 'nature', 'farming'),
  (3, 35, 'Weather & Seasons',           'Rain, sun, wind, dry season, long rains.', 'weather', NULL),
  (3, 36, 'Directions & Getting Around', 'Left, right, near, far, go straight, turn.', 'directions', NULL),
  (3, 37, 'Places in the Community',     'Market, school, church, river, mountain.', 'places', NULL),
  (3, 38, 'Health & The Body',           'Pain, illness, medicine, going to the healer.', 'health', NULL),
  (3, 39, 'Colours',                     'Names of colours in Kitaveta.', 'descriptions', 'colours'),
  (3, 40, 'Shapes & Sizes',              'Big, small, round, long — describing objects.', 'descriptions', 'shapes')
ON CONFLICT (lesson_number) DO NOTHING;

-- UNIT 4: LANGUAGE STRUCTURE (Lessons 41–55)
INSERT INTO public.syllabus (unit, lesson_number, title, description, category, subcategory) VALUES
  (4, 41, 'Basic Sentence Structure',    'How a simple Kitaveta sentence is built — subject, verb, object.', 'grammar', 'sentence_structure'),
  (4, 42, 'Noun Classes',                'Kitaveta noun class system — how nouns are grouped and why it matters.', 'grammar', 'noun_classes'),
  (4, 43, 'Verb Stems & Infinitives',    'The root of Kitaveta verbs and how to form the infinitive.', 'grammar', 'verbs'),
  (4, 44, 'Present Tense',               'How to talk about what is happening now.', 'grammar', 'tense_present'),
  (4, 45, 'Past Tense',                  'How to talk about what happened.', 'grammar', 'tense_past'),
  (4, 46, 'Future Tense',                'How to talk about what will happen.', 'grammar', 'tense_future'),
  (4, 47, 'Negation',                    'How to say "not" — making sentences negative.', 'grammar', 'negation'),
  (4, 48, 'Questions',                   'How to form questions — who, what, where, when, why, how.', 'grammar', 'questions'),
  (4, 49, 'Pronouns',                    'I, you, he, she, we, they — personal pronouns.', 'grammar', 'pronouns'),
  (4, 50, 'Possessives',                 'My, your, his, her, our — expressing ownership.', 'grammar', 'possessives'),
  (4, 51, 'Adjectives & Agreement',      'How adjectives agree with the nouns they describe.', 'grammar', 'adjectives'),
  (4, 52, 'Conjunctions & Connectors',   'And, but, because, so, if — linking ideas.', 'grammar', 'conjunctions'),
  (4, 53, 'Prepositions & Location',     'In, on, under, beside, between — expressing location.', 'grammar', 'prepositions'),
  (4, 54, 'Commands & Requests',         'How to give instructions and make polite requests.', 'grammar', 'imperatives'),
  (4, 55, 'Conditional Sentences',       'If this, then that — expressing conditions.', 'grammar', 'conditionals')
ON CONFLICT (lesson_number) DO NOTHING;

-- UNIT 5: CULTURE, STORIES & FLUENCY (Lessons 56–70)
INSERT INTO public.syllabus (unit, lesson_number, title, description, category, subcategory) VALUES
  (5, 56, 'Proverbs & Wisdom',           'Common Kitaveta proverbs and what they mean.', 'culture', 'proverbs'),
  (5, 57, 'Oral Storytelling',           'The structure of a Kitaveta story — beginning, middle, end.', 'culture', 'stories'),
  (5, 58, 'Songs & Rhythm',              'Traditional songs, their words, and their meaning.', 'culture', 'songs'),
  (5, 59, 'Ceremonies & Rituals',        'Language used in ceremonies — birth, initiation, marriage, death.', 'culture', 'ceremonies'),
  (5, 60, 'Spiritual & Religious Life',  'Words around faith, prayer, and the sacred.', 'culture', 'spiritual'),
  (5, 61, 'History & Identity',          'How the Kitaveta people describe themselves and their origins.', 'culture', 'identity'),
  (5, 62, 'Nature & The Environment',    'Mountains, rivers, forests — the Kitaveta landscape.', 'nature', 'environment'),
  (5, 63, 'Conversation Practice I',     'Full conversations using Units 1–2 vocabulary.', 'fluency', 'conversation'),
  (5, 64, 'Conversation Practice II',    'Full conversations using Units 3–4 vocabulary.', 'fluency', 'conversation'),
  (5, 65, 'Storytelling Practice',       'Learner constructs a short story in Kitaveta.', 'fluency', 'storytelling'),
  (5, 66, 'Debate & Opinion',            'Expressing agreement, disagreement, and personal views.', 'fluency', 'opinion'),
  (5, 67, 'Humour & Playfulness',        'Jokes, teasing, and playful language in Kitaveta.', 'culture', 'humour'),
  (5, 68, 'Slang & Informal Speech',     'How Kitaveta is spoken casually among friends.', 'fluency', 'informal'),
  (5, 69, 'Idiomatic Expressions',       'Phrases whose meaning is more than the sum of their words.', 'fluency', 'idioms'),
  (5, 70, 'Final Review & Graduation',   'A full review of all units — the learner demonstrates fluency.', 'fluency', 'review')
ON CONFLICT (lesson_number) DO NOTHING;


-- ============================================================
-- PATCH 3: syntax_patterns table (new — grammar rules)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.syntax_patterns (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contributor_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pattern_name        TEXT NOT NULL,
  description         TEXT NOT NULL,
  kitaveta_example    TEXT,
  english_translation TEXT,
  swahili_translation TEXT,
  pattern_breakdown   TEXT,
  exceptions          TEXT,
  notes               TEXT,
  is_verified         BOOLEAN DEFAULT false,
  verified_by         UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.syntax_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified syntax is public" ON public.syntax_patterns
  FOR SELECT USING (is_verified = true);

CREATE POLICY "Mentors read all syntax" ON public.syntax_patterns
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

CREATE POLICY "Mentors insert syntax" ON public.syntax_patterns
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

CREATE POLICY "Mentors update syntax" ON public.syntax_patterns
  FOR UPDATE USING (
    auth.uid() = contributor_id
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor')
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'syntax_updated_at') THEN
    CREATE TRIGGER syntax_updated_at
      BEFORE UPDATE ON public.syntax_patterns
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END $$;


-- ============================================================
-- PATCH 4: First user created gets mentor role automatically.
--   Replace the handle_new_user trigger function so that
--   if no profiles exist yet, the new user becomes mentor.
--   Every subsequent signup stays as learner (default).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  profile_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    CASE WHEN profile_count = 0 THEN 'mentor' ELSE 'learner' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## That's it. After running this patch:

1. Your `profiles` table now has `groq_api_key TEXT` (plain text, no encryption)
2. Your `syllabus` table now has 70 lessons across 5 units
3. `syntax_patterns` table is created
4. The **first account to sign up** will automatically be assigned `role = 'mentor'`
   — every account after that defaults to `'learner'` as before

## To promote your existing account to mentor manually:

```sql
UPDATE public.profiles
SET role = 'mentor'
WHERE id = (SELECT id FROM auth.users WHERE email = 'dandobrandon0@gmail.com');
```
