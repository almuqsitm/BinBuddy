from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# 1. LOAD SECRETS
# This reads the .env file so we can access SUPABASE_URL and SUPABASE_KEY
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

# 2. CONNECT TO DATABASE
# This creates the "phone line" to Supabase.
supabase: Client = create_client(url, key)

# 3. INITIALIZE APP
# This creates the actual Web Server.
app = FastAPI()

# 4. DATA MODELS (Pydantic)
# These are "Blueprints". They force data to look a certain way.
# If the frontend sends a task without a "title", this will block it.

class TaskCreate(BaseModel):
    title: str
    assigned_to: str  # UUID of the Janitor
    created_by: str   # UUID of the Supervisor

class TaskUpdate(BaseModel):
    is_completed: bool

# 5. API ENDPOINTS (The Buttons)

@app.get("/")
def home():
    """Simple check to see if the server is running."""
    return {"message": "BinBuddy Backend is Running!"}

@app.get("/tasks")
def get_tasks():
    """
    Fetch all tasks from the database.
    In the future, we will filter this by who is logged in.
    """
    # .table("tasks").select("*") -> Translated to SQL: SELECT * FROM tasks
    response = supabase.table("tasks").select("*").execute()
    return response.data

@app.post("/tasks")
def create_task(task: TaskCreate):
    """
    Create a new task.
    Expecting JSON: {"title": "Clean Sink", "assigned_to": "...", "created_by": "..."}
    """
    try:
        # data=task.dict() converts our Python object to a JSON dictionary
        response = supabase.table("tasks").insert(task.dict()).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.patch("/tasks/{task_id}")
def update_task(task_id: int, update: TaskUpdate):
    """
    Update a task (e.g. mark as Done).
    """
    try:
        response = supabase.table("tasks").update(update.dict()).eq("id", task_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
