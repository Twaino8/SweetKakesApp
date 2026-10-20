import { NavLink, Outlet } from 'react-router-dom'
import { useSyncState } from '../lib/hooks'
import { syncNow } from '../lib/sync'
import { Icon } from './Icon'

const NAV = [
  { to: '/', label: 'Today', icon: 'today', end: true },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/money', label: 'Money', icon: 'money' },
  { to: '/recipes', label: 'Recipes', icon: 'recipes' },
  { to: '/customers', label: 'Customers', icon: 'customers' },
]

function SyncBadge() {
  const s = useSyncState()
  if (!s) return null
  const color =
    s.phase === 'error' ? '#c61e53' : s.phase === 'offline' ? '#b58038' : s.phase === 'syncing' ? '#6b5a50' : '#24572e'
  const text =
    s.phase === 'syncing'
      ? 'Syncing…'
      : s.phase === 'offline'
        ? s.pending
          ? `Offline · ${s.pending} to send`
          : 'Offline'
        : s.phase === 'error'
          ? 'Sync problem'
          : s.pending
            ? `${s.pending} to send`
            : 'All saved'
  return (
    <button
      className="sync-pill"
      onClick={() => void syncNow()}
      title={s.message ?? 'Tap to sync now'}
      style={{ background: 'none', border: 'none', minHeight: 44, cursor: 'pointer' }}
    >
      <span className="dot" style={{ background: color }} />
      {text}
    </button>
  )
}

export function Shell() {
  return (
    <div className="shell">
      <nav className="rail" aria-label="Main">
        <img className="rail-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="Sweet Kakes n Treats" />
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="navlink">
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <NavLink to="/settings" className="navlink">
          <Icon name="settings" />
          Settings
        </NavLink>
        <SyncBadge />
      </nav>
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        {NAV.slice(0, 4).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="navlink">
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
        <NavLink to="/more" className="navlink">
          <Icon name="more" />
          More
        </NavLink>
      </nav>
    </div>
  )
}

export { SyncBadge }
