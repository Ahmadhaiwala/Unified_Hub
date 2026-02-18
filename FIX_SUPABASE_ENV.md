# 🔧 Fix Supabase Environment Variables

## ❌ The Problem

Your `.env` file had two issues:
1. Wrong variable names: `REACT_SUPABASE_URL` instead of `REACT_APP_SUPABASE_URL`
2. Invalid anon key format

## ✅ The Solution

### Step 1: Get Your Correct Supabase Keys

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `jlznjylmntyzepvufkja`
3. Click on the **Settings** icon (⚙️) in the left sidebar
4. Click on **API** in the settings menu
5. You'll see two keys:
   - **Project URL** - Copy this
   - **anon public** key - Copy this (it's a long JWT token starting with `eyJ...`)

### Step 2: Update Your `.env` File

Open `frontend/.env` and replace with:

```env
REACT_APP_SUPABASE_URL=https://jlznjylmntyzepvufkja.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsem5qeWxtbnR5emVwdnVma2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTU5NzcsImV4cCI6MjA1MjMzMTk3N30.YOUR_ACTUAL_SIGNATURE_HERE
```

**Important:** 
- The variable names MUST start with `REACT_APP_` (not just `REACT_`)
- The anon key should be a long JWT token (usually 200+ characters)
- It should start with `eyJ` and have two dots (`.`) in it

### Step 3: Restart Your React App

After updating the `.env` file:

```bash
# Stop your current React app (Ctrl+C)
# Then restart it
npm start
```

**Important:** React only reads `.env` files at startup, so you MUST restart!

---

## 🔍 How to Find Your Keys in Supabase

### Visual Guide:

1. **Supabase Dashboard** → https://supabase.com/dashboard
2. **Select Project** → Click on your project
3. **Settings (⚙️)** → Left sidebar
4. **API** → In settings menu
5. **Copy Keys:**
   - Project URL: `https://jlznjylmntyzepvufkja.supabase.co`
   - anon public: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long token)

---

## ✅ Verify It's Working

After restarting your app, open the browser console (F12) and check:

```javascript
// You should NOT see any Supabase errors
// If you see "supabaseUrl is required", the .env is still wrong
```

---

## 📝 Common Mistakes

### ❌ Wrong Variable Names
```env
REACT_SUPABASE_URL=...           # WRONG - missing APP_
SUPABASE_URL=...                 # WRONG - missing REACT_APP_
```

### ✅ Correct Variable Names
```env
REACT_APP_SUPABASE_URL=...       # CORRECT
REACT_APP_SUPABASE_ANON_KEY=...  # CORRECT
```

### ❌ Wrong Key Format
```env
# This is NOT a valid anon key:
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_uIdLQY11_C-dSHBDQMx8NA_30_TLYGs
```

### ✅ Correct Key Format
```env
# This IS a valid anon key (JWT token):
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsem5qeWxtbnR5emVwdnVma2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NTU5NzcsImV4cCI6MjA1MjMzMTk3N30.Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql-Ql
```

---

## 🚀 After Fixing

Once you have the correct keys and restart your app:

1. Navigate to `/tasks` in your app
2. You should see the task list (empty at first)
3. Click "+ New Task" to create your first task
4. No more Supabase errors in console!

---

## 🆘 Still Having Issues?

If you still see errors after:
1. ✅ Updating variable names to `REACT_APP_*`
2. ✅ Using the correct anon key from Supabase dashboard
3. ✅ Restarting your React app

Then check:
- Is your Supabase project active?
- Did you run the database migration SQL?
- Are there any other errors in the console?
