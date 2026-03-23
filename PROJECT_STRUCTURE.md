# Project Alexander - Project Structure Guide

## Directory Organization

### `/src/components/`
Reusable UI components:
- **ChatInterface.tsx** - WhatsApp-like chat component used by Mentor & Learner pages
- **Header.tsx** - Navigation header with mobile dropdown menu
- **Footer.tsx** - Footer navigation
- **SupportModal.tsx** - Support popup modal
- **VoiceRecorder.tsx** - Audio recording component

### `/src/pages/`
Page-level components:
- **Auth.tsx** - Login/Sign-up with mentor/learner role selection
- **Home.tsx** - Landing page
- **Learner.tsx** - Syllabus browser & lesson interface
- **Mentor.tsx** - Knowledge contribution panel
- **Settings.tsx** - User settings & API key management
- **LiveSession.tsx** - Voice-based learning sessions
- **Library.tsx** - Knowledge library explorer

### `/src/services/`
Backend integration:
- **supabase.ts** - Supabase client initialization
- **database.ts** - Database query functions (CRUD operations)

### `/src/styles/`
Global & component-specific stylesheets:
- **ChatInterface.css** - WhatsApp-like chat styling
- (Additional component-specific styles can be added as needed)

### `/src/hooks/`
Custom React hooks (for future expansion):
- Add reusable hook logic here (e.g., useChat, useLearnerProgress, etc.)

### `/src/utils/`
Utility functions (for future expansion):
- Add helper functions here (e.g., formatters, validators, API helpers)

### `/src/assets/`
Static assets:
- Images, icons, and other media files

### Root Files
- **App.tsx** - Main application component with routing
- **App.css** - Global styles
- **main.tsx** - React entry point
- **types.ts** - TypeScript type definitions
- **vite.config.ts** - Vite build configuration
- **tsconfig.json** - TypeScript configuration

## Key Design Patterns

### Chat Interface Pattern
Both Learner and Mentor pages use the unified `ChatInterface` component, which provides:
- WhatsApp-style message bubbles
- Real-time typing indicators
- Smooth message animations
- Mobile-responsive design
- Blue header with back button
- Auto-scrolling to latest messages

### Authentication Flow
1. User signs up/logs in with Auth.tsx
2. Selects role: Mentor or Learner
3. Profile created in Supabase with selected role
4. Role-based page access control

### Learning Flow (Learner)
1. Browse syllabus organized by 5 units
2. Click lesson to start chat
3. AI teaches with verified knowledge only
4. Unanswered questions logged as gaps for mentors

### Mentorship Flow (Mentor)
1. AI-assisted knowledge entry form
2. Structured data extraction (English, Swahili, Kitaveta)
3. Voice pronunciation recording
4. Save to database with constraints

## Styling System

### Color Scheme (Dark Navy Theme)
- **Primary Blue**: #2563eb (actions, headers, user messages)
- **Accent Gold**: #f59e0b (highlights, labels)
- **Dark Navy**: #020617 (background)
- **Card Dark**: #0f172a (card backgrounds)
- **Text**: #f8fafc (primary text)
- **Muted**: #64748b (secondary text)
- **Border**: rgba(255,255,255,0.06) (subtle borders)

### Responsive Breakpoints
- **Mobile**: < 600px (full-width, optimized for phones)
- **Tablet**: 600px - 800px
- **Desktop**: 800px+ (improved spacing, side panels)

## Mobile PWA Features
- Safe-area handling for notch devices
- Touch-optimized buttons and inputs
- Dark mode by default
- Responsive layouts optimized for small screens
- Installable as PWA on phones

## Future Improvements
- Move inline styles to dedicated component CSS files
- Separate hook logic for chat state management
- Add more utility functions for common operations
- Implement custom hooks (useChat, useAuth, etc.)
- Add error boundary components
- Implement service worker for offline support
