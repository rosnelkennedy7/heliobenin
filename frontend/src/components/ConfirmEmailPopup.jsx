export default function ConfirmEmailPopup({ email, onConfirm, onCorrect, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}
      >
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          ✉️
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.4rem', color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
            Confirmez votre email
          </h2>
          <p style={{ margin: '0 0 0.2rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>
            Le code sera envoyé à :
          </p>
          <p style={{ margin: 0, color: '#F59E0B', fontWeight: 700, fontSize: '0.95rem', wordBreak: 'break-all' }}>
            {email}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button
            onClick={onCorrect}
            style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            Ce n'est pas mon email
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: '0.75rem', background: '#F59E0B', border: 'none', borderRadius: 10, color: '#1E293B', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
