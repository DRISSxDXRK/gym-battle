// Battle (home): hero with ELO duel, weekly battle bar, sessions, PR/MVP feed.
import { useMemo, useState } from 'react'
import {
  thisWeekMonday, mondayOf, weekRange, fmtDate, currentStreak,
} from '../lib/ratings.js'
import {
  userOverall, sessionScoreOf, weightAt, mvpForDate, recentPRs,
  userWeekPoints, latestWeight, byUser,
} from '../lib/stats.js'
import { Card, TierBadge } from './ui.jsx'

const TICKER = 'weekly battle · train hard · no excuses · 1200 elo · '

function EloCard({ profile, overall, streak, color, textOn, leader }) {
  return (
    <div className={'elo-card' + (leader ? ' leader' : '')}>
      <div className="bar" style={{ background: color }} />
      <div className="fname" style={{ color: textOn }}>{profile.name}</div>
      <div className="elo-num" style={{ color }}>{profile.elo}</div>
      <TierBadge tier={overall.tier} rating={overall.value} />
      <div className="meta">
        {streak > 0 ? <span className="streak">🔥 {streak}wk</span> : 'no streak'}
        {' · '}{overall.top3.length ? `top: ${overall.top3[0][0]}` : 'no lifts yet'}
      </div>
    </div>
  )
}

