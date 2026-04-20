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
