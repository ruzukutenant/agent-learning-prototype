import { supabase, handleSupabaseError } from '../config/supabase.js'
import type { Session, Message, Phase, Speaker } from '../types/index.js'

export interface CreateSessionParams {
  userName: string;
}

export async function createSession(params: CreateSessionParams): Promise<Session> {
  const { data, error } = await supabase
    .from('advisor_sessions')
    .insert({
      user_name: params.userName,
      current_phase: 'context',
      total_turns: 0,
      completion_status: 'in_progress',
      conversation_log: [],
    })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Session
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('advisor_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    handleSupabaseError(error)
  }
  return data as Session
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
  const { data, error } = await supabase
    .from('advisor_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Session
}

export interface AddMessageParams {
  sessionId: string;
  turnNumber: number;
  speaker: Speaker;
  messageText: string;
  phase: Phase;
  wasVoice?: boolean;
}

export async function addMessage(params: AddMessageParams): Promise<Message> {
  const { data, error } = await supabase
    .from('advisor_messages')
    .insert({
      session_id: params.sessionId,
      turn_number: params.turnNumber,
      speaker: params.speaker,
      message_text: params.messageText,
      phase: params.phase,
      was_voice: params.wasVoice || false,
    })
    .select()
    .single()

  if (error) handleSupabaseError(error)
  return data as Message
}

export async function getMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('advisor_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true })

  if (error) handleSupabaseError(error)
  return data as Message[]
}
