// Ranks tab: full tier ladder, ELO history chart, head-to-head stats,
// per-exercise strength ratings.
import { useMemo } from 'react'
import { RATING_TIERS, tierFor } from '../lib/ratings.js'
import { userOverall, headToHead, byUser, weightAt, sessionScoreOf } from '../lib/stats.js'
import { Card, TierBadge, LineChart, Ladder } from './ui.jsx'

const P_COLORS = ['#ff2e63', '#3da9ff']

function shortDate(iso) {
  const d = new Date(iso + 'T12:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function Ranks({ profiles, sessions, bodyweight, eloHistory }) {
  const overalls = useMemo(() => profiles.map((p) => ({ profile: p, ...userOverall(sessions, bodyweight, p) })), [profiles, sessions, bodyweight])
  const h2h = useMemo(() => headToHead(profiles, sessions, bodyweight, eloHistory), [profiles, sessions, bodyweight, eloHistory])

  const eloSeries = useMemo(() => profiles.map((p, i) => {
    const rows = byUser(eloHistory, p.id).sort((a, b) => (a.week_start < b.week_start ? -1 : 1))
    const pts = rows.map((r) => ({ x: shortDate(r.week_start), y: r.elo_after }))
    // pin current elo at the end
    pts.push({ x: 'now', y: p.elo })
    return { color: P_COLORS[i % 2], points: pts }
  }), [profiles, eloHistory])

  return (
    <div className="view">
      <Card title="Head to head" emoji="📊">
        <div className="stat-grid">
          <div className="stat-box">
            <div className="v" style={{ color: P_COLORS[0] }}>{h2h[0]?.weeksWon ?? 0} – {h2h[1]?.weeksWon ?? 0}</div>
            <div className="l">Weeks won ({profiles[0]?.name} – {profiles[1]?.name})</div>
          </div>
          <div className="stat-box">
            <div className="v">{h2h[0]?.totalSessions ?? 0} – {h2h[1]?.totalSessions ?? 0}</div>
            <div className="l">Total sessions</div>
          </div>
          <div className="stat-box">
            <div className="v">{((h2h[0]?.totalVolume ?? 0) / 1000).toFixed(1)}t – {((h2h[1]?.totalVolume ?? 0) / 1000).toFixed(1)}t</div>
            <div className="l">Total volume lifted</div>
          </div>
          <div className="stat-box">
            <div className="v"><span className="streak">🔥</span> {h2h[0]?.streak ?? 0} – {h2h[1]?.streak ?? 0}</div>
            <div className="l">Week streaks</div>
          </div>
        </div>
      </Card>

      <Card title="ELO history" emoji="📈">
        <LineChart series={eloSeries} yLabel={(v) => `${Math.round(v)}`} />
        <div className="chart-legend">
          {profiles.map((p, i) => (
            <span key={p.id}><span className="sw" style={{ background: P_COLORS[i % 2] }} />{p.name} ({p.elo})</span>
          ))}
        </div>
      </Card>

      {overalls.map((o, i) => (
        <Card key={o.profile.id} title={`${o.profile.name} — strength ratings`} emoji={i === 0 ? '🔴' : '🔵'}>
          <div style={{ marginBottom: 10 }}>
            <TierBadge tier={o.tier} rating={o.value} />
            <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>avg of top-3 lifts</span>
          </div>
          {o.top3.length === 0 && <div className="empty">Log a session to get ranked.</div>}
          {o.top3.map(([ex, b]) => (
            <ExerciseRow key={ex} ex={ex} b={b} />
          ))}
          {Object.keys(o.best).length > 3 && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
              +{Object.keys(o.best).length - 3} more lifts tracked
            </div>
          )}
        </Card>
      ))}

      <Card title="The ladder" emoji="🪜">
        {overalls.map((o) => (
          <div key={o.profile.id} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 6, color: P_COLORS[profiles.indexOf(o.profile) % 2] }}>
              {o.profile.name} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>— {Math.round(o.value)}</span>
            </div>
            <Ladder highlightTier={o.tier.name} />
          </div>
        ))}
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
          Rating = estimated 1RM ÷ bodyweight × 100, per lift. Overall = average of your 3 best lifts.
        </div>
      </Card>
    </div>
  )
}

function ExerciseRow({ ex, b }) {
  const tier = tierFor(b.rating)
  return (
    <div className="feed-item">
      <span className="dot" style={{ width: 10, height: 10, borderRadius: '50%', background: tier.color, boxShadow: `0 0 8px ${tier.glow}`, flexShrink: 0, marginTop: 6 }} />
      <div className="fi-body">
        <div className="fi-title">{ex} <span style={{ color: tier.color, fontSize: 12 }}>· {tier.name}</span></div>
        <div className="fi-sub">best {b.weight}kg × {b.reps} → est. 1RM {b.est1RM.toFixed(1)}kg</div>
      </div>
      <span className="fi-score">{Math.round(b.rating)}</span>
    </div>
  )
}