export default function Battle({ profiles, sessions, bodyweight, calories, eloHistory, actions }) {
  const [settling, setSettling] = useState(false)
  const [settleMsg, setSettleMsg] = useState('')
  const weekStart = thisWeekMonday()
  const { start, end } = weekRange(weekStart)

  const stats = useMemo(() => profiles.map((p) => ({
    profile: p,
    overall: userOverall(sessions, bodyweight, p),
    week: userWeekPoints(p, sessions, bodyweight, calories, weekStart),
    streak: currentStreak(byUser(sessions, p.id).map((s) => s.date), weekStart),
  })), [profiles, sessions, bodyweight, calories, weekStart])

  const [A, B] = stats
  const total = (A?.week.points || 0) + (B?.week.points || 0)
  const pctA = total > 0 ? Math.round((A.week.points / total) * 100) : 50
  const leaderId = A && B ? (A.profile.elo === B.profile.elo ? null : (A.profile.elo > B.profile.elo ? A.profile.id : B.profile.id)) : null

  // Last week settlement
  const lastWeekStart = (() => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  })()
  const lastWeekSettled = eloHistory.some((h) => h.week_start === lastWeekStart)
  const lastWeekHasSessions = sessions.some((s) => {
    const m = mondayOf(s.date)
    return m === lastWeekStart
  })

  const doSettle = async () => {
    setSettling(true)
    setSettleMsg('')
    try {
      const res = await actions.settleWeek(lastWeekStart)
      setSettleMsg(res.winner ? `🏆 ${res.winner.name} takes the week! ELO updated.` : '🤝 Tie week — ELO unchanged.')
    } catch (e) {
      setSettleMsg('Error: ' + e.message)
    } finally {
      setSettling(false)
    }
  }

  // Recent sessions (newest first, max 6)
  const recentSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return sorted.slice(0, 6)
  }, [sessions])

  // PR feed (last 30 days, both users)
  const prFeed = useMemo(() => {
    const all = []
    for (const p of profiles) all.push(...recentPRs(sessions, bodyweight, p, 30))
    return all.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 8)
  }, [profiles, sessions, bodyweight])

  const mvpCache = useMemo(() => {
    const m = {}
    for (const s of recentSessions) m[s.date] = mvpForDate(sessions, bodyweight, profiles, s.date)
    return m
  }, [recentSessions, sessions, bodyweight, profiles])

  const nameOf = (id) => profiles.find((p) => p.id === id)?.name || '?'
  const isA = (id) => profiles[0]?.id === id

  const tickerItems = Array.from({ length: 6 }).map((_, i) => <span key={i}>{TICKER}</span>)

  return (
    <>
      <section className="hero">
        <div className="kicker">1v1 strength competition</div>
        <h2>{A ? A.profile.name : 'Fighter'} <span className="hl">vs</span> {B ? B.profile.name : 'Fighter'}</h2>
        <p className="tagline">Weekly ELO battles. Strength ranks. Session MVPs. Two lifters, one winner.</p>

        <div className="elo-duel">
          {A && <EloCard profile={A.profile} overall={A.overall} streak={A.streak} color="var(--p1)" textOn="var(--p1)" leader={leaderId === A.profile.id} />}
          <div className="vs-badge">VS</div>
          {B && <EloCard profile={B.profile} overall={B.overall} streak={B.streak} color="var(--p2)" textOn="#fff" leader={leaderId === B.profile.id} />}
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">{tickerItems}{tickerItems}</div>
        </div>
      </section>

      <div className="view">
        <div className="section-label"><span className="num">01</span> This week</div>
        <Card title={`${fmtDate(start)} – ${fmtDate(end)}`}>
          <div className="battle-bar">
            <div className="labels">
              <span style={{ color: 'var(--olive)' }}>{A ? `${A.profile.name} · ${A.week.points}` : ''}</span>
              <span style={{ color: 'var(--deep)' }}>{B ? `${B.week.points} · ${B.profile.name}` : ''}</span>
            </div>
            <div className="track">
              <div className="fill-a" style={{ width: `${pctA}%` }}>{pctA > 12 ? `${pctA}%` : ''}</div>
              <div className="fill-b" style={{ width: `${100 - pctA}%` }}>{100 - pctA > 12 ? `${100 - pctA}%` : ''}</div>
              <div className="mid" />
            </div>
          </div>
          <div className="battle-legend">
            <span>{A ? `${A.week.sessions} sessions · ${A.week.prs.length} PRs` : ''}</span>
            <span>{B ? `${B.week.prs.length} PRs · ${B.week.sessions} sessions` : ''}</span>
          </div>
          {!lastWeekSettled && lastWeekHasSessions && (
            <div style={{ marginTop: 12 }}>
              <div className="notice" style={{ marginBottom: 8 }}>Last week's battle isn't settled yet.</div>
              <button className="btn small" disabled={settling} onClick={doSettle}>
                {settling ? 'Settling…' : `Settle week of ${fmtDate(lastWeekStart)}`}
              </button>
              {settleMsg && <div style={{ marginTop: 8, fontSize: 13 }}>{settleMsg}</div>}
            </div>
          )}
        </Card>

        <div className="section-label"><span className="num">02</span> Recent PRs</div>
        <Card title="Personal records">
          {prFeed.length === 0 && <div className="empty">No PRs yet. Go lift something heavy.</div>}
          {prFeed.map((pr, i) => (
            <div className="feed-item" key={i}>
              <span className="fi-ico">🏆</span>
              <div className="fi-body">
                <div className="fi-title" style={{ color: isA(pr.userId) ? 'var(--olive)' : 'var(--deep)' }}>{pr.userName} · {pr.exercise}</div>
                <div className="fi-sub">est. 1RM {pr.est1RM.toFixed(1)}kg — {pr.weight}kg × {pr.reps} · {fmtDate(pr.date)}</div>
              </div>
            </div>
          ))}
        </Card>

        <div className="section-label"><span className="num">03</span> Latest sessions</div>
        <Card title="Training log">
          {recentSessions.length === 0 && <div className="empty">No sessions logged yet.</div>}
          {recentSessions.map((s) => {
            const p = profiles.find((x) => x.id === s.user_id)
            const bw = weightAt(bodyweight, s.user_id, s.date, p?.start_weight)
            const score = sessionScoreOf(s, bw)
            const mvp = mvpCache[s.date]
            const isMvp = mvp && mvp.userId === s.user_id
            return (
              <div className="feed-item" key={s.id}>
                <span className="fi-ico">{isMvp ? '👑' : '💪'}</span>
                <div className="fi-body">
                  <div className="fi-title">
                    <span className={isA(s.user_id) ? 'who-a who' : 'who-b who'} style={{ marginRight: 6 }}>{nameOf(s.user_id)}</span>
                    {fmtDate(s.date)}{isMvp && <span className="crown" style={{ marginLeft: 6, fontSize: 12 }}>SESSION MVP</span>}
                  </div>
                  <div className="fi-sub">
                    {(s.sets || []).map((x) => `${x.exercise.split(' ')[0]} ${x.weight_kg}×${x.reps}`).slice(0, 4).join(' · ')}
                    {s.notes ? ` — ${s.notes}` : ''}
                  </div>
                </div>
                <span className="fi-score">{score.toFixed(2)}</span>
              </div>
            )
          })}
        </Card>
      </div>
    </>
  )
}
