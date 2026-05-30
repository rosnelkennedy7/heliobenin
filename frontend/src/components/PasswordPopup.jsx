import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordPopup({ onSuccess, onClose }) {
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)

  const confirm = () => pass.length >= 6 && onSuccess(pass)

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 101, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}
      >
        <div style={{ fontSize: '2rem' }}>🔒</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.3rem', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
            Sécurisez votre compte
          </h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
            Définissez un mot de passe et ne l'oubliez pas !
          </p>
        </div>
        <div style={{ width: '100%', position: 'relative' }}>
          <input
            type={show ? 'text' : 'password'}
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            placeholder="••••••••"
            autoFocus
            autoComplete="new-password"
            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '0.8rem 2.8rem 0.8rem 0.9rem', color: '#fff', fontSize: '1rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', lineHeight: 0, padding: 0 }}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <button
          onClick={confirm}
          disabled={pass.length < 6}
          style={{ width: '100%', padding: '0.75rem', background: pass.length >= 6 ? '#F59E0B' : 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 10, color: pass.length >= 6 ? '#1E293B' : 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: 700, cursor: pass.length >= 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}
        >
          Valider
        </button>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
