// Shared UI primitives: tier badges, cards, tiny SVG charts.
import { RATING_TIERS } from '../lib/ratings.js'

export function TierBadge({ tier, rating }) {
  return (
    <span className="tier-badge" style={{ color: tier.color, borderColor: tier.color, boxShadow: `0 0 12px ${tier.glow}` }}>
      {tier.name}{rating != null ? ` · ${Math.round(rating)}` : ''}
    </span>
  )
}

export function Card({ title, emoji, children, action }) {
  return (
    <div className="card">
      <h3>
        <span>{title}</span>
        {action}
      </h3>
      {children}
    </div>
  )
}

// Simple SVG line chart. series: [{ color, dashed?, points: [{x: label, y}] }]
// yLabel formats the y axis values. Styled for light cards.
export function LineChart({ series, height = 180, yLabel = (v) => v, goalLine = null }) {
  const W = 340, H = height, PAD = { l: 34, r: 8, t: 10, b: 22 }
  const GRID = '#d5e2ec', AXIS = '#5d7684'
  const allY = []
  series.forEach((s) => s.points.forEach((p) => allY.push(p.y)))
  if (goalLine != null) allY.push(goalLine)
  if (!allY.length) return <div className="empty">No data yet</div>
  let min = Math.min(...allY), max = Math.max(...allY)
  if (max - min < 1e-6) { max += 1; min -= 1 }
  const span = max - min
  min -= span * 0.15; max += span * 0.15
  const X = (i, n) => n <= 1 ? PAD.l : PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
  const Y = (v) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b)
  const tickVals = [min + (max - min) * 0.1, min + (max - min) * 0.5, min + (max - min) * 0.9]
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {tickVals.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} stroke={GRID} strokeWidth="1" />
            <text x={PAD.l - 4} y={Y(t) + 3.5} textAnchor="end" fontSize="9" fill={AXIS}>{yLabel(t)}</text>
          </g>
        ))}
        {goalLine != null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(goalLine)} y2={Y(goalLine)} stroke="#e8a100" strokeWidth="1.5" strokeDasharray="5 4" />
            <text x={W - PAD.r} y={Y(goalLine) - 4} textAnchor="end" fontSize="9" fill="#e8a100">goal {goalLine}</text>
          </g>
        )}
        {series.map((s, si) => (
          <g key={si}>
            <polyline
              fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              points={s.points.map((p, i) => `${X(i, s.points.length)},${Y(p.y)}`).join(' ')}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={X(i, s.points.length)} cy={Y(p.y)} r="3" fill={s.color} />
            ))}
          </g>
        ))}
        {series[0] && series[0].points.map((p, i) => {
          const n = series[0].points.length
          if (n > 6 && i % Math.ceil(n / 5) !== 0 && i !== n - 1) return null
          return <text key={i} x={X(i, n)} y={H - 6} textAnchor="middle" fontSize="8.5" fill={AXIS}>{p.x}</text>
        })}
      </svg>
    </div>
  )
}

export function Ladder({ highlightTier }) {
  return (
    <div>
      {[...RATING_TIERS].reverse().map((t) => (
        <div key={t.name} className={'ladder-row' + (highlightTier === t.name ? ' here' : '')}>
          <span className="dot" style={{ background: t.color, boxShadow: `0 0 8px ${t.glow}` }} />
          <span className="tname" style={{ color: t.color }}>{t.name}</span>
          {highlightTier === t.name && <span className="you-tag">YOU</span>}
          <span className="trange">{t.min}+</span>
        </div>
      ))}
    </div>
  )
}
