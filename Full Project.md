
# 🎯 SNAIL TYPE - COMPLETE PROJECT SPECIFICATION

## Executive Summary

Build an advanced typing practice website that beats Monkeytype, TypingClub, and others through smart AI coaching, gamification, and real-world content. Target users: competitive typists, developers, and motivated learners.

***

## Tech Stack (All Free Tier)

### Frontend

- **Next.js 14+** (App Router, JavaScript, React Server Components)
- **Tailwind CSS** (styling)
- **Zustand** (client state management for typing test state)


### Authentication \& Authorization

- **Firebase Authentication** (Google + GitHub OAuth)
- **Firebase Admin SDK** (server-side token verification)
- **Session cookies** (HTTP-only, managed via Next.js API routes)


### Databases (Hybrid Architecture)

**PostgreSQL (Supabase with Transaction Pooler)**

- User profiles and Firebase UID mapping
- Session summaries and aggregated statistics
- Leaderboards, achievements, quest definitions
- Weakness profiles (analytics data)
- User XP, levels, streaks
- Friend relationships

**MongoDB Atlas (M0 Free Tier)**

- Raw keystroke event logs (high-write volume)
- Real-time session data during active tests
- User preferences and UI settings
- Daily quest progress tracking


### Hosting \& Deployment

- **Vercel** (Next.js hosting, serverless functions, edge network)
- **Vercel Cron Jobs** (for nightly analytics aggregation)


### Additional Tools

- **Zod** (schema validation for API requests)
- Standard Node.js packages: `pg` for Postgres, `mongodb` driver

***

## Database Strategy Explained

**Why Two Databases?**

PostgreSQL handles structured, relational data that requires complex queries (joins, aggregations, analytics). Perfect for leaderboards, user stats, and relationships.

MongoDB handles high-volume event logging where schema flexibility and write speed matter. Keystroke events generate millions of records - MongoDB's document model is ideal here.[^1][^2]

**Data Flow:**

1. User types → keystrokes buffered in browser
2. Every 2 seconds or 50 keystrokes → batch POST to MongoDB
3. Test ends → session summary saved to PostgreSQL
4. Nightly cron job → aggregate MongoDB keystroke data into PostgreSQL weakness profiles

***

## Architecture Overview

### Authentication Flow

1. User clicks "Sign in with Google/GitHub" (Firebase client-side)
2. Firebase returns ID token
3. Browser sends token to `/api/auth/session`
4. Server verifies token with Firebase Admin SDK
5. Server creates HTTP-only session cookie (14 days expiry)
6. Server upserts user record in PostgreSQL (`users` table) with Firebase UID
7. All subsequent API requests verify session cookie, extract Firebase UID, query databases by UID

### Data Access Pattern

- Client components: access Firebase user state, make API calls
- Server components: read session cookie, query databases directly
- API routes: verify auth, bridge client ↔ databases

***

## Free Tier Limits \& Capacity

### Firebase (Spark Plan)[^3][^4][^5]

