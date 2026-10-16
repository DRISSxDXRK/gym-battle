// Body tab: bodyweight chart per user + weight logging.
import { useState, useMemo } from 'react'
import { todayISO } from '../lib/ratings.js'
import { byUser, latestWeight } from '../lib/stats.js'
import { Card, LineChart } from './ui.jsx'

const P_COLORS = ['#679436', '#427AA1']

function shortDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function BodyTab({ profiles, bodyweight, actions }) {
  const [userIdx, setUserIdx] = useState(0)
  const [bwDate, setBwDate] = useState(todayISO())
  const [bwVal, setBwVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const user = profiles[userIdx]

  const bwSeries = useMemo(() => {
    // merge all dates across users for a shared x-axis
    const dates = [...new Set(bodyweight.map((r) => r.date))].sort()
    return profiles.map((p, i) => ({
      color: P_COLORS[i % 2],
      points: dates.map((d) => {
        const row = byUser(bodyweight, p.id).find((r) => r.date === d)
        return row ? { x: shortDate(d), y: Number(row.weight_kg) } : null
      }).filter(Boolean),
    })).filter((s) => s.points.length > 0)
  }, [profiles, bodyweight])

  const saveBw = async () => {
    if (!user || !bwVal) return
    setSaving(true); setMsg('')
    try {
      await actions.logBodyweight(user.id, bwDate, bwVal)
      setBwVal('')
      setMsg('✅ Weight logged')
    } catch (e) { setMsg('Error: ' + e.message) } finally { setSaving(false) }
  }

  const cur = user ? latestWeight(bodyweight, user.id) : null
  const goalLine = profiles[0]?.goal_weight ? Number(profiles[0].goal_weight) : null

  return (
    <div className="view">
      <Card title="Fighter" emoji="👤">
        <div className="user-toggle">
          {profiles.map((p, i) => (
            <button key={p.id} className={userIdx === i ? (i === 0 ? 'on-a' : 'on-b') : ''} onClick={() => setUserIdx(i)}>
              {p.name}
            </button>
          ))}
        </div>
        {user && (
          <div className="stat-grid">
            <div className="stat-box">
              <div className="v">{cur != null ? `${cur.toFixed(1)}kg` : '—'}</div>
              <div className="l">Current</div>
            </div>
            <div className="stat-box">
              <div className="v">{user.goal_weight ? `${user.goal_weight}kg` : '—'}</div>
              <div className="l">Goal ({user.goal})</div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Bodyweight over time" emoji="⚖️">
        <LineChart series={bwSeries} yLabel={(v) => `${v.toFixed(0)}`} goalLine={goalLine} />
        <div className="chart-legend">
          {profiles.map((p, i) => (
            <span key={p.id}><span className="sw" style={{ background: P_COLORS[i % 2] }} />{p.name}</span>
          ))}
          {goalLine && <span><span className="sw" style={{ background: '#e8a100' }} />{profiles[0].name} goal</span>}
        </div>
        <div className="row2" style={{ marginTop: 12 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Date</label>
            <input type="date" value={bwDate} max={todayISO()} onChange={(e) => setBwDate(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Weight (kg)</label>
            <input type="number" inputMode="decimal" placeholder="61.5" value={bwVal} onChange={(e) => setBwVal(e.target.value)} />
          </div>
        </div>
        <button className="btn small" style={{ marginTop: 10 }} disabled={saving || !bwVal} onClick={saveBw}>
          {saving ? 'Saving…' : 'Log weight'}
        </button>
      </Card>

      {msg && <div className="notice">{msg}</div>}
    </div>
  )
}
