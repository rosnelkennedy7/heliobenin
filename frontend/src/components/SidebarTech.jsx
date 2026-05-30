import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { clearTechnicien, getUserTechnicien } from '../utils/storage'

const NAV = [
  { label: 'Dashboard',    path: '/dashboard-tech'    },
  { label: 'Mes projets',  path: '/mes-projets-tech'  },
  { label: 'Profil',       path: '/profil-tech'       },
]

export default function SidebarTech() {
  const navigate     = useNavigate()
  const { pathname } = useLocation()
  const [user, setUser] = useState(getUserTechnicien)

  useEffect(() => {
    const handler = () => setUser(getUserTechnicien())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const handleLogout = () => {
    clearTechnicien()
    localStorage.removeItem('helio_user_technicien')
    localStorage.removeItem('heliobenin_role')
    navigate('/')
  }

  return (
    <div style={{
      width: 190, flexShrink: 0,
      background: 'rgba(15,23,42,0.97)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, height: '100vh',
      zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{ padding: '1.4rem 1.2rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F59E0B' }}>☀️ HélioBénin</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', marginTop: '0.2rem' }}>
          Espace technicien
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1rem 0.7rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {NAV.map(({ label, path }) => {
          const active = pathname === path
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              width: '100%', textAlign: 'left',
              padding: '0.6rem 0.85rem', borderRadius: 8,
              background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
              border: active ? '1px solid rgba(245,158,11,0.28)' : '1px solid transparent',
              color: active ? '#F59E0B' : 'rgba(255,255,255,0.55)',
              fontSize: '0.88rem', fontWeight: active ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Déconnexion */}
      <div style={{ padding: '0 0.7rem 1.4rem' }}>
        <button onClick={handleLogout} style={{
          width: '100%', textAlign: 'left',
          padding: '0.6rem 0.85rem', borderRadius: 8,
          border: 'none', background: 'transparent',
          color: 'rgba(239,68,68,0.65)', fontSize: '0.88rem',
          fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Déconnexion
        </button>
      </div>
    </div>
  )
}
