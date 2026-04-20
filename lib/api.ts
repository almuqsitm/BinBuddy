// Change to your machine's LAN IP (e.g. http://192.168.1.x:8000) when testing on a physical device
const API_BASE = "https://exhaust-ignition-vendetta.ngrok-free.dev"    //'http://localhost:8000'; // swap for ngrok URL (https://xxx.ngrok.io) or LAN IP when on physical device

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'janitor' | 'supervisor';
  created_at: string;
};

export async function lookupUser(email: string): Promise<User | null> {
  const res = await fetch(`${API_BASE}/auth/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createUser(payload: {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) throw new Error('Email already registered');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUser(userId: string): Promise<User> {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  if (!res.ok) throw new Error('User not found');
  return res.json();
}

export async function getJanitors(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users/janitors`);
  if (!res.ok) throw new Error('Failed to fetch janitors');
  return res.json();
}

export type Task = {
  id: string;
  title: string;
  assigned_to: string;
  assigned_by: string;
  due_type: 'day' | 'week';
  due_date: string;
  completed: boolean;
  created_at: string;
};

export async function createTask(payload: {
  title: string;
  assigned_to: string;
  assigned_by: string;
  due_type: string;
  due_date: string;
}): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getUserTasks(
  userId: string,
  fromDate?: string,
  toDate?: string,
): Promise<Task[]> {
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  const res = await fetch(`${API_BASE}/tasks/user/${userId}?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function toggleTaskComplete(taskId: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}
