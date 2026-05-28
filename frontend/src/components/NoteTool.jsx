import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const wrap = {
  marginTop: '2rem',
  padding: '1.5rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '1rem',
}
const titleStyle = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  letterSpacing: '0.01em',
}
const starsWrap = { display: 'flex', gap: '0.3rem' }
const starStyle = active => ({
  background: 'none',
  border: 'none',
  fontSize: '2rem',
  cursor: 'pointer',
  color: active ? '#F59E0B' : 'rgba(255,255,255,0.2)',
  transition: 'color 0.15s',
  padding: '0 0.1rem',
  lineHeight: 1,
})
const textareaStyle = {
  width: '100%',
  maxWidth: 420,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: 'rgba(255,255,255,0.8)',
  fontSize: '0.88rem',
  padding: '0.6rem 0.8rem',
  resize: 'vertical',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}
const btnStyle = disabled => ({
  padding: '0.55rem 1.4rem',
  background: disabled ? 'rgba(245,158,11,0.2)' : '#F59E0B',
  border: 'none',
  borderRadius: 8,
  color: disabled ? 'rgba(255,255,255,0.35)' : '#1E293B',
  fontSize: '0.9rem',
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background 0.15s',
})
const confirmStyle = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 700,
  color: '#10B981',
}

export default function NoteTool({ role }) {
  const [note, setNote]           = useState(0)
  const [hover, setHover]         = useState(0)
  const [commentaire, setComm]    = useState('')
  const [sent, setSent]           = useState(false)
  const [sending, setSending]     = useState(false)

  const handleSubmit = async () => {
    if (!note || sending) return
    setSending(true)
    try {
      const { error } = await supabase?.from('avis').insert([{
        note,
        commentaire: commentaire.trim() || null,
        role,
      }]) ?? {}
      if (error) console.error('[Supabase] avis insert:', error)
    } catch (e) { console.error('[Supabase] avis exception:', e) }
    setSending(false)
    setSent(true)
  }

  return (
    <div style={wrap}>
      {sent ? (
        <p style={confirmStyle}>Merci pour votre avis !</p>
      ) : (
        <>
          <p style={titleStyle}>Donnez votre avis</p>
          <div style={starsWrap}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setNote(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                style={starStyle(n <= (hover || note))}
              >★</button>
            ))}
          </div>
          <textarea
            value={commentaire}
            onChange={e => setComm(e.target.value)}
            placeholder="Votre commentaire (optionnel)..."
            style={textareaStyle}
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={!note || sending}
            style={btnStyle(!note || sending)}
          >
            {sending ? 'Envoi...' : 'Envoyer mon avis'}
          </button>
        </>
      )}
    </div>
  )
}
