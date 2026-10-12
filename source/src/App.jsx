import { useState } from 'react'
import { useGymData, DATA_MODE } from './lib/store.js'
import Onboarding from './components/Onboarding.jsx'
import Battle from './components/Battle.jsx'
import Logger from './components/Logger.jsx'
import BodyTab from './components/BodyTab.jsx'
import Ranks from './components/Ranks.jsx'

const TABS = [
  { id: 'battle', label: 'Battle', ico: '⚔️' },
  { id: 'log', label: 'Log', ico: '➕' },
  { id: 'body', label: 'Body', ico: '⚖️' },
  { id: 'ranks', label: 'Ranks', ico: '🏆' },
]

export default function App() {
  const [tab, setTab] = useState('battle')
  const [saving, setSaving] = useState(false)
  const gym = useGymData()
  const { profiles, sessions, bodyweight, calories, eloHistory, actions, loading, error } = gym

  if (loading) {
    return (
      <div className="onboard">
        <div className="hero"><div className="big">🏋️</div><p>Loading the arena…</p></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="onboard">
        <div className="hero"><div className="big">🚨</div><h2>Couldn't load data</h2><p>{error}</p></div>
        <button className="btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  // First visit (real backend, no fighters yet) → onboarding
  if (DATA_MODE === 'supabase' && profiles.length === 0) {
    return (
      <Onboarding
        saving={saving}
        onDone={async (people) => {
          setSaving(true)
          try { await actions.setupProfiles(people) } finally { setSaving(false) }
        }}
      />
    )
  }

  const wrap = async (fn) => {
    setSaving(true)
    try { return await fn() } finally { setSaving(false) }
  }

  return (
    <>
      <header className="app-header">
        <h1>GYM <span className="vs">BATTLE</span></h1>
        <div className="sub">
          {profiles.map((p) => p.name).join(' vs ') || '1v1 strength competition'}
          {DATA_MODE === 'demo' ? ' · demo data' : ' · live'}
        </div>
      </header>
      {DATA_MODE === 'demo' && (
        <div className="demo-banner">
          👀 Previewing with demo data. Connect Supabase (see README) for live shared tracking.
        </div>
      )}

      {tab === 'battle' && (
        <Battle profiles={profiles} sessions={sessions} bodyweight={bodyweight} calories={calories} eloHistory={eloHistory} actions={actions} />
      )}
      {tab === 'log' && (
        <Logger profiles={profiles} saving={saving} onSave={(payload) => wrap(() => actions.logSession(payload))} />
      )}
      {tab === 'body' && (
        <BodyTab profiles={profiles} bodyweight={bodyweight} calories={calories} actions={actions} />
      )}
      {tab === 'ranks' && (
        <Ranks profiles={profiles} sessions={sessions} bodyweight={bodyweight} eloHistory={eloHistory} />
      )}

      <nav className="bottom-nav">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); window.scrollTo(0, 0) }}>
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}
