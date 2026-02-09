# Deployment Checklist - Gather These First

Before running `./deploy-phase-1-and-2.sh`, have these values ready:

## 1. Anthropic API Key
**Where to get it:** https://console.anthropic.com/settings/keys

**Format:** `sk-ant-api03-...`

**Permissions needed:** Full API access

---

## 2. Supabase Service Role Key
**Where to get it:**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click: Settings → API
3. Look for: **service_role** (secret) - NOT the anon key
4. Click the eye icon to reveal
5. Copy the key

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

⚠️ **Important:** This is the SECRET key, not the public anon key!

---

## 3. Supabase Project URL
**Where to get it:**
1. Same page: Settings → API
2. Look for: **Project URL**

**Format:** `https://xxxxxxxxxxxxx.supabase.co`

---

## 4. Supabase Anon Key (for client)
**Where to get it:**
1. Same page: Settings → API
2. Look for: **anon / public** key

**Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

This one is safe to expose to the browser.

---

## 5. Database Connection Info (for migration)

**Option A - Using psql:**
1. Settings → Database → Connection string
2. Look for the host: `db.xxxxxxxxxxxxx.supabase.co`

**Option B - SQL Editor (easier):**
Just use the Supabase web interface (script will guide you)

---

## Quick Run

Once you have all the above:

```bash
cd /Users/abecrystal/Dev/new-advisor
./deploy-phase-1-and-2.sh
```

The script will:
1. ✅ Check if you're logged in
2. ✅ Link to your project
3. ✅ Prompt you for the secrets
4. ✅ Deploy the Edge Function
5. ✅ Guide you through the migration
6. ✅ Show you where to add the feature flag

**Time estimate:** 5-10 minutes

---

## After Deployment

Add to your environment (Render/Vercel/Netlify):

```bash
VITE_USE_EDGE_FUNCTION=true
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...  # The anon key
```

Then redeploy your client.

---

## Troubleshooting

**"Access token not provided"**
→ Run `supabase login` manually first

**"Function failed to deploy"**
→ Check you're in the right directory
→ Check your secrets are set correctly

**"Cannot connect to database"**
→ Use the SQL Editor option instead of psql

**Client still hitting Express endpoint**
→ Make sure you redeployed AFTER adding VITE_USE_EDGE_FUNCTION=true
→ Check browser console: console.log(import.meta.env.VITE_USE_EDGE_FUNCTION)

---

## Rollback

If anything breaks:
```bash
# Set this in your environment
VITE_USE_EDGE_FUNCTION=false

# Redeploy client
# Traffic goes back to Express immediately
```
