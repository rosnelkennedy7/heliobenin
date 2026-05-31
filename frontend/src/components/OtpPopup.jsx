import { useState, useEffect, useRef, useCallback } from 'react'
import { generateAndStoreOtp, verifyOtp } from '../utils/otp'
import { sendOtpEmail } from '../utils/emailjs'

export default function OtpPopup({ email, onSuccess, onClose, onFallback }) {
  const [digits,    setDigits]    = useState(Array(6).fill(''))
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [shake,     setShake]     = useState(false)
  const [timeLeft,  setTimeLeft]  = useState(600)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [failCount, setFailCount] = useState(0)
  const refs = useRef([])

  useEffect(() => { refs.current[0]?.focus() }, [])

  useEffect(() => {
    if (timeLeft <= 0) { setCanResend(true); return }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleChange = (i, val) => {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = char
    setDigits(next)
    if (char && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!p) return
    const next = Array(6).fill('')
    p.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    refs.current[Math.min(p.length, 5)]?.focus()
  }

  const verify = useCallback(async (overrideDigits) => {
    const code = (overrideDigits || digits).join('')
    if (code.length < 6) return
    setLoading(true)
    setError('')
    try {
      const result = await verifyOtp(code)
      if (result.success) {
        onSuccess()
      } else {
        const newCount = failCount + 1
        setFailCount(newCount)
        if (newCount >= 3 && onFallback) {
          onFallback()
          return
        }
        setError(result.message || 'Code incorrect ou expiré.')
        setShake(true)
        setDigits(Array(6).fill(''))
        setTimeout(() => { setShake(false); refs.current[0]?.focus() }, 600)
      }
    } catch {
      setError('Erreur de vérification. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [digits, failCount, onSuccess, onFallback])

  useEffect(() => {
    if (digits.every(d => d !== '') && !loading) verify(digits)
  }, [digits]) // eslint-disable-line

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      const code = await generateAndStoreOtp(email)
      await sendOtpEmail(email, code)
      setTimeLeft(600)
      setCanResend(false)
      setFailCount(0)
      setDigits(Array(6).fill(''))
      refs.current[0]?.focus()
    } catch {
      setError('Erreur lors du renvoi.')
    } finally {
      setResending(false)
    }
  }

  const allFilled = digits.every(d => d !== '')

  return (
    <>
      <style>{`@keyframes otp-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '2rem 2rem 1.8rem', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', animation: shake ? 'otp-shake 0.5s ease' : 'none' }}
        >
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            🔐
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 0.3rem', color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
              Vérifiez votre identité
            </h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Code envoyé à <b style={{ color: 'rgba(255,255,255,0.72)' }}>{email}</b>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.55rem' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                style={{
                  width: 44, height: 52, textAlign: 'center', fontSize: '1.4rem', fontWeight: 700,
                  background: d ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${d ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.13)'}`,
                  borderRadius: 10, color: '#fff', outline: 'none', fontFamily: 'inherit',
                  caretColor: '#F59E0B', transition: 'border-color 0.15s, background 0.15s',
                }}
              />
            ))}
          </div>

          {error && (
            <p style={{ margin: 0, color: '#F87171', fontSize: '0.83rem', textAlign: 'center' }}>{error}</p>
          )}

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
            {canResend ? 'Code expiré' : `Expire dans ${fmt(timeLeft)}`}
          </span>

          <button
            onClick={() => verify()}
            disabled={!allFilled || loading}
            style={{ width: '100%', padding: '0.75rem', background: allFilled ? '#F59E0B' : 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 10, color: allFilled ? '#1E293B' : 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: 700, cursor: allFilled ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            {loading ? '…' : 'Vérifier'}
          </button>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={handleResend}
              disabled={!canResend || resending}
              style={{ background: 'none', border: 'none', color: canResend ? '#F59E0B' : 'rgba(255,255,255,0.25)', fontSize: '0.82rem', fontWeight: 600, cursor: canResend ? 'pointer' : 'default', fontFamily: 'inherit' }}
            >
              {resending ? 'Envoi…' : 'Renvoyer le code'}
            </button>

            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
