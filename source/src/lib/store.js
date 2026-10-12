// Data layer: Supabase when configured, local demo data otherwise.
// The UI never cares which — it just uses the hook below.
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from '../config.js'
import { buildDemoData } from './demo.js'
import { epley1RM, eloUpdate } from './ratings.js'
import { userWeekPoints } from './stats.js'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

let supabase = null
if (isSupabaseConfigured()) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export const DATA_MODE = isSupabaseConfigured() ? 'supabase' : 'demo'

function attachSets(sessions, sets) {
  const bySession = {}
  for (const s of sets) {
    ;(bySession[s.session_id] = bySession[s.session_id] || []).push(s)
  }
  return sessions.map((s) => ({ ...s, sets: (bySession[s.id] || []).sort((a, b) => a.set_no - b.set_no) }))
}

async function loadFromSupabase() {
  const [p, s, st, bw, cal, elo] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('sessions').select('*').order('date', { ascending: false }),
    supabase.from('sets').select('*'),
    supabase.from('bodyweight_logs').select('*').order('date'),
    supabase.from('calorie_logs').select('*').order('date'),
    supabase.from('elo_history').select('*').order('week_start'),
  ])
  for (const r of [p, s, st, bw, cal, elo]) {
    if (r.error) throw new Error(r.error.message)
  }
  return {
    profiles: p.data,
    sessions: attachSets(s.data, st.data),
    bodyweight: bw.data,
    calories: cal.data,
    eloHistory: elo.data,
  }
}

// PRs for a batch of new sets vs existing history (est 1RM comparison).
function detectPRs(newExercises, existingSessions, userId) {
  const priorBest = {}
  for (const s of existingSessions) {
    if (s.user_id !== userId) continue
    for (const set of s.sets || []) {
      const e = epley1RM(Number(set.weight_kg), Number(set.reps))
      if (!priorBest[set.exercise] || e > priorBest[set.exercise]) priorBest[set.exercise] = e
    }
  }
  const prs = []
  const seenBest = { ...priorBest }
  for (const ex of newExercises) {
    for (const set of ex.sets) {
      const e = epley1RM(Number(set.weight), Number(set.reps))
      if (e > (seenBest[ex.name] || 0)) {
        if (!prs.includes(ex.name)) prs.push(ex.name)
        seenBest[ex.name] = e
      }
    }
  }
  return prs
}

