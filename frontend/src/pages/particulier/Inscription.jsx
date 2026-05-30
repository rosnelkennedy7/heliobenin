import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserParticulier } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import OtpPopup from '../../components/OtpPopup'
import ConfirmEmailPopup from '../../components/ConfirmEmailPopup'
import PasswordPopup from '../../components/PasswordPopup'
import styles from './Inscription.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const formatBjPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export default function Inscription() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ prenom: '', nom: '', email: '', whatsapp: '' })
  const [errors,            setErrors]            = useState({})
  const [biometric,         setBiometric]         = useState(false)
  const [showOtpPopup,      setShowOtpPopup]      = useState(false)
  const [showPassPopup,     setShowPassPopup]     = useState(false)
  const [showConfirmEmail,  setShowConfirmEmail]  = useState(false)
  const [otpSending,        setOtpSending]        = useState(false)
  const [submitError,       setSubmitError]       = useState('')

  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometric(ok))
        .catch(() => {})
    }
  }, [])

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.prenom.trim()) e.prenom = 'Le prénom est requis.'
    if (!form.nom.trim())    e.nom    = 'Le nom est requis.'
    if (!form.email.trim()) {
      e.email = "L'email est requis."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Format d'email invalide."
    }
    const phone = form.whatsapp.replace(/\D/g, '')
    if (!phone) {
      e.whatsapp = 'Le numéro WhatsApp est requis.'
    } else if (phone.length !== 10) {
      e.whatsapp = 'Le numéro doit contenir exactement 10 chiffres.'
    }
    return e
  }

  const submitAccount = (password) => {
    localStorage.setItem('heliobenin_role', 'particulier')
    saveUserParticulier({
      prenom: form.prenom, nom: form.nom,
      email: form.email, whatsapp: form.whatsapp,
      role: 'particulier',
      ...(password ? { password } : {}),
    })
    ;(async () => {
      try {
        const { error } = await supabase?.from('profiles').insert([{
          nom: form.nom, prenom: form.prenom, email: form.email,
          role: 'particulier', whatsapp: form.whatsapp || null,
        }]) ?? {}
        if (error) console.error('[Supabase] insert particulier:', error)
      } catch (err) { console.error('[Supabase]', err) }
    })()
    navigate('/paiement')
  }

  const sendOtp = async () => {
    setOtpSending(true)
    setSubmitError('')
    try {
      const res = await fetch(`${API_BASE}/api/otp/envoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      })
      if (!res.ok) throw new Error()
      setShowOtpPopup(true)
    } catch {
      setSubmitError("Erreur lors de l'envoi du code. Vérifiez votre connexion.")
    } finally {
      setOtpSending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    if (biometric) {
      try {
        const challenge = new Uint8Array(32); crypto.getRandomValues(challenge)
        const userId    = new Uint8Array(16);  crypto.getRandomValues(userId)
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'HélioBénin', id: window.location.hostname },
            user: { id: userId, name: form.email, displayName: [form.prenom, form.nom].filter(Boolean).join(' ') },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
            timeout: 60000,
          }
        })
        submitAccount(null)
        return
      } catch { /* biometric failed → fall through to ConfirmEmail */ }
    }

    setShowConfirmEmail(true)
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardLogo}>
            <span className={styles.logoText}>
              <span className={styles.logoHelio}>Hélio</span>
              <span className={styles.logoBenin}>Bénin</span>
            </span>
          </div>
          <p className={styles.cardSlogan}>Votre guide de dimensionnement solaire</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="prenom">Prénom <span className={styles.required}>*</span></label>
                <input id="prenom" value={form.prenom} onChange={e => update('prenom', e.target.value)}
                  className={errors.prenom ? styles.inputError : ''} placeholder="Jean" autoComplete="off" />
                {errors.prenom && <span className={styles.errorMsg}>{errors.prenom}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="nom">Nom <span className={styles.required}>*</span></label>
                <input id="nom" value={form.nom} onChange={e => update('nom', e.target.value)}
                  className={errors.nom ? styles.inputError : ''} placeholder="Doe" autoComplete="off" />
                {errors.nom && <span className={styles.errorMsg}>{errors.nom}</span>}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Adresse email <span className={styles.required}>*</span></label>
              <input id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)}
                className={errors.email ? styles.inputError : ''} placeholder="jean.doe@email.com" autoComplete="off" />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="whatsapp">Numéro WhatsApp <span className={styles.required}>*</span></label>
              <div className={`${styles.phoneWrap} ${errors.whatsapp ? styles.phoneError : ''}`}>
                <span className={styles.phonePrefix}>🇧🇯 +229</span>
                <input id="whatsapp" type="tel" value={form.whatsapp}
                  onChange={e => update('whatsapp', formatBjPhone(e.target.value))}
                  className={styles.phoneInput} placeholder="97 00 00 00 00" maxLength={14} autoComplete="off" />
              </div>
              {errors.whatsapp && <span className={styles.errorMsg}>{errors.whatsapp}</span>}
            </div>

            {submitError && (
              <p style={{ margin: '0 0 0.5rem', color: '#F87171', fontSize: '0.83rem', textAlign: 'center' }}>{submitError}</p>
            )}

            <div className={styles.infoOrange}>
              Obtenez une estimation de vos équipements et contactez un technicien pour votre installation.
            </div>

            <button type="submit" className={styles.btnOrange} disabled={otpSending}>
              {otpSending ? 'Envoi du code…' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>

      {showConfirmEmail && (
        <ConfirmEmailPopup
          email={form.email}
          onConfirm={() => { setShowConfirmEmail(false); sendOtp() }}
          onCorrect={() => setShowConfirmEmail(false)}
          onClose={() => setShowConfirmEmail(false)}
        />
      )}

      {showOtpPopup && (
        <OtpPopup
          email={form.email}
          onSuccess={() => { setShowOtpPopup(false); setShowPassPopup(true) }}
          onClose={() => setShowOtpPopup(false)}
        />
      )}

      {showPassPopup && (
        <PasswordPopup
          onSuccess={pass => { setShowPassPopup(false); submitAccount(pass) }}
          onClose={() => setShowPassPopup(false)}
        />
      )}
    </div>
  )
}
