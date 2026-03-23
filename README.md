# Project Alexander - Kitaveta Language Learning Platform

A mobile-first Progressive Web App (PWA) built to preserve and teach the **Kitaveta language** — a language spoken by the Kitaveta people of Kenya. Named after the creator's grandfather, "The Great," Project Alexander bridges the generational gap between native Kitaveta speakers and those eager to learn.

## 🎯 Mission

To create a freely accessible, AI-powered platform where:
- **Learners** study Kitaveta through structured lessons with verified native knowledge
- **Mentors** (native speakers) contribute and verify language knowledge
- **The AI (Alexander)** teaches grounded in database truth, never hallucinating

## ✨ Key Features

### For Learners
- 📚 **70-Lesson Syllabus** organized into 5 units
- 💬 **WhatsApp-style Chat Interface** with Alexander AI tutor
- 🎙️ **Voice Pronunciation** with audio recordings
- 📊 **Progress Tracking** - Know exactly what you've learned
- 🔊 **Audio Playback** - Hear native pronunciation
- 📱 **PWA Ready** - Install on your phone like a native app

### For Mentors
- ✍️ **Structured Knowledge Entry** with AI assistance
- 🤝 **Peer Verification System** 
- 🧠 **Grammar Rules** - Teach syntax patterns, not just words
- 📊 **Knowledge Gaps** - See what learners are asking for

### AI Integration
- 🤖 **Groq LLaMA 3.3** - Fast, accurate language tutoring
- 🔐 **Grounded AI** - Uses only verified knowledge from database
- ⚠️ **Gap Detection** - Automatically logs unanswered questions
- 🎯 **Contextual Teaching**

## 🏗️ Tech Stack

- **React 18 + TypeScript** - Type-safe UI
- **Vite** - Lightning-fast build
- **Supabase** - Database & Auth
- **Groq AI** - Language model (user's API key)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📱 Project Structure

See `PROJECT_STRUCTURE.md` for detailed documentation.

Key directories:
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/services/` - Backend integration
- `src/styles/` - Stylesheets
- `src/utils/` & `src/hooks/` - Expandable utilities

## 🎨 Design System

**Dark Navy Theme:**
- Primary Blue: #2563eb
- Accent Gold: #f59e0b
- Dark Navy: #020617

**Responsive Design:**
- Mobile-first approach
- Responsive to 800px+ desktops
- PWA-optimized for phones

## 🔐 Security

- Row Level Security (RLS) with Supabase
- API keys stored in user profiles
- Grounded AI prevents hallucinations
- Peer-reviewed knowledge

---

**Project Alexander** - *Preserving language, Bridging generations* 🌍
