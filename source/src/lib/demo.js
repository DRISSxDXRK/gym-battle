// Demo data generator — used when Supabase is not configured, so Driss can
// preview the whole app. Dates are generated relative to today so the demo
// never looks stale.
import { todayISO, mondayOf } from './ratings.js'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

function isoOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mkSession(userId, date, notes, exercises, prExercises = []) {
  const id = uid()
  let setNo = 0
  const sets = []
  for (const ex of exercises) {
    ex.sets.forEach(([reps, weight], i) => {
      sets.push({
        id: uid(),
        session_id: id,
        exercise: ex.name,
        set_no: i + 1,
        reps,
        weight_kg: weight,
        is_pr: prExercises.includes(ex.name) && i === ex.sets.length - 1,
      })
      setNo++
    })
  }
  return { id, user_id: userId, date, notes, sets, created_at: date + 'T18:00:00Z', prs: prExercises }
}

export function buildDemoData() {
  const today = todayISO()
  const driss = {
    id: uid(), name: 'Driss', elo: 1199,
    goal: 'gain', goal_weight: 70, calorie_target: 3200,
    start_weight: 61, created_at: today,
  }
  const younes = {
    id: uid(), name: 'Younes', elo: 1201,
    goal: 'gain', goal_weight: 80, calorie_target: 3000,
    start_weight: 74.5, created_at: today,
  }
  const D = driss.id, Y = younes.id

  const sessions = [
    // --- this week (Mon = today) ---
    mkSession(D, today, 'Push day — felt strong', [
      { name: 'Bench Press', sets: [[8, 42.5], [8, 42.5], [7, 42.5]] },
      { name: 'Overhead Press', sets: [[8, 30], [8, 30], [6, 32.5]] },
      { name: 'Incline Dumbbell Press', sets: [[10, 20], [10, 20]] },
      { name: 'Triceps Pushdown', sets: [[12, 25], [12, 27.5]] },
      { name: 'Lateral Raise', sets: [[14, 8], [12, 8]] },
    ], ['Bench Press']),
    mkSession(Y, today, 'Push', [
      { name: 'Bench Press', sets: [[8, 60], [6, 62.5], [6, 62.5]] },
      { name: 'Overhead Press', sets: [[8, 40], [7, 40]] },
      { name: 'Dip', sets: [[10, 75], [8, 75]] },
      { name: 'Triceps Pushdown', sets: [[12, 32.5], [10, 35]] },
    ]),
    // --- last week ---
    mkSession(D, isoOffset(-6), 'Pull day', [
      { name: 'Barbell Row', sets: [[10, 45], [10, 47.5], [8, 47.5]] },
      { name: 'Pull-Up', sets: [[8, 61], [7, 61], [6, 61]] },
      { name: 'Lat Pulldown', sets: [[10, 55], [10, 57.5]] },
      { name: 'Barbell Curl', sets: [[10, 25], [10, 27.5]] },
    ]),
    mkSession(Y, isoOffset(-6), 'Pull', [
      { name: 'Barbell Row', sets: [[8, 60], [8, 62.5]] },
      { name: 'Pull-Up', sets: [[10, 75], [8, 75]] },
      { name: 'Barbell Curl', sets: [[10, 30], [8, 32.5]] },
    ], ['Barbell Row']),
    mkSession(D, isoOffset(-4), 'Legs', [
      { name: 'Squat', sets: [[8, 60], [8, 62.5], [6, 65]] },
      { name: 'Romanian Deadlift', sets: [[10, 70], [10, 72.5]] },
      { name: 'Leg Press', sets: [[12, 100], [10, 110]] },
    ], ['Squat']),
    mkSession(Y, isoOffset(-3), 'Legs', [
      { name: 'Squat', sets: [[8, 80], [6, 85], [5, 87.5]] },
      { name: 'Romanian Deadlift', sets: [[10, 90], [8, 95]] },
    ], ['Squat']),
    mkSession(D, isoOffset(-2), 'Push', [
      { name: 'Bench Press', sets: [[8, 40], [8, 40], [8, 42.5]] },
      { name: 'Overhead Press', sets: [[8, 27.5], [8, 30]] },
      { name: 'Dip', sets: [[10, 61], [8, 61]] },
    ]),
    // --- two weeks ago ---
    mkSession(D, isoOffset(-13), 'Full body', [
      { name: 'Bench Press', sets: [[8, 37.5], [8, 40]] },
      { name: 'Squat', sets: [[8, 55], [8, 60]] },
      { name: 'Barbell Row', sets: [[10, 42.5], [10, 45]] },
    ]),
    mkSession(Y, isoOffset(-12), 'Full body', [
      { name: 'Bench Press', sets: [[8, 55], [8, 57.5]] },
      { name: 'Deadlift', sets: [[5, 110], [5, 115]] },
      { name: 'Overhead Press', sets: [[8, 37.5], [8, 37.5]] },
    ], ['Deadlift']),
    mkSession(D, isoOffset(-9), 'Pull', [
      { name: 'Deadlift', sets: [[5, 80], [5, 85]] },
      { name: 'Pull-Up', sets: [[7, 61], [6, 61]] },
      { name: 'Barbell Curl', sets: [[10, 22.5], [10, 25]] },
    ], ['Deadlift']),
  ]

  const bodyweight = [
    { id: uid(), user_id: D, date: isoOffset(-20), weight_kg: 61.0 },
    { id: uid(), user_id: D, date: isoOffset(-13), weight_kg: 61.4 },
    { id: uid(), user_id: D, date: isoOffset(-6), weight_kg: 61.6 },
    { id: uid(), user_id: D, date: isoOffset(-2), weight_kg: 61.9 },
    { id: uid(), user_id: D, date: today, weight_kg: 62.1 },
    { id: uid(), user_id: Y, date: isoOffset(-20), weight_kg: 74.5 },
    { id: uid(), user_id: Y, date: isoOffset(-13), weight_kg: 74.8 },
    { id: uid(), user_id: Y, date: isoOffset(-6), weight_kg: 75.1 },
    { id: uid(), user_id: Y, date: today, weight_kg: 75.0 },
  ]

  const calories = [
    { id: uid(), user_id: D, date: isoOffset(-2), calories: 3250, target: 3200 },
    { id: uid(), user_id: D, date: isoOffset(-1), calories: 2900, target: 3200 },
    { id: uid(), user_id: D, date: today, calories: 3100, target: 3200 },
    { id: uid(), user_id: Y, date: isoOffset(-2), calories: 3050, target: 3000 },
    { id: uid(), user_id: Y, date: isoOffset(-1), calories: 3100, target: 3000 },
    { id: uid(), user_id: Y, date: today, calories: 2800, target: 3000 },
  ]

  const w1 = mondayOf(isoOffset(-14))
  const w2 = mondayOf(isoOffset(-7))
  const eloHistory = [
    { id: uid(), user_id: D, week_start: w1, elo_before: 1200, elo_after: 1216, week_points: 486 },
    { id: uid(), user_id: Y, week_start: w1, elo_before: 1200, elo_after: 1184, week_points: 402 },
    { id: uid(), user_id: D, week_start: w2, elo_before: 1216, elo_after: 1199, week_points: 445 },
    { id: uid(), user_id: Y, week_start: w2, elo_before: 1184, elo_after: 1201, week_points: 512 },
  ]

  return { profiles: [driss, younes], sessions, bodyweight, calories, eloHistory }
}
