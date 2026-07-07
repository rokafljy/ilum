import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabase 연결 여부 — 키가 없으면 UI는 "연결 대기" 모드로 동작 */
export const supabaseReady = Boolean(url && anonKey);

export const supabase = supabaseReady ? createClient(url, anonKey) : null;
