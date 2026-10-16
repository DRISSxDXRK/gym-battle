// Derived stats from raw data. Pure functions — used by all views.
import {
  epley1RM, setRating, overallRating, tierFor, sessionScore, sessionVolume,
  mondayOf, inWeek, weekPoints, currentStreak, thisWeekMonday, fmtDate,
} from './ratings.js'

export const byUser = (rows, userId, key = 'user_id') =>
  rows.filter((r) => r[key] === userId)

export function latestWeight(bodyweight, userId, beforeDate = null) {
  const rows = byUser(bodyweight, userId)
    .filter((r) => !beforeDate || r.date <= beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
  return rows.length ? Number(rows[0].weight_kg) : null
}

export function weightAt(bodyweight, userId, date, fallback) {
  return latestWeight(bodyweight, userId, date) ?? latestWeight(bodyweight, userId) ?? fallback ?? 70
}

// Best set-rating per exercise for a user (rating computed with bodyweight
// at the time of each session).
export function exerciseBests(sessions, bodyweight, userId, startWeight) {
  const best = {}
  for (const s of byUser(sessions, userId)) {
    const bw = weightAt(bodyweight, userId, s.date, startWeight)
    for (const set of s.sets || []) {
      const r = setRating(Number(set.weight_kg), Number(set.reps), bw)
      if (!best[set.exercise] || r > best[set.exercise].rating) {
        best[set.exercise] = { rating: r, est1RM: epley1RM(Number(set.weight_kg), Number(set.reps)), weight: Number(set.weight_kg), reps: Number(set.reps), date: s.date }
      }
    }
  }
  return best
}

export function userOverall(sessions, bodyweight, profile) {
  const best = exerciseBests(sessions, bodyweight, profile.id, profile.start_weight)
  const ratings = {}
  for (const [ex, b] of Object.entries(best)) ratings[ex] = b.rating
  const value = overallRating(ratings)
  return { value, tier: tierFor(value), best, top3: Object.entries(best).sort((a, b) => b[1].rating - a[1].rating).slice(0, 3) }
}

export function sessionScoreOf(session, bw) {
  const ratings = (session.sets || []).map((s) => setRating(Number(s.weight_kg), Number(s.reps), bw))
  return sessionScore(ratings)
}

// MVP: when both users logged a session on the same date, higher score wins.
export function mvpForDate(sessions, bodyweight, profiles, date) {
  const day = sessions.filter((s) => s.date === date)
  const byU = {}
  for (const p of profiles) {
    const s = day.filter((x) => x.user_id === p.id)
    if (s.length) byU[p.id] = s
  }
  const ids = Object.keys(byU)
  if (ids.length < 2) return null
  let winner = null, best = -1
  for (const id of ids) {
    const p = profiles.find((x) => x.id === id)
    const bw = weightAt(bodyweight, id, date, p?.start_weight)
    const score = Math.max(...byU[id].map((s) => sessionScoreOf(s, bw)))
    if (score > best) { best = score; winner = id }
  }
  return { userId: winner, score: best }
}

// Recent PRs: all-time best set per exercise, if set within the last N days.
export function recentPRs(sessions, bodyweight, profile, days = 30) {
  const best = exerciseBests(sessions, bodyweight, profile.id, profile.start_weight)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cut = cutoff.toISOString().slice(0, 10)
  return Object.entries(best)
    .filter(([, b]) => b.date >= cut)
    .map(([exercise, b]) => ({ exercise, ...b, userId: profile.id, userName: profile.name }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// Weekly battle inputs + points for one user.
export function userWeekPoints(profile, sessions, bodyweight, weekStart) {
  const mySessions = byUser(sessions, profile.id).filter((s) => inWeek(s.date, weekStart))
  // PRs this week: exercises whose best est-1RM happened this week AND
  // beat the pre-week best.
  const preWeek = byUser(sessions, profile.id).filter((s) => s.date < weekStart)
  const preBest = {}
  for (const s of preWeek) {
    for (const set of s.sets || []) {
      const e = epley1RM(Number(set.weight_kg), Number(set.reps))
      if (!preBest[set.exercise] || e > preBest[set.exercise]) preBest[set.exercise] = e
    }
  }
  const prs = []
  for (const s of mySessions) {
    for (const set of s.sets || []) {
      const e = epley1RM(Number(set.weight_kg), Number(set.reps))
      if (e > (preBest[set.exercise] || 0)) {
        prs.push(set.exercise)
        preBest[set.exercise] = e
      }
    }
  }
  const bwRows = byUser(bodyweight, profile.id).filter((r) => inWeek(r.date, weekStart)).sort((a, b) => (a.date < b.date ? 1 : -1))
  const bwEnd = bwRows.length ? Number(bwRows[0].weight_kg) : null
  const bwBefore = byUser(bodyweight, profile.id).filter((r) => r.date < weekStart).sort((a, b) => (a.date < b.date ? 1 : -1))
  const bwStart = bwBefore.length ? Number(bwBefore[0].weight_kg) : null
  const points = weekPoints({
    sessions: mySessions.map((s) => ({ ...s, prs })),
    weekStart,
    bwStart, bwEnd,
    goal: profile.goal || 'maintain',
  })
  return { points, sessions: mySessions.length, prs: [...new Set(prs)] }
}

export function headToHead(profiles, sessions, bodyweight, eloHistory) {
  const ref = thisWeekMonday()
  return profiles.map((p) => {
    const my = byUser(sessions, p.id)
    const vol = my.reduce((s, x) => s + sessionVolume(x.sets || []), 0)
    const weeksWon = byUser(eloHistory, p.id).filter((h) => h.elo_after > h.elo_before).length
    return {
      profile: p,
      totalSessions: my.length,
      totalVolume: Math.round(vol),
      weeksWon,
      streak: currentStreak(my.map((s) => s.date), ref),
    }
  })
}

export { fmtDate, mondayOf, inWeek, thisWeekMonday }
