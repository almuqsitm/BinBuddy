# BinBuddy Setup Guide

A task management app for janitors and supervisors, built with Expo (React Native) + FastAPI + Supabase.

---

## Prerequisites

### macOS

| Tool | Install |
|------|---------|
| Node.js 18+ | [nodejs.org](https://nodejs.org) or `brew install node` |
| Python 3.10+ | [python.org](https://python.org) or `brew install python` |
| Supabase CLI | `brew install supabase/tap/supabase` |
| Expo Go app | Install on your iPhone/Android from the App Store / Play Store |
| ngrok | `brew install ngrok` |

### Windows

| Tool | Install |
|------|---------|
| Node.js 18+ | [nodejs.org](https://nodejs.org) |
| Python 3.10+ | [python.org](https://python.org) — check "Add to PATH" during install |
| Supabase CLI | Download binary from [github.com/supabase/cli/releases](https://github.com/supabase/cli/releases) and add to PATH |
| Expo Go app | Install on your iPhone/Android from the App Store / Play Store |
| ngrok | [ngrok.com/download](https://ngrok.com/download) |

> **Windows users:** run all commands in **PowerShell** or **Git Bash**.

---

## 1. Clone the repo

```bash
git clone <repo-url>
cd binbuddy3
```

---

## 2. Frontend — install dependencies

```bash
npm install
```

---

## 3. Backend — create a virtual environment and install dependencies

### macOS
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Windows
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

---

## 4. Set up local Supabase

### Start Supabase

```bash
supabase start
```

This will print output including a **Service role key** (`sb_secret_...`) and a local **API URL** (`http://127.0.0.1:54321`). Keep this terminal open.

### Create the backend `.env` file

Create `backend/.env` and fill in the values from the `supabase start` output:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<your sb_secret_ key>
```

### Run the database migrations

Open the Supabase Studio at [http://127.0.0.1:54323](http://127.0.0.1:54323), go to **SQL Editor**, and run each migration file **in order**:

1. `backend/migrations/001_create_users_table.sql`
2. `backend/migrations/002_create_tasks_table.sql`
3. `backend/migrations/003_create_subtasks_table.sql`
4. `backend/migrations/004_garbage_collection.sql`

Copy and paste each file's contents into the SQL Editor and click **Run**.

---

## 5. Expose the backend with ngrok

The Expo app runs on your phone, so `localhost` won't work. Use ngrok to get a public HTTPS URL.

### Sign up and authenticate ngrok (first time only)

1. Create a free account at [ngrok.com](https://ngrok.com)
2. Copy your authtoken from the ngrok dashboard
3. Run:

```bash
ngrok config add-authtoken <your-token>
```

### Start ngrok

```bash
ngrok http 8000
```

It will show a **Forwarding** URL like `https://abc123.ngrok-free.app`. Copy it.

---

## 6. Update the API base URL

Open `lib/api.ts` and replace the `API_BASE` value with your ngrok URL:

```typescript
const API_BASE = "https://abc123.ngrok-free.app";
```

> You need to update this every time ngrok restarts, as the URL changes on the free plan.

---

## 7. Start the backend

In a terminal with the virtual environment activated:

### macOS
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Windows
```powershell
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`. You can view the auto-generated docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 8. Start the Expo app

In a separate terminal from the project root:

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

---

## Running checklist

| Step | macOS | Windows |
|------|-------|---------|
| `supabase start` | Terminal 1 | Terminal 1 |
| `uvicorn main:app --reload` (in `backend/` with venv active) | Terminal 2 | Terminal 2 |
| `ngrok http 8000` | Terminal 3 | Terminal 3 |
| Update `lib/api.ts` with ngrok URL | | |
| `npx expo start` | Terminal 4 | Terminal 4 |

---

## Stopping everything

```bash
# Stop Supabase
supabase stop

# Stop uvicorn and ngrok with Ctrl+C in their respective terminals
```
