import { supabase } from './supabase';
import { Decision } from '../types/decision';

export type DecisionReport = {
  id: string; decisionId: string; title: string;
  savedAt: string; content: string;
};

export type ChatMessage = {
  id: string; role: 'user' | 'assistant';
  content: string; timestamp: string;
};

// ─── Decisions ────────────────────────────────────────────────────────────────

export async function pushDecisionToSupabase(userId: string, d: Decision) {
  const { error } = await supabase.from('decisions').upsert({
    id:               d.id,
    user_id:          userId,
    title:            d.title,
    category:         d.category ?? 'Personal',
    options:          d.options,
    best_option_name: d.bestOptionName,
    final_score:      d.finalScore,
    updated_at:       new Date().toISOString(),
  });
  if (error) console.warn('[Supabase] decision upsert failed:', error.message);
}

export async function deleteDecisionFromSupabase(id: string) {
  const { error } = await supabase.from('decisions').delete().eq('id', id);
  if (error) console.warn('[Supabase] decision delete failed:', error.message);
}

export async function fetchDecisionsFromSupabase(userId: string): Promise<Decision[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.warn('[Supabase] fetch decisions failed:', error.message); return []; }
  return (data ?? []).map((r: any) => ({
    id:              r.id,
    title:           r.title,
    category:        r.category,
    options:         r.options ?? [],
    bestOptionName:  r.best_option_name,
    finalScore:      r.final_score,
  }));
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function pushReportToSupabase(userId: string, r: DecisionReport) {
  const { error } = await supabase.from('reports').upsert({
    id:          r.id,
    user_id:     userId,
    decision_id: r.decisionId,
    title:       r.title,
    content:     r.content,
    saved_at:    r.savedAt,
  });
  if (error) console.warn('[Supabase] report upsert failed:', error.message);
}

export async function deleteReportFromSupabase(id: string) {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) console.warn('[Supabase] report delete failed:', error.message);
}

export async function fetchReportsFromSupabase(userId: string): Promise<DecisionReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) { console.warn('[Supabase] fetch reports failed:', error.message); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, decisionId: r.decision_id,
    title: r.title, content: r.content, savedAt: r.saved_at,
  }));
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function pushChatMessageToSupabase(userId: string, m: ChatMessage) {
  const { error } = await supabase.from('chat_history').upsert({
    id:        m.id,
    user_id:   userId,
    role:      m.role,
    content:   m.content,
    timestamp: m.timestamp,
  });
  if (error) console.warn('[Supabase] chat upsert failed:', error.message);
}

export async function clearChatFromSupabase(userId: string) {
  const { error } = await supabase.from('chat_history').delete().eq('user_id', userId);
  if (error) console.warn('[Supabase] chat clear failed:', error.message);
}

export async function fetchChatFromSupabase(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });
  if (error) { console.warn('[Supabase] fetch chat failed:', error.message); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, role: r.role, content: r.content, timestamp: r.timestamp,
  }));
}