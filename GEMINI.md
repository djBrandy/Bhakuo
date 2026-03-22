# Project Alexander: Kitaveta Language Bridge

## Vision
Alexander (named after the creator's grandfather, "The Great") is a web application designed to bridge the generational and cultural gap between native Kitaveta speakers (Mentors) and those who wish to learn the language (Learners). The goal is to preserve the Kitaveta language by facilitating the translation of English/Swahili terms and teaching pronunciation.

## Core Mandates
- **Consensus-Driven Development:** No implementation or changes occur without explicit agreement between the user and the AI.
- **Deep Thinking:** Solutions must be scalable, futuristic, and robust, avoiding surface-level implementations.
- **Open Source:** The project is open source, with a mechanism for supporting the developer.

## Functional Requirements
- **Translation:** English/Swahili names to Kitaveta.
- **Pronunciation:** Support for learning how words are spoken.
- **AI Guidance (Groq AI):**
  - **For Mentors:** Suggesting words to teach or helping structure lessons.
  - **For Learners:** Guiding what to learn next.
  - **API Strategy:** Each user provides their own Groq API key (utilizing free trial tiers).
- **Support Mechanism:** A "Support Developer" button integrated with Mpesa STK Push.

## Technical Stack (Proposed)
- **Frontend:** React (deployed to Vercel/Netlify for a "one-click" experience).
- **Backend/Database:** Supabase (Backend-as-a-Service). No manual server deployment or Python/Flask code.
- **AI:** Groq AI (Client-side API calls using user-provided keys).
- **Deployment:** Single deployment for the frontend; the backend is a managed service.

## Data Architecture
- **Local-First Sync:** The app will fetch data from Supabase and can store it in the phone's local storage (IndexedDB/LocalStorage) for fast access.
- **Admin Control:** Alexander can run local scripts/commands from his PC to sync, update, or push curated data to the Supabase database.
- **Mentors/Learners:** Mentors contribute data via the app; the AI (Groq) guides them in structured teaching.

## Roadmap & Discussion Points
1. **Architecture:** Refine the "PC-to-Phone" update mechanism. Should this be a PWA with synchronization logic?
2. **Backend Selection:** Finalize the framework (Flask vs. FastAPI vs. Node.js).
3. **AI Prompt Engineering:** Define the "pre-understood assignment" for the Groq AI.
4. **Data Schema:** How to structure translations and pronunciation files for scalability.