export function useGymData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({ profiles: [], sessions: [], bodyweight: [], calories: [], eloHistory: [] })
  const dataRef = useRef(data)
  dataRef.current = data

  const reload = useCallback(async () => {
    try {
      if (DATA_MODE === 'supabase') {
        setData(await loadFromSupabase())
      } else {
        setData(buildDemoData())
      }
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    if (DATA_MODE !== 'supabase') return
    const ch = supabase
      .channel('gym-battle-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sets' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bodyweight_logs' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calorie_logs' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elo_history' }, reload)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [reload])

  // ---- actions ----

  const setupProfiles = useCallback(async (people) => {
    // people: [{ name, goal, goal_weight, start_weight, calorie_target }]
    if (DATA_MODE === 'supabase') {
      const rows = people.map((p) => ({
        name: p.name, elo: 1200, goal: p.goal,
        goal_weight: p.goal_weight || null, calorie_target: p.calorie_target || null,
        start_weight: p.start_weight || null,
      }))
      const { data: inserted, error } = await supabase.from('profiles').insert(rows).select()
      if (error) throw new Error(error.message)
      const today = new Date().toISOString().slice(0, 10)
      // inserted order matches input order
      const bw = inserted.map((pr, i) =>
        people[i].start_weight ? { user_id: pr.id, date: today, weight_kg: people[i].start_weight } : null
      ).filter(Boolean)
      if (bw.length) {
        const { error: e2 } = await supabase.from('bodyweight_logs').upsert(bw, { onConflict: 'user_id,date' })
        if (e2) throw new Error(e2.message)
      }
      await reload()
      return inserted
    }
    // demo mode: profiles are pre-seeded; nothing to do
    return dataRef.current.profiles
  }, [reload])

  const logSession = useCallback(async ({ userId, date, notes, exercises }) => {
    // exercises: [{ name, sets: [{ reps, weight }] }]
    const prs = detectPRs(exercises, dataRef.current.sessions, userId)
    if (DATA_MODE === 'supabase') {
      const { data: sess, error } = await supabase
        .from('sessions').insert({ user_id: userId, date, notes: notes || null }).select().single()
      if (error) throw new Error(error.message)
      const setRows = []
      exercises.forEach((ex) => {
        ex.sets.forEach((st, i) => {
          if (!st.reps || !st.weight) return
          setRows.push({ session_id: sess.id, exercise: ex.name, set_no: i + 1, reps: Number(st.reps), weight_kg: Number(st.weight) })
        })
      })
      if (setRows.length) {
        const { error: e2 } = await supabase.from('sets').insert(setRows)
        if (e2) throw new Error(e2.message)
      }
      await reload()
      return { sessionId: sess.id, prs }
    }
    const id = uid()
    const sets = []
    exercises.forEach((ex) => {
      ex.sets.forEach((st, i) => {
        if (!st.reps || !st.weight) return
        sets.push({ id: uid(), session_id: id, exercise: ex.name, set_no: i + 1, reps: Number(st.reps), weight_kg: Number(st.weight) })
      })
    })
    const session = { id, user_id: userId, date, notes: notes || '', sets, prs, created_at: new Date().toISOString() }
    setData((d) => ({ ...d, sessions: [session, ...d.sessions] }))
    return { sessionId: id, prs }
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    if (DATA_MODE === 'supabase') {
      await supabase.from('sets').delete().eq('session_id', sessionId)
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw new Error(error.message)
      await reload()
      return
    }
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== sessionId) }))
  }, [reload])

  const logBodyweight = useCallback(async (userId, date, weight) => {
    if (DATA_MODE === 'supabase') {
      const { error } = await supabase.from('bodyweight_logs')
        .upsert({ user_id: userId, date, weight_kg: Number(weight) }, { onConflict: 'user_id,date' })
      if (error) throw new Error(error.message)
      await reload()
      return
    }
    setData((d) => {
      const rest = d.bodyweight.filter((r) => !(r.user_id === userId && r.date === date))
      return { ...d, bodyweight: [...rest, { id: uid(), user_id: userId, date, weight_kg: Number(weight) }] }
    })
  }, [reload])

  const logCalories = useCallback(async (userId, date, calories) => {
    if (DATA_MODE === 'supabase') {
      const profile = dataRef.current.profiles.find((p) => p.id === userId)
      const { error } = await supabase.from('calorie_logs')
        .upsert({ user_id: userId, date, calories: Number(calories), target: profile?.calorie_target || 0 }, { onConflict: 'user_id,date' })
      if (error) throw new Error(error.message)
      await reload()
      return
    }
    setData((d) => {
      const rest = d.calories.filter((r) => !(r.user_id === userId && r.date === date))
      const profile = d.profiles.find((p) => p.id === userId)
      return { ...d, calories: [...rest, { id: uid(), user_id: userId, date, calories: Number(calories), target: profile?.calorie_target || 0 }] }
    })
  }, [reload])

  const settleWeek = useCallback(async (weekStart) => {
    const d = dataRef.current
    if (d.profiles.length !== 2) throw new Error('Need exactly 2 profiles to settle a week')
    const [a, b] = d.profiles
    const pa = userWeekPoints(a, d.sessions, d.bodyweight, d.calories, weekStart)
    const pb = userWeekPoints(b, d.sessions, d.bodyweight, d.calories, weekStart)
    let scoreA = 0.5
    if (pa.points > pb.points) scoreA = 1
    else if (pb.points > pa.points) scoreA = 0
    const { a: newA, b: newB } = eloUpdate(a.elo, b.elo, scoreA)
    const rows = [
      { user_id: a.id, week_start: weekStart, elo_before: a.elo, elo_after: newA, week_points: pa.points },
      { user_id: b.id, week_start: weekStart, elo_before: b.elo, elo_after: newB, week_points: pb.points },
    ]
    if (DATA_MODE === 'supabase') {
      const { error: e1 } = await supabase.from('elo_history').insert(rows)
      if (e1) throw new Error(e1.message)
      const { error: e2 } = await supabase.from('profiles').update({ elo: newA }).eq('id', a.id)
      if (e2) throw new Error(e2.message)
      const { error: e3 } = await supabase.from('profiles').update({ elo: newB }).eq('id', b.id)
      if (e3) throw new Error(e3.message)
      await reload()
    } else {
      setData((dd) => ({
        ...dd,
        eloHistory: [...dd.eloHistory, ...rows.map((r) => ({ ...r, id: uid() }))],
        profiles: dd.profiles.map((p) => p.id === a.id ? { ...p, elo: newA } : p.id === b.id ? { ...p, elo: newB } : p),
      }))
    }
    return { winner: scoreA === 1 ? a : scoreA === 0 ? b : null, pa, pb, newA, newB }
  }, [reload])

  return {
    mode: DATA_MODE, loading, error,
    profiles: data.profiles, sessions: data.sessions,
    bodyweight: data.bodyweight, calories: data.calories, eloHistory: data.eloHistory,
    actions: { setupProfiles, logSession, deleteSession, logBodyweight, logCalories, settleWeek, refresh: reload },
  }
}
