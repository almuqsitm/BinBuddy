from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="BinBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)


class LookupRequest(BaseModel):
    email: str


class CreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    role: str  # "janitor" | "supervisor"


@app.post("/auth/lookup")
def lookup_user(body: LookupRequest):
    result = (
        supabase.table("users")
        .select("*")
        .eq("email", body.email.strip().lower())
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@app.post("/auth/create")
def create_user(body: CreateRequest):
    role = body.role.lower()
    if role not in ("janitor", "supervisor"):
        raise HTTPException(status_code=422, detail="Role must be janitor or supervisor")
    try:
        result = (
            supabase.table("users")
            .insert({
                "first_name": body.first_name.strip(),
                "last_name": body.last_name.strip(),
                "email": body.email.strip().lower(),
                "role": role,
            })
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=409, detail="Email already registered")
    return result.data[0]


@app.get("/users/janitors")
def list_janitors():
    result = (
        supabase.table("users")
        .select("*")
        .eq("role", "janitor")
        .order("first_name")
        .execute()
    )
    return result.data


@app.get("/users/{user_id}")
def get_user(user_id: str):
    result = (
        supabase.table("users")
        .select("*")
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


class CreateTaskRequest(BaseModel):
    title: str
    assigned_to: str
    assigned_by: str
    due_type: str        # "day" | "week"
    due_date: str        # ISO date YYYY-MM-DD
    location: str = ""


class CreateSubtaskRequest(BaseModel):
    title: str
    order_index: int = 0


@app.post("/tasks")
def create_task(body: CreateTaskRequest):
    due_type = body.due_type.lower()
    if due_type not in ("day", "week"):
        raise HTTPException(status_code=422, detail="due_type must be day or week")
    result = (
        supabase.table("tasks")
        .insert({
            "title": body.title.strip(),
            "assigned_to": body.assigned_to,
            "assigned_by": body.assigned_by,
            "due_type": due_type,
            "due_date": body.due_date,
            "location": body.location.strip(),
            "completed": False,
        })
        .execute()
    )
    return result.data[0]


@app.get("/tasks/user/{user_id}")
def get_user_tasks(user_id: str, from_date: str = None, to_date: str = None):
    query = (
        supabase.table("tasks")
        .select("*, subtasks(*)")
        .eq("assigned_to", user_id)
    )
    if from_date:
        query = query.gte("due_date", from_date)
    if to_date:
        query = query.lte("due_date", to_date)
    result = query.order("due_date").execute()
    return result.data


@app.patch("/tasks/{task_id}/complete")
def toggle_task_complete(task_id: str):
    current = (
        supabase.table("tasks")
        .select("completed")
        .eq("id", task_id)
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Task not found")
    new_state = not current.data[0]["completed"]
    result = (
        supabase.table("tasks")
        .update({"completed": new_state})
        .eq("id", task_id)
        .execute()
    )
    return result.data[0]


@app.post("/tasks/{task_id}/subtasks")
def create_subtask(task_id: str, body: CreateSubtaskRequest):
    result = (
        supabase.table("subtasks")
        .insert({
            "task_id": task_id,
            "title": body.title.strip(),
            "order_index": body.order_index,
            "completed": False,
        })
        .execute()
    )
    return result.data[0]


@app.patch("/subtasks/{subtask_id}/complete")
def toggle_subtask_complete(subtask_id: str):
    current = (
        supabase.table("subtasks")
        .select("completed")
        .eq("id", subtask_id)
        .execute()
    )
    if not current.data:
        raise HTTPException(status_code=404, detail="Subtask not found")
    new_state = not current.data[0]["completed"]
    result = (
        supabase.table("subtasks")
        .update({"completed": new_state})
        .eq("id", subtask_id)
        .execute()
    )
    return result.data[0]


@app.delete("/subtasks/{subtask_id}")
def delete_subtask(subtask_id: str):
    supabase.table("subtasks").delete().eq("id", subtask_id).execute()
    return {"ok": True}
