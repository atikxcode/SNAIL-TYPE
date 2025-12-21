# Workplan: Snail Type Project Consolidated Status

## 1. Current State Analysis
- **Project Structure**: Hybrid/Split structure detected.
  - **Active App**: Located in `src/app` (Next.js App Router).
  - **Rich Feature Set**: Located in root `lib` (services, database, utils) and root `components`.
  - **Configuration**: `jsconfig.json` points `@` alias to `src`.
- **Implementation Gaps**:
  - The active `src/components/TypingTest.jsx` uses a hardcoded word pool and simple logic, ignoring the advanced `wordGenerator` and logging services present in root `lib`.
  - `src/lib` is largely empty or contains simplified versions, missing key services like `gamificationService`, `drillGenerator`, etc., which exist in root `lib`.
  - The "Full Project" specification (Phases 1-11) is significantly genericized in the current `src` implementation.

## 2. What is Remained (Missing Features in Active App)
Based on `Full Project.md`, the following are missing from the `src` application:
- **Phase 1 (Auth)**: Full Firebase Admin integration might be missing from `src/lib/firebase` if it's empty.
- **Phase 2 (Core)**: `wordGenerator` service, MongoDB keystroke logging (batching logic exists in root `TypingTest.js` but not fully in `src`), Advanced Modes (only basic time/words in `src`).
- **Phase 3 (Dashboard)**: Backend stats aggregation services are in root `lib`, likely not connected to `src/app/dashboard`.
- **Phase 4 (Weakness)**: Keystroke analysis services are in root `lib`, not `src`.
- **Phase 5 (Gamification)**: `gamificationService.js` is in root `lib`, not `src`.
- **Phases 6-11**: Advanced features (Custom Text, Leaderboards, Training Plans) are implemented in root logic but not active.

## 3. Action Plan (What to Do)
1.  **Consolidate Codebase**:
    -   Move all contents from root `lib` and `components` to `src/lib` and `src/components`, merging with existing files where necessary.
    -   Prioritize root `lib` services as they contain the logic described in `Full Project.md`.
    -   Update `src/components/TypingTest.jsx` to use the `wordGenerator` service and `keystroke` logging from the consolidated `lib`.
2.  **Verify Imports**:
    -   Ensure all `@/lib` imports in the moved files correctly point to `src/lib`.
3.  **Restore Features**:
    -   Re-enable the advanced generic modes (e.g., Code, Quotes) by connecting the UI in `TypingTest.jsx` to the `wordGenerator`.
    -   Hook up the `keystroke` logging in `TypingTest.jsx` to the API routes (ensure API routes exist in `src/app/api`).
4.  **Database & Env**:
    -   Ensure `.env.local` is set up with Firebase, Supabase, and MongoDB credentials.
5.  **Validation**:
    -   Run tests/checks to ensure the merged application builds and runs.

## 4. Immediate Next Step
-   Start the dev server to verify the current baseline of the `src` application.
