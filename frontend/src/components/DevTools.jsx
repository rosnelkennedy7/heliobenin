import { useState } from 'react'

export default function DevTools() {
  if (!import.meta.env.DEV) return null

  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)

  const viderTout = () => {
    const keys = Object.keys(localStorage)
    let count = 0
    keys.forEach(k => {
      if (
        k.startsWith('heliobenin_')
        || k.startsWith('helio_user_')
        || k === 'heliobenin_role'
      ) {
        localStorage.removeItem(k)
        count++
      }
    })
    setMsg(`✅ ${count} clés supprimées !`)
    setTimeout(() => {
      setMsg('')
      window.location.href = '/'
    }, 1500)
  }

  const listerCles = () => {
    const keys = Object.keys(localStorage)
      .filter(k =>
        k.startsWith('heliobenin_')
        || k.startsWith('helio_user_')
      )
    console.group('=== localStorage HélioBénin ===')
    if (keys.length === 0) {
      console.log('Aucune clé trouvée')
    } else {
      keys.forEach(k => {
        try {
          console.log(k, '→', JSON.parse(localStorage.getItem(k)))
        } catch {
          console.log(k, '→', localStorage.getItem(k))
        }
      })
    }
    console.groupEnd()
    setMsg(`📋 ${keys.length} clé(s) → console`)
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.2rem',
      right: '1.2rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.4rem',
      fontFamily: 'inherit',
    }}>

      {/* Message feedback */}
      {msg && (
        <div style={{
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(245,158,11,0.5)',
          borderRadius: 8,
          padding: '6px 12px',
          color: '#F59E0B',
          fontSize: '0.78rem',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          maxWidth: 220,
          textAlign: 'center',
        }}>
          {msg}
        </div>
      )}

      {/* Boutons ouverts */}
      {open && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          alignItems: 'flex-end',
        }}>
          <button
            onClick={listerCles}
            title="Voir les clés dans F12"
            style={{
              background: 'rgba(55,138,221,0.15)',
              border: '1px solid rgba(55,138,221,0.4)',
              borderRadius: 8,
              color: '#378ADD',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            📋 Voir localStorage
          </button>

          <button
            onClick={viderTout}
            title="Vider tout le localStorage"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 8,
              color: '#EF4444',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            🗑️ Vider tout (Init)
          </button>
        </div>
      )}

      {/* Bouton principal toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Fermer DevTools' : 'Ouvrir DevTools'}
        style={{
          background: open
            ? 'rgba(245,158,11,0.2)'
            : 'rgba(15,23,42,0.85)',
          border: `1px solid ${open
            ? 'rgba(245,158,11,0.6)'
            : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 10,
          color: open ? '#F59E0B' : 'rgba(255,255,255,0.5)',
          padding: '8px 12px',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
      >
        🛠️ DEV
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

    </div>
  )
}
