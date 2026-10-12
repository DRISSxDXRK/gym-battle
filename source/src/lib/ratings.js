// Strength rating + ELO math for Gym Battle.
// Liftoff-style relative-strength rating with a 9-tier ladder,
// CS2-style session ratings, and weekly-battle ELO (K=32).

// Epley estimated 1RM
export const epley1RM = (weightKg, reps) => weightKg * (1 + reps / 30)

// Per-set rating: relative strength x 100
export const setRating = (weightKg, reps, bodyweightKg) => {
  if (!weightKg || !reps || !bodyweightKg || bodyweightKg <= 0) return 0
  return (epley1RM(weightKg, reps) / bodyweightKg) * 100
}

export const RATING_TIERS = [
  { name: 'Wood',     min: 0,   color: '#a0714f', glow: 'rgba(160,113,79,.35)' },
  { name: 'Bronze',   min: 40,  color: '#d08a4e', glow: 'rgba(208,138,78,.35)' },
  { name: 'Silver',   min: 70,  color: '#c7cdd6', glow: 'rgba(199,205,214,.35)' },
  { name: 'Gold',     min: 100, color: '#ffd34d', glow: 'rgba(255,211,77,.40)' },
  { name: 'Platinum', min: 130, color: '#6fe3e8', glow: 'rgba(111,227,232,.40)' },
  { name: 'Diamond',  min: 160, color: '#c99cff', glow: 'rgba(201,156,255,.45)' },
  { name: 'Champion', min: 190, color: '#ff7a3d', glow: 'rgba(255,122,61,.45)' },
  { name: 'Titan',    min: 220, color: '#b15cff', glow: 'rgba(177,92,255,.50)' },
  { name: 'Olympian', min: 250, color: '#ff2e63', glow: 'rgba(255,46,99,.55)' },
]

export function tierFor(rating) {
  let tier = RATING_TIERS[0]
  for (const t of RATING_TIERS) {
    if (rating >= t.min) tier = t
    else break
  }
  return tier
}

// A user's overall rank = average of their top-3 exercise ratings.
// exerciseBest: { [exercise]: bestSetRating }
export function overallRating(exerciseBest) {
  const vals = Object.values(exerciseBest).sort((a, b) => b - a).slice(0, 3)
  if (vals.length === 0) return 0
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

// Session score ("Session Rating", CS2-style): sum of set ratings / 100
export const sessionScore = (setRatings) =>
  setRatings.reduce((s, r) => s + r, 0) / 100

// Total volume lifted in a session (kg)
export const sessionVolume = (sets) =>
  sets.reduce((s, x) => s + (Number(x.weight_kg) || 0) * (Number(x.reps) || 0), 0)

// ---- Week helpers (Mon–Sun) ----
export function mondayOf(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = (d.getDay() + 6) % 7 // Mon=0
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function weekRange(weekStart) {
  const s = new Date(weekStart + 'T12:00:00')
  const e = new Date(s)
  e.setDate(e.getDate() + 6)
  return { start: weekStart, end: e.toISOString().slice(0, 10) }
}

export function thisWeekMonday() {
  const now = new Date()
  const iso = now.toISOString().slice(0, 10)
  return mondayOf(iso)
}

export function inWeek(dateStr, weekStart) {
  const { start, end } = weekRange(weekStart)
  return dateStr >= start && dateStr <= end
}

// ---- Weekly battle points ----
// points = 100/session + 1 per 100kg volume + 50 per PR (per exercise, first of week)
//        + 25 per day calories >= target + 100 if week-end weight moved toward goal
export function weekPoints({
  sessions,      // [{ date, sets:[{weight_kg,reps}], prs:[exercise...] }]
  calorieDays,   // [{ date, calories, target }]
  weekStart,     // monday date string
  bwStart,       // number|null (week-start weight)
  bwEnd,         // number|null (week-end weight)
  goal,          // 'gain' | 'lose' | 'maintain'
}) {
  let pts = 0
  pts += sessions.length * 100
  const prExercises = new Set()
  for (const s of sessions) {
    const vol = sessionVolume(s.sets || [])
    pts += Math.floor(vol / 100)
    for (const ex of (s.prs || [])) {
      if (!prExercises.has(ex)) { prExercises.add(ex); pts += 50 }
    }
  }
  const seenDays = new Set()
  for (const d of calorieDays) {
    if (!inWeek(d.date, weekStart)) continue
    if (seenDays.has(d.date)) continue
    seenDays.add(d.date)
    if (d.target > 0 && d.calories >= d.target) pts += 25
  }
  if (bwStart != null && bwEnd != null) {
    const toward =
      goal === 'gain' ? bwEnd > bwStart :
      goal === 'lose' ? bwEnd < bwStart :
      Math.abs(bwEnd - bwStart) <= 0.5
    if (toward) pts += 100
  }
  return pts
}

// ---- ELO (standard, K=32) ----
export const ELO_K = 32

export function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400))
}

// Returns { a: newA, b: newB }. scoreA: 1 = A wins, 0.5 = tie, 0 = A loses.
export function eloUpdate(ra, rb, scoreA) {
  const ea = expectedScore(ra, rb)
  return {
    a: Math.round(ra + ELO_K * (scoreA - ea)),
    b: Math.round(rb + ELO_K * ((1 - scoreA) - (1 - ea))),
  }
}

// ---- Streaks: consecutive weeks (Mon-Sun) with >= 1 session ----
export function currentStreak(sessionDates, refMonday) {
  const weeks = new Set(sessionDates.map(mondayOf))
  let streak = 0
  let cursor = refMonday
  // allow the current week to be empty without breaking the streak
  if (!weeks.has(cursor)) {
    const d = new Date(cursor + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    cursor = d.toISOString().slice(0, 10)
  }
  for (;;) {
    if (weeks.has(cursor)) {
      streak++
      const d = new Date(cursor + 'T12:00:00')
      d.setDate(d.getDate() - 7)
      cursor = d.toISOString().slice(0, 10)
    } else break
    if (streak > 520) break // sanity
  }
  return streak
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
