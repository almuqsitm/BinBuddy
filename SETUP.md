# BinBuddy - Local Setup Guide

## Overview
BinBuddy is a task management application with:
- **Backend**: FastAPI (Python) - runs on `http://localhost:8000`
- **Frontend**: React + Vite - runs on `http://localhost:5173`
- **Database**: Supabase (cloud-hosted)

---

## Prerequisites
- Python 3.8+
- Node.js 18+ and npm
- Supabase account and project

---

## 🔧 Backend Setup

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Create a virtual environment
```bash
python3 -m venv venv
```

### 3. Activate the virtual environment
```bash
source venv/bin/activate
```

### 4. Install dependencies
```bash
pip install -r requirements.txt
```

### 5. Create `.env` file
Create a file named `.env` in the `backend` directory with your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

> **Where to find these values:**
> - Go to your Supabase project dashboard
> - Navigate to Settings → API
> - Copy the "Project URL" and "anon/public" key

### 6. Set up the database schema
Run the SQL in `schema.sql` in your Supabase SQL Editor to create the necessary tables.

### 7. Start the backend server
```bash
uvicorn main:app --reload
```

The backend will be available at `http://localhost:8000`

---

## 🎨 Frontend Setup

### 1. Navigate to frontend directory
```bash
cd frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
Create a file named `.env` in the `frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note:** Use the same values as the backend `.env` file

### 4. Start the development server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## ✅ Verification

1. **Backend**: Visit `http://localhost:8000` - you should see:
   ```json
   {"message": "BinBuddy Backend is Running!"}
   ```

2. **Frontend**: Visit `http://localhost:5173` - you should see the BinBuddy app interface

3. **API Docs**: Visit `http://localhost:8000/docs` for interactive API documentation

---

## 📝 Quick Start Commands

### Run both servers (use two terminal windows):

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🔑 Getting Supabase Credentials

If you don't have a Supabase project yet:

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Sign in
3. Create a new project
4. Wait for the project to finish setting up
5. Go to Settings → API to find your credentials
6. Run the SQL from `backend/schema.sql` in the SQL Editor

---

## 🐛 Troubleshooting

**Backend won't start:**
- Make sure virtual environment is activated
- Check that `.env` file exists with correct credentials
- Verify Python 3.8+ is installed: `python3 --version`

**Frontend won't start:**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and running `npm install` again
- Check that `.env` file exists in frontend directory

**CORS errors:**
- Ensure backend is running on port 8000
- Ensure frontend is running on port 5173
- Check CORS settings in `backend/main.py`
