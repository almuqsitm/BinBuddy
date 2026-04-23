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

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  assigned_to: string;
  assigned_by: string;
  due_type: 'day' | 'week';
  due_date: string;
  location?: string;
  task_type?: 'standard' | 'garbage_collection';
  completed: boolean;
  created_at: string;
  subtasks?: Subtask[];
};

export type GarbagePoint = {
  id: string;
  task_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  collected: boolean;
  collected_by?: string;
  collected_at?: string;
  collector?: { first_name: string; last_name: string };
  created_at: string;
};

export async function createTask(payload: {
  title: string;
  assigned_to: string;
  assigned_by: string;
  due_type: string;
  due_date: string;
  location?: string;
  task_type?: string;
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

export async function createSubtask(
  taskId: string,
  title: string,
  orderIndex: number,
): Promise<Subtask> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, order_index: orderIndex }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function toggleSubtaskComplete(subtaskId: string): Promise<Subtask> {
  const res = await fetch(`${API_BASE}/subtasks/${subtaskId}/complete`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to update subtask');
  return res.json();
}

export async function deleteSubtask(subtaskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/subtasks/${subtaskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete subtask');
}

export async function getOrGenerateGarbagePoints(taskId: string): Promise<GarbagePoint[]> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}/garbage-points`);
  if (!res.ok) throw new Error('Failed to load garbage points');
  return res.json();
}

export async function speakText(text: string): Promise<{ audio: string }> {
  const res = await fetch(`${API_BASE}/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function transcribeAudio(audioUri: string): Promise<{ transcript: string }> {
  const form = new FormData();
  form.append('file', { uri: audioUri, name: 'audio.m4a', type: 'audio/m4a' } as any);
  const res = await fetch(`${API_BASE}/voice/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export type VoiceAction = { type: 'complete_task' | 'complete_subtask'; id: string } | null;

export async function voiceChat(
  message: string,
  tasks: Task[],
): Promise<{ reply: string; action: VoiceAction }> {
  const res = await fetch(`${API_BASE}/voice/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tasks }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function collectGarbagePoint(pointId: string, userId: string): Promise<GarbagePoint> {
  const res = await fetch(`${API_BASE}/garbage-points/${pointId}/collect`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error('Failed to collect point');
  return res.json();
}
