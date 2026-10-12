// First-visit setup: two fighters, goals, starting stats. Seeds both at 1200 ELO.
import { useState } from 'react'

const GOALS = [
  { v: 'gain', label: '📈 Gain' },
  { v: 'lose', label: '📉 Lose' },
  { v: 'maintain', label: '⚖️ Maintain' },
]

function PersonForm({ title, color, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <div className="person-card" style={{ borderTop: `3px solid ${color}` }}>
      <h4>{title}</h4>
      <div className="field">
        <label>Name</label>
        <input value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="Name" maxLength={20} />
      </div>
      <div className="row2">
        <div className="field">
          <label>Goal</label>
          <select value={value.goal} onChange={(e) => set('goal', e.target.value)}>
            {GOALS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Target weight (kg)</label>
          <input type="number" inputMode="decimal" value={value.goal_weight} onChange={(e) => set('goal_weight', e.target.value)} placeholder="70" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label>Current weight (kg)</label>
          <input type="number" inputMode="decimal" value={value.start_weight} onChange={(e) => set('start_weight', e.target.value)} placeholder="61" />
        </div>
        <div className="field">
          <label>Daily calories target</label>
          <input type="number" inputMode="numeric" value={value.calorie_target} onChange={(e) => set('calorie_target', e.target.value)} placeholder="3200" />
        </div>
      </div>
    </div>
  )
}

export default function Onboarding({ onDone, saving }) {
  const [a, setA] = useState({ name: 'Driss', goal: 'gain', goal_weight: '70', start_weight: '61', calorie_target: '3200' })
  const [b, setB] = useState({ name: 'Younes', goal: 'gain', goal_weight: '', start_weight: '', calorie_target: '3000' })
  const [err, setErr] = useState('')

  const submit = () => {
    if (!a.name.trim() || !b.name.trim()) { setErr('Both fighters need a name.'); return }
    if (a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) { setErr('Names must be different.'); return }
    setErr('')
    onDone([
      { name: a.name.trim(), goal: a.goal, goal_weight: Number(a.goal_weight) || null, start_weight: Number(a.start_weight) || null, calorie_target: Number(a.calorie_target) || null },
      { name: b.name.trim(), goal: b.goal, goal_weight: Number(b.goal_weight) || null, start_weight: Number(b.start_weight) || null, calorie_target: Number(b.calorie_target) || null },
    ])
  }

  return (
    <div className="onboard">
      <div className="hero">
        <div className="big">🥊</div>
        <h2>Gym Battle</h2>
        <p>Two lifters. One winner. Weekly ELO battles, strength ranks, session MVPs.</p>
      </div>
      <PersonForm title="Fighter 1" color="#ff2e63" value={a} onChange={setA} />
      <PersonForm title="Fighter 2" color="#3da9ff" value={b} onChange={setB} />
      {err && <div className="warn" style={{ marginBottom: 12 }}>{err}</div>}
      <button className="btn" onClick={submit} disabled={saving}>{saving ? 'Setting up…' : 'Start the battle ⚔️'}</button>
      <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
        Both start at 1200 ELO. Battles run Monday–Sunday.
      </p>
    </div>
  )
}