- 50,000 monthly active users
- Unlimited Google/GitHub sign-ins
- 2 million Cloud Function invocations/month (you won't use functions, just auth)
- **Enough for:** Launch + first 10,000+ active users


### Supabase PostgreSQL (Free Tier)[^6]

- 500MB database storage
- 50,000 monthly active users (API requests unlimited)
- 2GB bandwidth/month
- **Enough for:** 100,000+ user profiles, 5 million+ session records, all analytics


### MongoDB Atlas (M0 Free Cluster)[^7][^8]

- 512MB storage
- 100 concurrent connections
- 100 operations/second
- **Enough for:** 50-100 million keystroke events, millions of daily operations


### Vercel (Free Tier)

- 100GB bandwidth/month
- Unlimited deployments
- Serverless functions included
- **Enough for:** 10,000+ daily active users with good caching

**Bottom line:** This stack handles 10,000-50,000 active users before you need to pay anything.[^3][^6][^7]

***

## Project Phases

### PHASE 0: Foundation Setup (3 days)

**Objective:** Get project environment ready.

**Deliverables:**

1. Next.js project initialized with App Router + Tailwind
2. Firebase project created (web app + enable Google/GitHub auth providers)
3. Firebase Admin service account JSON downloaded
4. Supabase project created, Postgres connection string obtained (transaction pooler URL)
5. MongoDB Atlas cluster created (M0 free tier), connection string obtained
6. All environment variables configured in `.env.local`
7. Project folder structure created with placeholder files
8. Dependencies installed: `firebase`, `firebase-admin`, `@supabase/supabase-js`, `mongodb`, `pg`, `zustand`, `zod`
9. Git repository initialized, pushed to GitHub
10. Vercel project connected to GitHub repo for auto-deployment

**Success Criteria:** App deploys to Vercel with "Hello World" visible.

***

### PHASE 1: Authentication System (5 days)

**Objective:** Users can sign up/login with Google or GitHub and stay logged in across sessions.

**What to Build:**

#### 1.1 Firebase Client Setup

- Initialize Firebase app in `lib/firebase/client.js`
- Export `auth`, `googleProvider`, `githubProvider`


#### 1.2 Firebase Admin Setup

- Initialize Firebase Admin SDK in `lib/firebase/admin.js` using service account credentials
- Export `adminAuth` for server-side token verification


#### 1.3 Custom Auth Hook

- Create `lib/hooks/useAuth.js` React hook
- Listen to Firebase `onAuthStateChanged`
- When user signs in, get ID token and POST to `/api/auth/session`
- Expose: `user`, `loading`, `signInWithGoogle()`, `signInWithGithub()`, `signOut()`


#### 1.4 Session API Route

- Create `/app/api/auth/session/route.js`
- **POST endpoint:** Receive Firebase ID token, verify it with Admin SDK, create 14-day session cookie, return success
- **DELETE endpoint:** Delete session cookie (logout)
- Call `syncUserToPostgres()` helper function (upsert user record)


#### 1.5 Auth Verification Helper

- Create `lib/auth/verify.js` with `verifyAuth()` function
- Read session cookie, verify with Firebase Admin SDK
- Return decoded user claims (uid, email, name) or null if invalid
- Use this in all protected API routes and Server Components


#### 1.6 Auth UI Components

- Create `components/AuthButtons.js` component
- Show "Sign in with Google" and "Sign in with GitHub" buttons when logged out
- Show user avatar + name + "Sign Out" button when logged in
- Use the `useAuth()` hook


#### 1.7 PostgreSQL Users Table

- Create `users` table in Supabase Postgres:
    - `id` (UUID, primary key)
    - `firebase_uid` (text, unique, indexed)
    - `email` (text)
    - `display_name` (text)
    - `photo_url` (text)
    - `created_at` (timestamp)
    - `updated_at` (timestamp)
- Implement `syncUserToPostgres()` function to upsert user on login

**Success Criteria:**

- User can click "Sign in with Google", complete OAuth flow, see their name on screen
- Refresh page → still logged in (session cookie works)
- User can sign out
- User record appears in Supabase Postgres `users` table with correct Firebase UID

***

### PHASE 2: Core Typing Test (7 days)

**Objective:** Build the instant, zero-friction typing test experience.

**What to Build:**

#### 2.1 Typing State Management

- Create Zustand store in `lib/stores/typingStore.js`
- State: `currentWordIndex`, `inputValue`, `errors`, `startTime`, `endTime`, `isTestActive`, `wpm`, `rawWpm`, `accuracy`
- Actions: `startTest()`, `endTest()`, `updateInput()`, `calculateStats()`


#### 2.2 Word Generation Service

- Create `lib/services/wordGenerator.js`
- Function: `generateWords(count, difficulty)` returns array of random English words
- Start with simple 1000-word dictionary hardcoded in JSON file
- Later expand to different languages and categories


#### 2.3 Main Typing Component

- Create `components/TypingTest.js` (client component)
- **Features:**
    - Display 50 words in a scrolling text area
    - Highlight current word
    - Input field that captures keystrokes
    - Real-time WPM counter (updates every second)
    - Real-time accuracy percentage
    - Color-code: correct chars = green, incorrect = red, current = gray
    - Timer display (shows elapsed time or countdown depending on mode)
    - Restart button (keyboard shortcut: Tab + Enter)


#### 2.4 Test Modes

- **Time modes:** 15s, 30s, 60s, 120s
- **Word modes:** 10, 25, 50, 100 words
- Mode selector UI above typing area
- When time/word limit reached → auto-end test


#### 2.5 Results Screen Component

- Create `components/ResultsScreen.js`
- Show after test completes:
    - Final WPM (large, prominent)
    - Raw WPM
    - Accuracy percentage
    - Character stats (correct / incorrect / extra / missed)
    - Graph: WPM over time during the test (simple line chart)
    - "Try Again" button
    - "Save Result" button (if logged in)


#### 2.6 Sessions API - MongoDB

- Create MongoDB collection: `sessions`
- Schema: `{ userId, firebaseUid, mode, duration, wordCount, startedAt, endedAt, wpm, rawWpm, accuracy, errors, isAnonymous }`
- Create `/app/api/sessions/create/route.js`:
    - POST: Start session, return session ID
- Create `/app/api/sessions/end/route.js`:
    - POST: Receive session ID + final stats, save to MongoDB


#### 2.7 Anonymous User Support

- Generate unique device ID (store in localStorage)
- Allow anonymous users to take tests and see results locally
- Show prompt: "Sign in to save your progress forever"
- When anonymous user signs in → migrate local sessions to their account


#### 2.8 Landing Page Design

- Homepage (`app/page.js`) = instant typing test
- No "Start Test" button - just text and input field visible immediately
- Minimal header: logo, auth buttons, settings icon
- Footer: links (About, Privacy, Contact)

**Success Criteria:**

- User lands on homepage → can immediately start typing (no clicks needed)
- Test runs smoothly, WPM updates every second
- Test ends automatically at time/word limit
- Results screen shows accurate stats
- Logged-in users can save sessions to MongoDB
- Anonymous users can practice and see local history

***

### PHASE 3: User Dashboard (7 days)

**Objective:** Give logged-in users a stats dashboard that shows their improvement.

**What to Build:**

#### 3.1 PostgreSQL Analytics Tables

- Create `session_summaries` table in Supabase:
    - `id`, `user_id` (FK to users), `session_date` (date), `tests_completed`, `avg_wpm`, `best_wpm`, `avg_accuracy`, `total_keystrokes`
- Create `user_stats` table:
    - `user_id` (FK, unique), `total_tests`, `total_time_seconds`, `current_streak_days`, `longest_streak_days`, `xp`, `level`, `created_at`, `updated_at`


#### 3.2 Session Aggregation Logic

- When user completes a test:
    - Save raw session to MongoDB
    - Also create/update summary in Postgres `session_summaries` for that day
    - Update `user_stats` totals


#### 3.3 Dashboard Page

- Create `/app/dashboard/page.js` (Server Component - fetch data server-side)
- **Layout sections:**

1. **Hero stats:** Total tests, Current streak, Average WPM, Total time practiced
2. **Progress graph:** Line chart showing daily average WPM over last 30 days
3. **Recent tests table:** Last 20 tests with date, WPM, accuracy, mode
4. **Personal bests card:** Best WPM ever, best accuracy, longest test


#### 3.4 Stats Calculation Service

- Create `lib/services/statsService.js`
- Functions:
    - `getUserStats(userId)` → fetch from Postgres
    - `getRecentSessions(userId, limit)` → fetch from MongoDB
    - `getDailyAverages(userId, days)` → aggregate data for graph
    - `calculateStreak(userId)` → check consecutive days with at least 1 test


#### 3.5 Dashboard Components

- Create reusable components:
    - `components/Dashboard/StatsCard.js` (displays single metric)
    - `components/Dashboard/ProgressGraph.js` (line chart using recharts or chart.js)
    - `components/Dashboard/RecentTests.js` (table of sessions)


#### 3.6 Protected Route Logic

- Dashboard requires authentication
- If not logged in → redirect to homepage with message "Sign in to view dashboard"
- Use `verifyAuth()` in Server Component to check session

**Success Criteria:**

- User completes 5 tests → dashboard shows accurate count, average WPM, graph with 5 data points
- Streak counter works: test today and yesterday = 2-day streak
- Recent tests table shows all sessions with correct details
- Page loads fast (< 1 second) using Server Components

***

### PHASE 4: Keystroke Logging \& Weakness Detection (10 days)

**Objective:** Capture detailed typing data and analyze weaknesses. This is the differentiator that beats competitors.

**What to Build:**

#### 4.1 Client-Side Keystroke Logger

- Modify `components/TypingTest.js` to log every keypress:
    - Capture: `key` pressed, `timestamp`, `expected character`, `is_correct`, `position_in_word`, `latency_from_previous_key`
    - Store in memory array during test
    - Every 50 keystrokes OR every 2 seconds → batch send to API
    - On test end → send final batch


#### 4.2 MongoDB Keystrokes Collection

- Create `keystrokes` collection in MongoDB
- Schema: `{ sessionId, userId, events: [ { key, timestamp, expected, correct, position, latency }, ... ] }`
- Store batched keystroke events as subdocuments for efficiency


#### 4.3 Keystroke Ingestion API

- Create `/app/api/keystrokes/batch/route.js`
- POST endpoint: Receive array of keystroke events + session ID
- Verify auth
- Insert into MongoDB `keystrokes` collection
- Return success


#### 4.4 PostgreSQL Weakness Profiles Table

- Create `weakness_profiles` table:
    - `user_id` (FK, unique)
    - `weak_keys` (JSONB: array of `{ key, error_rate, total_attempts }`)
    - `weak_bigrams` (JSONB: array of `{ bigram, error_rate }`)
    - `avg_accuracy_by_duration` (JSONB: `{ "0-15s": 98, "15-30s": 95, "30-60s": 92 }`)
    - `avg_key_latency` (JSONB: per-finger avg latency)
    - `last_calculated_at` (timestamp)


#### 4.5 Analytics Aggregation Job

- Create serverless function or Vercel cron job: `/app/api/cron/calculate-weaknesses/route.js`
- **Runs:** Daily at 3 AM (Vercel cron: `0 3 * * *`)
- **Logic:**

1. Fetch all users who tested in last 30 days
2. For each user:
        - Query MongoDB `keystrokes` for their recent sessions (last 100 tests or 30 days)
        - Aggregate error rates per key (e.g., key 'q' missed 12 times out of 80 attempts = 15% error rate)
        - Identify top 5 weak keys
        - Calculate bigram error rates (e.g., "th" typed wrong 8 times out of 60 = 13%)
        - Analyze accuracy drop over time in session (fatigue detection)
        - Calculate per-finger latency (map keys to fingers)
3. Upsert results into Postgres `weakness_profiles` table


#### 4.6 Weakness Insights Component

- Create `components/WeaknessReport.js`
- **Show after each test:**
    - "Your weak spots in this test:"
    - List top 3 problem keys with error count
    - "Your accuracy dropped after 40 seconds - consider shorter practice sessions"
    - "Your right pinky is 35% slower than average"
- **Fetch data:** Mix of instant analysis (from current session keystrokes) + historical profile from Postgres


#### 4.7 Custom Drill Generator

- Create `lib/services/drillGenerator.js`
- Function: `generateWeaknessDrill(userId)`:
    - Query user's `weakness_profiles` from Postgres
    - Generate text that heavily features their weak keys and bigrams
    - Example: If user struggles with 'q', 'p', and "th" → generate sentences with those
    - Return custom word list
- Add "Practice Weak Spots" button on dashboard that launches drill

**Success Criteria:**

- During typing test, keystroke events are captured and batched to API without lag
- MongoDB stores all keystroke data
- After 24 hours, cron job runs and populates `weakness_profiles` for all active users
- Dashboard shows "Weakness Analysis" section with top 3 weak keys
- "Practice Weak Spots" drill contains relevant words for user's issues
- Performance: keystroke logging doesn't slow down typing experience

***

### PHASE 5: Gamification System (10 days)

**Objective:** Add XP, levels, achievements, streaks, and daily quests to drive habit formation.[^9][^10][^11][^12]

**What to Build:**

#### 5.1 XP and Level System

**PostgreSQL Tables:**

- `user_stats` table (extend existing):
    - Add columns: `xp` (integer, default 0), `level` (integer, default 1)

**XP Awards:**

- Base: 10 XP per completed test
- Bonuses:
    - +5 XP if accuracy > 95%
    - +10 XP if beat personal best WPM
    - +15 XP if complete daily quest
    - +20 XP if complete full daily training plan

**Level Formula:**

- XP needed for level N = 100 * N
- Example: Level 1→2 = 100 XP, Level 2→3 = 200 XP, Level 10→11 = 1000 XP

**Implementation:**

- After each test, calculate XP earned
- Update `user_stats.xp`
- Check if XP crosses next level threshold → increment level
- Return level-up boolean to frontend
- Show "LEVEL UP!" animation if true


#### 5.2 Achievements System

**PostgreSQL Tables:**

- `achievements` table:
    - `id`, `key` (unique string like "first_test"), `name`, `description`, `icon_url`, `xp_reward`
- `user_achievements` table:
    - `user_id`, `achievement_id`, `unlocked_at`, `progress` (for multi-step achievements)

**Achievement Definitions:**
Seed database with achievements:

- "First Steps" - Complete your first test (instant unlock)
- "Getting Started" - Complete 5 tests
- "Dedicated" - Complete 25 tests
- "Century Club" - Complete 100 tests
- "Speed Demon" - Reach 100 WPM
- "Perfectionist" - 100% accuracy on any test
- "Week Warrior" - 7-day streak
- "Month Master" - 30-day streak
- "Early Bird" - Complete test before 8 AM
- "Night Owl" - Complete test after 10 PM
- "Code Ninja" - Complete 20 code-mode tests

**Achievement Check Logic:**

- After each test, check all achievement conditions for that user
- If condition met and not already unlocked → insert into `user_achievements`, award XP bonus
- Return newly unlocked achievements to frontend
- Show popup/toast with achievement badge


#### 5.3 Streak System

**Logic:**

- Track last test date in `user_stats` table: `last_test_date` (date)
- **Current streak calculation:**
    - If user tests today and yesterday → streak continues
    - If user tests today but not yesterday → streak resets to 1
    - If user hasn't tested today yet → show "current streak at risk"

**Streak Freeze Feature:**

- Add column: `streak_freezes_available` (integer, default 1)
- User earns 1 freeze every 7-day streak milestone
- User can "use freeze" from dashboard if they're about to miss a day
- Freeze protects streak for 1 day

**Implementation:**

- After each test, check date:
    - If first test today → check if yesterday had test
    - Update streak accordingly
    - Check for streak milestones (7, 30, 100 days) → award achievements


#### 5.4 Daily Quests

**MongoDB Collection:**

- `daily_quests` collection:
    - `{ userId, date, quests: [ { questId, name, target, progress, completed, xpReward } ], generatedAt }`

**Quest Types:**

- "Complete 3 tests" (target: 3, progress: current count)
- "Achieve 95%+ accuracy twice" (target: 2)
- "Beat your average WPM" (target: 1)
- "Complete a 60-second test" (target: 1)
- "Practice code mode" (target: 1)
- "Use weakness drill" (target: 1)

**Quest Generation:**

- Every day at midnight (Vercel cron job), generate 3 random quests for each active user
- Store in MongoDB `daily_quests` collection
- When user completes test, check quest progress for today's date
- Update progress
- If quest completed → mark complete, award XP

**Dashboard Display:**

- Show "Daily Quests" card on dashboard
- List 3 quests with progress bars
- Show total XP available today
- "Resets in X hours" countdown timer


#### 5.5 Rank/Tier System

**Tiers:**

- Bronze: 0-40 WPM
- Silver: 40-60 WPM
- Gold: 60-80 WPM
- Platinum: 80-100 WPM
- Diamond: 100+ WPM

**Calculation:**

- Based on rolling 30-day average WPM
- Recalculate after each test
- Store in `user_stats`: `current_tier` (string)

**UI:**

- Show tier badge on dashboard and profile
- Progress bar: "You're 73% to Gold tier!" (based on WPM)


#### 5.6 Variable Rewards (Psychological Hook)[^10][^9]

**Random Bonus System:**

- After random 20% of tests, award surprise bonus:
    - "Lucky Test! Double XP this round!"
    - "Mystery Box: +1 Streak Freeze!"
    - "Secret Achievement Unlocked!" (random achievement from pool)
- Implement using random number generator on test completion

**Near-Miss Notifications:**

- "You were 0.3 WPM away from beating your record!"
- "Just 47 XP to level up!"
- Show these prominently to encourage immediate retry[^12][^9]

**Success Criteria:**

- User completes test → earns XP, sees "+10 XP" animation
- User levels up → sees "LEVEL UP! Now Level 5" celebration screen
- Achievements unlock automatically when conditions met
- Streak counter shows correct count, updates daily
- Daily quests appear each morning, track progress, award XP on completion
- Variable rewards trigger occasionally, creating excitement
- Dashboard shows tier badge and progress to next tier

***

### PHASE 6: Advanced Content \& Modes (7 days)

**Objective:** Add real-world typing practice modes that competitors lack.

**What to Build:**

#### 6.1 Text Categories System

**MongoDB Collection:**

- `text_pools` collection:
    - `{ category, difficulty, language, content (array of texts), tags }`

**Categories to Seed:**

1. **Random Words** (classic mode)
    - Easy: Top 200 common words
    - Medium: Top 1000 words
    - Hard: Top 5000 words + punctuation
2. **Code Mode**
    - JavaScript snippets (functions, imports, JSX)
    - React component examples
    - Common programming patterns
3. **Quotes Mode**
    - Famous quotes from books, movies, speeches
    - Literary passages
4. **Email/Professional Mode**
    - Business email templates
    - Professional writing samples
5. **Custom Text Mode**
    - User can paste their own text
    - Store in MongoDB `user_custom_texts` collection

#### 6.2 Mode Selector UI

**Update Typing Test Page:**

- Add dropdown/tabs above test:
    - Mode: Time (15s, 30s, 60s, 120s) / Words (10, 25, 50, 100)
    - Category: Random Words / Code / Quotes / Email / Custom
    - Difficulty: Easy / Medium / Hard
    - Language: English (expand later to more)
- Save user's last selected preferences in localStorage
- Auto-load their preference next visit


#### 6.3 Adaptive Weakness Mode

**Special Mode:**

- "Practice Weak Spots" mode
- Fetches user's `weakness_profiles` from Postgres
- Generates text heavy in their weak keys/bigrams
- Uses `lib/services/drillGenerator.js` logic
- Shows message: "This drill targets your weak keys: q, p, x"


#### 6.4 Difficulty Variations

**Easy Mode:**

- Common words only
- No punctuation
- No capitals

**Medium Mode:**

- Mixed word difficulty
- Punctuation included
- Capitals on sentence starts

**Hard Mode:**

- Rare/long words
- Numbers included
- Mixed case
- Special characters (!@\#\$%^\&*)

**Nightmare Mode (Code):**

- Full code snippets
- Brackets, semicolons, indentation
- Camel case, snake_case mixing


#### 6.5 Custom Text Input

**Feature:**

- "Paste Your Text" button opens modal
- User pastes any text (email, essay, code)
- Text is cleaned and formatted
- Generates typing test from that text
- Optionally save to their account for later reuse

**Success Criteria:**

- User can switch between modes seamlessly
- Code mode displays actual JavaScript/React snippets that look realistic
- Difficulty selector changes word complexity appropriately
- Weakness mode shows personalized content
- Custom text mode works for any pasted content
- Mode preferences persist across sessions

***

### PHASE 7: Leaderboards \& Social (7 days)

**Objective:** Add competition and community features to increase engagement.[^9][^10]

**What to Build:**

#### 7.1 Leaderboards System

**PostgreSQL Tables:**

- `leaderboard_entries` table:
    - `user_id`, `period` (enum: daily/weekly/all_time), `mode`, `category`, `best_wpm`, `best_accuracy`, `rank`, `updated_at`

**Leaderboard Types:**

1. Global - Top 100 users
2. By Country (use user's country from profile or IP)
3. By Mode (time-based, word-based)
4. By Category (words, code, quotes)
5. By Time Period (today, this week, all-time)

**Update Logic:**

- After each test, check if user's WPM is personal best for that mode/category
- If yes, update `leaderboard_entries`
- Recalculate ranks (can be done in nightly job for performance)

**Leaderboard Page:**

- Create `/app/leaderboard/page.js`
- Filters: Period, Mode, Category, Country
- Table: Rank, User (avatar + name), WPM, Accuracy, Tests Count
- Highlight current user's row if they're on the board
- "You're ranked \#342 globally" message if not in top 100


#### 7.2 Friends System

**PostgreSQL Tables:**

- `friendships` table:
    - `user_id`, `friend_id`, `status` (enum: pending/accepted), `created_at`

**Features:**

- Add friend by username or email
- Friend requests (pending until accepted)
- Dashboard shows "Friends Activity" widget:
    - "Rafiq just reached 85 WPM!"
    - "Samir completed 50 tests!"
    - Updates in real-time or refreshes every 30 seconds

**Friends Comparison:**

- "You vs. Your Friends This Week" table
- Shows comparative stats: your WPM vs each friend's WPM


#### 7.3 Session Sharing

**Feature:**

- After completing test, show "Share Result" button
- Generate image card (like Spotify Wrapped style):
    - User's WPM (large)
    - Accuracy %
    - Mini graph of WPM over time
    - "I just typed at X WPM on Typing Master!"
    - Website URL + logo
- Use library like `html-to-image` or Canvas API to generate PNG
- One-click share to:
    - Twitter (pre-filled tweet)
    - Facebook
    - Copy link to clipboard

**Implementation:**

- Create `/app/api/share/generate/route.js`
- Takes session ID, generates image, returns URL
- Store generated images temporarily in Vercel Blob or public folder


#### 7.4 Weekly Race Events

**MongoDB Collection:**

- `events` collection:
    - `{ eventId, name, description, startDate, endDate, category, leaderboard: [ { userId, score } ] }`

**Event Types:**

- "Code Week" - Best average WPM on code mode
- "Accuracy Challenge" - Highest accuracy across 10 tests
- "Endurance Race" - Longest single test completed

**Event Flow:**

- Admin creates event (initially manual, later can automate)
- Event appears on homepage and dashboard: "This Week: Code Speed Challenge!"
- Users participate by taking tests in that category
- Scores update in real-time leaderboard
- Top 10 winners get special "Event Champion" badge + bonus XP


#### 7.5 Public Profiles

**Feature:**

- Each user gets public profile page: `/profile/[username]`
- Shows (if user opts in):
    - Avatar, name, joined date
    - Total tests, average WPM, best WPM
    - Tier badge
    - Achievement badges earned
    - Recent activity graph
    - "Challenge this user" button (opens race mode - future feature)

**Privacy Settings:**

- User can toggle profile visibility (public/private) in settings

**Success Criteria:**

- Leaderboard page loads fast (< 2 seconds) showing top 100
- User can filter leaderboard by multiple criteria
- Friends system allows adding friends, sending requests, seeing their activity
- Share button generates beautiful result card image
- Twitter/Facebook share works with one click
- Weekly event appears prominently and tracks scores correctly
- Public profiles show accurate stats and respect privacy settings

***

### PHASE 8: Daily Training Plans (7 days)

**Objective:** Automate personalized daily practice plans based on weakness analysis.[^13]

**What to Build:**

#### 8.1 Training Plan Generator Service

**Logic:**

- Create `lib/services/trainingPlanGenerator.js`
- Function: `generateDailyPlan(userId)`:

1. Fetch user's `weakness_profiles` from Postgres
2. Fetch user's recent performance (last 7 days avg WPM, accuracy trend)
3. Generate 4-5 task plan:
        - **Warmup:** 1-minute easy test (common words)
        - **Weakness Drill:** Custom text targeting weak keys (use drillGenerator)
        - **Speed Challenge:** Try to beat personal best (medium difficulty)
        - **Accuracy Focus:** High-accuracy mode (penalty for errors)
        - **Cool-down:** 30-second relaxed test
4. Return plan object with test configs

**Variation:**

- Plans vary by day of week:
    - Monday: Heavier on drills
    - Friday: Fun challenges
    - Weekend: Shorter, optional plans
- Random "Mystery Challenge" appears occasionally (variable reward)[^10][^9]


#### 8.2 PostgreSQL Table

- `daily_plans` table:
    - `user_id`, `plan_date`, `plan_data` (JSONB: array of tasks), `completed_tasks` (integer), `total_tasks` (integer), `completed_at`


#### 8.3 Plan Generation Job

- Vercel cron job: `/app/api/cron/generate-daily-plans/route.js`
- Runs every day at midnight
- For all active users (tested in last 7 days):
    - Generate personalized plan using `generateDailyPlan()`
    - Insert into `daily_plans` table


#### 8.4 Dashboard Display

**"Today's Training Plan" Card:**

- Shows on dashboard prominently
- Lists tasks with checkboxes:
    - ☐ Warmup (1 min)
    - ☐ Weakness Drill (q, p focus)
    - ☐ Speed Challenge (beat 75 WPM)
    - ☐ Accuracy Focus (95%+ required)
- Click task → launches that specific test configuration
- After completing task → mark checked
- When all tasks done → award "Daily Plan Complete!" achievement + 50 bonus XP


#### 8.5 Task Completion Tracking

- When user completes a test, check if it matches an open training plan task
- Auto-mark task complete if conditions met (duration, category, difficulty)
- Update `daily_plans.completed_tasks`
- If `completed_tasks == total_tasks` → mark plan complete


#### 8.6 Coaching Messages

**Post-Task Feedback:**

- After each training plan task, show contextual message:
    - After warmup: "Great start! Your fingers are ready."
    - After weakness drill: "You improved 'q' accuracy by 8% today!"
    - After speed challenge: "New personal best! You're on fire 🔥"
    - After cool-down: "Perfect! Tomorrow's plan will adjust based on today's performance."

**Motivational Triggers:**

- "You've completed 5 daily plans this month - you're building a strong habit!"
- "Users who complete daily plans improve 40% faster"[^13][^10]

**Success Criteria:**

- Every morning, user sees fresh training plan on dashboard
- Plans are personalized based on their actual weaknesses
- Tasks launch correct test configurations when clicked
- Completion tracking works automatically
- Bonus XP awarded when full plan completed
- Coaching messages appear and feel encouraging, not robotic

***

### PHASE 9: Polish \& Performance (5 days)

**Objective:** Fine-tune UX, performance, accessibility, and mobile experience.

**What to Build:**

#### 9.1 Keyboard Shortcuts

**Global Shortcuts:**

- `Tab + Enter` - Restart current test
- `Esc` - Abandon current test (confirmation modal)
- `Ctrl/Cmd + K` - Open command palette (quick access to settings, modes)
- `Ctrl/Cmd + D` - Toggle dark mode
- `Ctrl/Cmd + ,` - Open settings

**Command Palette:**

- Searchable menu (like VS Code or Raycast)
- Type to filter: modes, settings, pages
- Arrow keys + Enter to select


#### 9.2 Customization Settings

**Settings Page** (`/app/settings/page.js`):

**Appearance:**

- Theme selector: 10+ color themes (dark/light variants)
- Caret style: smooth/block/underline/off
- Font: monospace, sans-serif, system, custom (Google Fonts)
- Font size: small/medium/large
- Live preview of typing area with selected settings

**Sound:**

- Typewriter click sounds (toggle on/off)
- Error sound (toggle)
- Completion sound (toggle)
- Volume slider

**Behavior:**

- Strict mode: can't backspace to fix errors (hardcore)
- Quick restart: auto-restart on completion
- Confidence mode: hide text, type blind
- Freedom mode: can't pause/undo

**Store preferences:**

- Save to `user_preferences` in MongoDB (JSON document)
- Load on every page visit
- Sync across devices if logged in


#### 9.3 Performance Optimization

**Strategies:**

1. **Database Query Optimization:**
    - Add indexes on frequently queried columns:
        - `users.firebase_uid`
        - `session_summaries.user_id`, `session_summaries.session_date`
        - `leaderboard_entries.period`, `leaderboard_entries.rank`
    - Use Postgres connection pooling (Supabase transaction pooler already configured)
2. **Caching:**
    - Cache leaderboard queries (5-minute expiry)
    - Cache user stats on dashboard (30-second expiry)
    - Use Next.js `revalidate` or `cache()` API
3. **Lazy Loading:**
    - Dashboard graphs load after main stats visible
    - Leaderboard loads top 100 initially, infinite scroll for more
    - Recent tests table paginated (20 per page)
4. **Image Optimization:**
    - User avatars: use Next.js `<Image>` component with proper sizing
    - Achievement badge icons: serve from CDN, lazy load
5. **Bundle Size:**
    - Code-split heavy libraries (charting)
    - Tree-shake unused Tailwind classes

#### 9.4 Mobile Responsive Design

**Typing Test on Mobile:**

- Typing on mobile is niche but support it:
    - Hide physical keyboard, show mobile soft keyboard
    - Simplified UI (fewer stats visible during test)
    - Touch-friendly buttons (larger hit areas)

**Dashboard on Mobile:**

- Stack cards vertically
- Collapsible sections for graphs
- Thumb-friendly navigation

**Test All Breakpoints:**

- Mobile (< 640px)
- Tablet (640-1024px)
- Desktop (> 1024px)


#### 9.5 Accessibility (A11y)

**Keyboard Navigation:**

- All interactive elements keyboard-accessible
- Focus indicators visible (blue ring)
- Skip to content link for screen readers

**Screen Reader Support:**

- ARIA labels on buttons, form inputs
- Live regions for WPM updates during test (announce every 5 WPM change)
- Alt text on all images

**Color Contrast:**

- Ensure 4.5:1 contrast ratio on all text (WCAG AA compliance)
- High-contrast theme option for visually impaired users


#### 9.6 Loading States \& Error Handling

**Loading States:**

- Skeleton screens for dashboard while data loads
- Spinner on auth buttons during sign-in
- "Syncing..." indicator when saving sessions

**Error Handling:**

- Network errors: "Connection lost. Your test is saved locally and will sync when back online."
- API errors: Friendly messages, not raw error codes
- Failed auth: "Sign-in failed. Please try again."
- Retry buttons on errors


#### 9.7 Onboarding Flow (New Users)

**First Visit Experience:**

1. User lands on homepage → immediately see typing test ready to use
2. After first test completion → modal: "Great job! Want to save your progress forever? Sign up free."
3. After sign-up → mini tutorial tooltip tour:
    - "This is your dashboard"
    - "Check your weaknesses here"
    - "Complete daily plans to improve faster"
4. Onboarding state tracked in `user_stats.onboarding_completed` (boolean)

**Success Criteria:**

- All keyboard shortcuts work globally
- Settings save and persist across devices
- Dashboard loads in < 1 second on good connection
- Leaderboard handles 1000+ users without slowdown
- Mobile experience feels smooth and usable
- All WCAG AA accessibility checks pass
- Error messages are clear and actionable
- New users complete onboarding and understand core features

***

### PHASE 10: Retention \& Notifications (5 days)

**Objective:** Bring users back daily through smart notifications and retention mechanics.[^9][^10]

**What to Build:**

#### 10.1 Email Notifications

**Use:** Free email service like **Resend** (free tier: 3,000 emails/month) or **SendGrid** (free: 100 emails/day)

**Email Types:**

1. **Streak About to Break:**
    - Trigger: User tested yesterday but not today, send at 6 PM their local time
    - Subject: "🔥 Your 12-day streak is about to break!"
    - Body: "You're so close! Just one quick test to keep your streak alive."
    - CTA button: "Practice Now"
2. **Daily Plan Ready:**
    - Trigger: Send every morning at 8 AM if user hasn't completed today's plan
    - Subject: "Your personalized training plan is ready ☀️"
    - Body: "Today's focus: improving accuracy. 5 minutes to complete."
    - CTA: "Start Training"
3. **Weekly Progress Report:**
    - Trigger: Every Monday morning
    - Subject: "Your typing stats this week 📊"
    - Body: Nice HTML email with:
        - WPM improvement
        - Tests completed
        - Streak status
        - Next milestone
    - CTA: "View Full Dashboard"
4. **Achievement Unlocked:**
    - Trigger: When user unlocks major achievement while offline
    - Subject: "🏆 You just unlocked: Speed Demon!"
    - Body: Celebrates the achievement with badge image
    - CTA: "See All Achievements"
5. **Friend Activity:**
    - Trigger: When friend beats your score or reaches milestone
    - Subject: "Rafiq just beat your record!"
    - Body: "Rafiq typed 88 WPM. Time to reclaim your throne?"
    - CTA: "Challenge Accepted"

**Implementation:**

- Store email preferences in `user_preferences`: can opt out of each type
- Create Vercel cron jobs for scheduled emails
- Create `/app/api/notifications/send/route.js` helper function
- Track email opens/clicks (optional, using UTM parameters)


#### 10.2 Push Notifications (Optional, Progressive Web App)

**Setup:**

- Convert to PWA (add manifest.json, service worker)
- Use Firebase Cloud Messaging (FCM) for push (free tier: unlimited)
- Request permission after user completes 3 tests (not immediately - reduces friction)

**Notification Types:**

- Daily plan reminder (once per day)
- Streak reminder (if at risk)
- Friend challenge (real-time)

**Implementation:**

- Store FCM tokens in `user_preferences`
- Send via Firebase Admin SDK from API routes
- User can disable in settings


#### 10.3 In-App Notifications Center

**Feature:**

- Bell icon in header showing notification count
- Dropdown shows recent notifications:
    - "You leveled up!"
    - "New achievement unlocked"
    - "Friend Rafiq challenged you"
    - "Daily plan ready"
- Mark as read functionality
- Link notifications to relevant pages

**PostgreSQL Table:**

- `notifications` table:
    - `user_id`, `type`, `message`, `link`, `read` (boolean), `created_at`


#### 10.4 Comeback Flow (Lapsed Users)

**Detect Lapsed User:**

- User who hasn't tested in 7+ days

**Email Sequence:**

1. **Day 7:** "We miss you! Here's what's new..."
2. **Day 14:** "Your account is still here. Come back with this special challenge!" (offer bonus XP)
3. **Day 30:** "One last thing before you go..." (ask for feedback, offer incentive)

**Incentive:**

- "Complete one test today and get 100 bonus XP + 2 streak freezes"


#### 10.5 Social Proof \& FOMO

**Homepage Stats (Public):**

- "Join 47,329 users improving their typing"
- "2.3 million tests completed this month"
- "Average improvement: +18 WPM in 30 days"
- Update these numbers weekly (query aggregates from database)

**Dashboard FOMO:**

- "Top 5% of users this week completed daily plans"
- "Rafiq is only 3 WPM ahead of you on the leaderboard"
- "New weekly challenge starting in 2 hours!"

**Success Criteria:**

- Email notifications send reliably at scheduled times
- Users can opt out of any email type easily
- Open rates on emails > 20% (track in email service)
- Push notifications work on supported browsers
- In-app notification center shows unread count accurately
- Lapsed user comeback sequence triggers correctly
- Social proof numbers update automatically and are accurate

***

### PHASE 11: Launch Preparation (3 days)

**Objective:** Final QA, SEO, analytics, and go-live checklist.

**What to Build:**

#### 11.1 SEO Optimization

**Homepage Metadata:**

- Title: "Typing Master - Smart Typing Practice with AI Coaching"
- Description: "Improve your typing speed with personalized training plans, weakness detection, and gamification. Better than Monkeytype for serious typists."
- OG image: Create social share image
- Structured data (Schema.org) for WebApplication

**Dynamic Metadata:**

- Dashboard, profile pages: dynamic titles with user stats
- Leaderboard: "Top Typists - Typing Master Leaderboard"

**Sitemap:**

- Generate `/sitemap.xml` with all public pages
- Submit to Google Search Console

**Robots.txt:**

- Allow all, exclude `/api/*`, `/dashboard/*`


#### 11.2 Analytics Setup

**Vercel Analytics:**

- Enable Vercel Web Analytics (free, privacy-friendly)
- Tracks page views, performance

**Custom Event Tracking:**

- Track key events in database:
    - User signups (count per day)
    - Tests completed (count per day, avg per user)
    - Daily plan completions
    - Achievement unlocks
    - Leaderboard views
- Build simple admin dashboard at `/admin/stats` to view these (protected route)

**Funnels to Monitor:**

1. Homepage visit → Test taken → Signup → Second test
2. Signup → Dashboard view → Daily plan started → Plan completed
3. Test completed → Share clicked → Social share confirmed

#### 11.3 Error Monitoring

**Sentry (Free Tier: 5,000 errors/month):**

- Install `@sentry/nextjs`
- Configure error tracking for production
- Set up alerts for critical errors (email/Slack)

**Logging:**

- Log API errors to console (Vercel logs)
- Log slow queries (> 1 second)
- Log failed auth attempts


#### 11.4 Legal Pages

**Create Static Pages:**

- `/privacy` - Privacy Policy (required for Firebase, Google/GitHub OAuth)
- `/terms` - Terms of Service
- `/about` - About the project, mission, team
- `/contact` - Contact form or email

**Use:** Free privacy policy generators (e.g., Termly, Privacy Policy Generator)

**Footer Links:**

- Privacy Policy, Terms, About, Contact


#### 11.5 Testing Checklist

**Functional Testing:**

- [ ] Sign up with Google → creates user in Postgres
- [ ] Sign up with GitHub → works, session persists
- [ ] Take anonymous test → saves locally
- [ ] Anonymous user signs in → migrates local sessions
- [ ] Test all modes (time/word, categories, difficulties)
- [ ] Keystroke logging → saves to MongoDB
- [ ] Weakness analysis → appears correctly after 1 day
- [ ] Daily plan → generates, tasks complete correctly
- [ ] XP/Level → awards correctly, level up animation works
- [ ] Achievements → unlock when conditions met
- [ ] Streak → calculates correctly, freezes work
- [ ] Daily quests → generate, track progress, award XP
- [ ] Leaderboard → shows top users, filters work
- [ ] Friends → add, accept requests, see activity
- [ ] Share → generates image, Twitter/FB links work
- [ ] Settings → all preferences save and apply
- [ ] Mobile → responsive, usable

**Performance Testing:**

- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Dashboard loads < 2 seconds
- [ ] Typing test has no input lag
- [ ] Database queries < 500ms average

**Security Testing:**

- [ ] API routes check auth (verifyAuth())
- [ ] Can't access other users' data via URL manipulation
- [ ] Session cookie is HTTP-only, secure
- [ ] No sensitive data in client-side code
- [ ] SQL injection protected (using parameterized queries)
- [ ] Rate limiting on API routes (implement with Vercel Edge Config or simple counter)

**Browser Testing:**

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Mobile browsers (Android Chrome, iOS Safari)


#### 11.6 Launch Checklist

**Pre-Launch:**

- [ ] All environment variables set in Vercel
- [ ] Production database backups enabled (Supabase auto-backup on paid plans, but document manual backup process)
- [ ] Error monitoring active (Sentry)
- [ ] Analytics tracking confirmed working
- [ ] All legal pages published
- [ ] Social media accounts created (Twitter, Reddit)
- [ ] Landing page final copy proofread

**Launch Day:**

- [ ] Deploy to production (Vercel main branch)
- [ ] Test production site end-to-end
- [ ] Submit to Product Hunt
- [ ] Post on Reddit (r/typing, r/learnprogramming, r/webdev)
- [ ] Tweet announcement
- [ ] Post in Discord communities (typing, dev)
- [ ] Email any beta testers

**Post-Launch (Week 1):**

- [ ] Monitor error logs daily
- [ ] Check database usage (stay within free tiers)
- [ ] Respond to user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Monitor signup conversion rate
- [ ] Track retention: Day 1, Day 7 retention rates

**Success Criteria:**

- All tests pass
- Lighthouse score green
- No critical errors in Sentry
- Site loads fast globally (test with Vercel Edge analytics)
- Ready to handle 1,000+ users on launch day

***

## Technical Implementation Notes

### Firebase Authentication + Postgres Sync Pattern

**Flow:**[^14][^15][^16][^17]

1. User signs in via Firebase client
2. Client gets ID token
3. POST token to `/api/auth/session`
4. Server verifies token with Firebase Admin SDK
5. Server creates session cookie (14-day expiry)
6. Server upserts user to Postgres `users` table:
    - Match by `firebase_uid`
    - If exists, update `updated_at`
    - If new, insert with email, display_name, photo_url from token claims
7. All future requests: verify session cookie → extract `uid` → query Postgres by `users.firebase_uid`

**Why this works:** Firebase handles complex auth (OAuth, MFA, phone, etc.) while Postgres stores all relational data.[^15][^17][^14]

### MongoDB + Postgres Division of Labor

**MongoDB handles:**[^2][^1]

- High-frequency writes (keystroke events: millions per day)
- Flexible schemas (user preferences, custom settings)
- Temporary data (daily quests reset daily, no history needed)
- Event logs (don't need joins or complex queries)

**Postgres handles:**[^1]

- User accounts, profiles (requires joins with sessions, friends, etc.)
- Aggregated stats (rolled-up from MongoDB keystroke data)
- Leaderboards (needs ranking queries, window functions)
- Achievement definitions and unlocks (many-to-many relationships)
- Analytics (complex GROUP BY queries, date range aggregations)

**Sync jobs:**

- Nightly cron: aggregate MongoDB keystroke events → Postgres weakness profiles
- On test completion: save raw session to MongoDB + summary to Postgres simultaneously


### Free Tier Monitoring Strategy

**Set Up Alerts:**

1. **Firebase:** Check usage dashboard weekly (50K MAU limit)[^5][^3]
2. **Supabase:** Set alert at 400MB database usage (500MB limit)[^6]
3. **MongoDB:** Check Atlas dashboard for storage usage (512MB limit)[^7]
4. **Vercel:** Monitor bandwidth usage (100GB/month limit)

**Scaling Plan (if you hit limits):**

- Firebase: \$25/month Bl

<div align="center">⁂</div>

[^1]: https://sqlflash.ai/article/20250701-1/

[^2]: https://www.youtube.com/watch?v=8h8orDvQ0Yk

[^3]: https://firebase.google.com/pricing

[^4]: https://supertokens.com/blog/firebase-pricing

[^5]: https://www.metacto.com/blogs/the-complete-guide-to-firebase-auth-costs-setup-integration-and-maintenance

[^6]: https://kamarasa.com/blog/supabase-free-tier-user-limits

[^7]: https://mull-overthing.com/is-mongodb-atlas-free-tier-limitations/

[^8]: https://askai.glarity.app/search/What-are-the-limitations-of-MongoDB-s-free-tier--M0--cluster-in-terms-of-databases--collections--connections--and-operations-per-second

[^9]: https://amplitude.com/blog/the-hook-model

[^10]: https://blog.logrocket.com/product-management/what-is-the-hook-model-how-to-build-habit-forming-products/

[^11]: https://www.storyly.io/post/gamification-strategies-to-increase-app-engagement

[^12]: https://armaghi.com/uk-news/gamification-mechanics-that-increase-user-retention-points-badges-and-progress-tracking/280371

[^13]: https://open.uct.ac.za/server/api/core/bitstreams/3ec6bd53-aabf-4375-ace5-fc14b917e6ff/content

[^14]: https://www.reddit.com/r/Firebase/comments/189df13/when_using_firebase_auth_with_postgres_how_do_you/

[^15]: https://www.reddit.com/r/Firebase/comments/lk7luq/how_can_i_use_postgresql_with_firebase_auth/

[^16]: https://stackoverflow.com/questions/59700397/using-firebase-only-for-the-authentication-in-a-postgres-stack

[^17]: https://www.reddit.com/r/reactjs/comments/puow2d/help_using_firebase_for_authentication_only_and/

