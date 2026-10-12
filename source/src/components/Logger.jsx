// Workout logger: pick fighter, date, exercises + sets, save.
import { useState } from 'react'
import { todayISO } from '../lib/ratings.js'
import { Card } from './ui.jsx'

export const EXERCISE_LIST = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-Up', 'Dip', 'Incline Bench', 'Barbell Curl', 'Triceps Pushdown',
  'Lateral Raise', 'Leg Press', 'Romanian Deadlift', 'Lat Pulldown',
]

function blankExercise() {
  return { name: EXERCISE_LIST[0], custom: '', sets: [{ reps: '', weight: '' }] }
}

export default function Logger({ profiles, onSave, saving }) {
  const [userIdx, setUserIdx] = useState(0)
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState([blankExercise()])
  const [done, setDone] = useState(null) // { prs }

  const user = profiles[userIdx]
  const color = userIdx === 0 ? 'var(--p1)' : 'var(--p2)'

  const updEx = (i, patch) => setExercises((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const updSet = (ei, si, patch) =>
    setExercises((xs) => xs.map((x, j) => (j === ei ? { ...x, sets: x.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)) } : x)))

  const addSet = (ei) => updEx(ei, { sets: [...exercises[ei].sets, { reps: '', weight: '' }] })
  const dupSet = (ei, si) => {
    const s = exercises[ei].sets[si]
    const sets = [...exercises[ei].sets]
    sets.splice(si + 1, 0, { ...s })
    updEx(ei, { sets })
  }
  const rmSet = (ei, si) => {
    const sets = exercises[ei].sets.filter((_, k) => k !== si)
    updEx(ei, { sets: sets.length ? sets : [{ reps: '', weight: '' }] })
  }
  const rmEx = (i) => setExercises((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : [blankExercise()]))

  const exName = (ex) => (ex.name === '__custom' ? ex.custom.trim() : ex.name)

  const valid = exercises.some((ex) => exName(ex) && ex.sets.some((s) => s.reps && s.weight))

  const save = async () => {
    const payload = exercises
      .map((ex) => ({ name: exName(ex), sets: ex.sets.filter((s) => s.reps && s.weight) }))
      .filter((ex) => ex.name && ex.sets.length)
    if (!payload.length || !user) return
    const res = await onSave({ userId: user.id, date, notes: notes.trim(), exercises: payload })
    setDone({ prs: res.prs, userName: user.name })
    setExercises([blankExercise()])
    setNotes('')
  }

  return (
    <div className="view">
      {done && (
        <div className="card" style={{ borderColor: 'var(--accent2)' }}>
          <div style={{ fontSize: 26, textAlign: 'center' }}>💪</div>
          <div style={{ textAlign: 'center', fontWeight: 800, marginTop: 4 }}>Session logged for {done.userName}!</div>
          {done.prs.length > 0 ? (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              {done.prs.map((p) => <span key={p} className="pr-tag" style={{ fontSize: 12, margin: '2px' }}>🏆 PR · {p}</span>)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>No PRs this time — keep pushing.</div>
          )}
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setDone(null)}>Log another</button>
        </div>
      )}

      <Card title="Who's training?" emoji="👤">
        <div className="user-toggle">
          {profiles.map((p, i) => (
            <button key={p.id} className={userIdx === i ? (i === 0 ? 'on-a' : 'on-b') : ''} onClick={() => setUserIdx(i)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="row2">
          <div className="field" style={{ margin: 0 }}>
            <label>Date</label>
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Push day…" maxLength={80} />
          </div>
        </div>
      </Card>

      {exercises.map((ex, ei) => (
        <div className="ex-block" key={ei}>
          <div className="ex-head">
            <select value={ex.name} onChange={(e) => updEx(ei, { name: e.target.value })}>
              {EXERCISE_LIST.map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="__custom">✏️ Custom…</option>
            </select>
            <button className="x" onClick={() => rmEx(ei)} aria-label="Remove exercise">×</button>
          </div>
          {ex.name === '__custom' && (
            <div className="field">
              <input value={ex.custom} onChange={(e) => updEx(ei, { custom: e.target.value })} placeholder="Exercise name" maxLength={40} />
            </div>
          )}
          <div className="set-row" style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700 }}>
            <span className="n">SET</span><span>REPS</span><span>KG</span><span />
          </div>
          {ex.sets.map((s, si) => (
            <div className="set-row" key={si}>
              <span className="n">{si + 1}</span>
              <input type="number" inputMode="decimal" placeholder="8" value={s.reps} onChange={(e) => updSet(ei, si, { reps: e.target.value })} />
              <input type="number" inputMode="decimal" placeholder="60" value={s.weight} onChange={(e) => updSet(ei, si, { weight: e.target.value })} />
              <button className="dup" onClick={() => dupSet(ei, si)} title="Duplicate set">⧉</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn secondary small" onClick={() => addSet(ei)}>+ Add set</button>
            {ex.sets.length > 1 && <button className="btn ghost small" onClick={() => rmSet(ei, ex.sets.length - 1)}>− Remove last</button>}
          </div>
        </div>
      ))}

      <button className="btn secondary" onClick={() => setExercises([...exercises, blankExercise()])}>+ Add exercise</button>
      <button className="btn" disabled={!valid || saving || !user} onClick={save} style={{ boxShadow: `0 4px 18px ${color}55` }}>
        {saving ? 'Saving…' : `Save session for ${user ? user.name : '…'}`}
      </button>
    </div>
  )
}
