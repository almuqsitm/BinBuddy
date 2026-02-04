# Local Supabase Development Setup

This guide will help you run Supabase locally using Docker for development and testing.

## Prerequisites

1. **Docker Desktop** - Download from [docker.com](https://www.docker.com/products/docker-desktop)
2. **Supabase CLI** - We'll install this below

---

## Step 1: Install Supabase CLI

### Check if already installed:
```bash
which supabase
```

### If not installed, install via Homebrew:
```bash
brew install supabase/tap/supabase
```

### Verify installation:
```bash
supabase --version
```

---

## Step 2: Check Docker is Running

```bash
docker --version
```

Make sure Docker Desktop is running (you should see the Docker icon in your menu bar).

---

## Step 3: Initialize Supabase in Your Project

```bash
cd /Users/hehe/Code/zhigang/BinBuddy
supabase init
```

This creates a `supabase/` folder with configuration files.

---

## Step 4: Start Local Supabase

```bash
supabase start
```

> **Note:** First time will take 5-10 minutes as it downloads Docker images.

This will start:
- PostgreSQL database
- Supabase Studio (web UI)
- Auth server
- Storage server
- Realtime server

### Expected Output:
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGc...
service_role key: eyJhbGc...
   S3 Access Key: 625729a08b95bf1b7ff351a663f3a23c
   S3 Secret Key: 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
       S3 Region: local
```

---

## Step 5: Apply Your Database Schema

Copy the SQL from `backend/schema.sql` and run it in Supabase Studio:

1. Open Studio: `http://127.0.0.1:54323`
2. Go to **SQL Editor**
3. Paste your schema from `backend/schema.sql`
4. Click **Run**

**OR** create a migration file:

```bash
# Create migration file
supabase migration new initial_schema

# This creates: supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql
# Copy your schema.sql content into this file
```

Then apply it:
```bash
supabase db reset
```

---

## Step 6: Update Your Environment Variables

### Backend `.env`:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=eyJhbGc... # Use the anon key from supabase start output
```

### Frontend `.env`:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGc... # Same anon key
```

> **Important:** Copy the actual `anon key` from your `supabase start` output!

---

## Step 7: Start Your Application

### Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

---

## Useful Commands

### View local Supabase status:
```bash
supabase status
```

### Stop local Supabase:
```bash
supabase stop
```

### Stop and remove all data:
```bash
supabase stop --no-backup
```

### Reset database (reapply migrations):
```bash
supabase db reset
```

### View logs:
```bash
supabase logs
```

### Access PostgreSQL directly:
```bash
supabase db psql
```

---

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Supabase Studio** | http://127.0.0.1:54323 | No login needed |
| **API** | http://127.0.0.1:54321 | Use anon key |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres | postgres/postgres |
| **Email Testing** | http://127.0.0.1:54324 | View test emails |

---

## Working with Migrations

### Create a new migration:
```bash
supabase migration new add_new_feature
```

### Apply migrations:
```bash
supabase db reset
```

### Generate migration from remote changes:
```bash
supabase db pull
```

---

## Switching Between Local and Production

### Local Development:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<local_anon_key>
```

### Production:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=<production_anon_key>
```

**Pro Tip:** Use different `.env` files:
- `.env.local` - Local development
- `.env.production` - Production

---

## Troubleshooting

### Docker not running:
```bash
# Start Docker Desktop manually or:
open -a Docker
```

### Port conflicts:
```bash
# Stop Supabase and check what's using the ports
supabase stop
lsof -i :54321
```

### Reset everything:
```bash
supabase stop --no-backup
supabase start
```

### Database connection issues:
```bash
# Check if PostgreSQL is running
supabase status

# Try resetting
supabase db reset
```

---

## Benefits of Local Development

✅ **No internet required** - Work offline  
✅ **Faster development** - No API latency  
✅ **Free testing** - No usage limits  
✅ **Safe experimentation** - Can't break production  
✅ **Migration testing** - Test schema changes locally first  
✅ **Consistent environments** - Same setup across team  

---

## Next Steps

1. Install Docker Desktop if you haven't
2. Install Supabase CLI: `brew install supabase/tap/supabase`
3. Run `supabase init` in your project
4. Run `supabase start`
5. Copy the anon key to your `.env` files
6. Apply your schema in Studio or via migrations
7. Start coding! 🚀
