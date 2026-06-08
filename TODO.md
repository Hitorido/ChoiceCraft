# Fix Auth Errors in DecisionContext.tsx and LoginScreen.tsx

## Steps:
1. [ ] Provide SQL for profiles table and instruct user to run in Supabase SQL editor (enable RLS).
2. [ ] Fix DecisionContext.tsx: Update login/signUp to use getCurrentUser() after auth calls.
3. [ ] Fix LoginScreen.tsx: Add email state, fix inputs (email for login, username+email for signup).
4. [ ] Clean console.warn in DecisionContext.tsx to silent fails.
5. [ ] Fix GEMINI API key typo.
6. [ ] Test: npx expo start --clear, test login/signup flows.
7. [ ] Update TODO.md with completion.

Current status: DecisionContext.tsx fixed, LoginScreen state added. Ready for test.

