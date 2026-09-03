"use client";

import { ACCESS_TOKEN_STORAGE_KEY, apiPost, DEMO_USER_ID } from "./api";

const USER_STORAGE_KEY = "currentUser";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Session {
  accessToken: string;
  user: AuthUser;
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

/** The demo user fallback keeps every existing search/booking flow working for a signed-out visitor. */
export function getCurrentUserId(): string {
  return getCurrentUser()?.id ?? DEMO_USER_ID;
}

function saveSession(session: Session) {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
}

export function logout() {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const session = await apiPost<Session>("/auth/login", { email, password });
  saveSession(session);
  return session.user;
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthUser> {
  const session = await apiPost<Session>("/auth/register", input);
  saveSession(session);
  return session.user;
}
