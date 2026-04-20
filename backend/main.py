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
    allow_methods=["GET", "POST"],
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
