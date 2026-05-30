import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserTechnicien } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import OtpPopup from '../../components/OtpPopup'
import ConfirmEmailPopup from '../../components/ConfirmEmailPopup'
import PasswordPopup from '../../components/PasswordPopup'
import styles from './Inscription.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

const SPECIALITES = ['Technicien en solaire', 'Électricien', 'Ingénieur', 'Autre']

const formatBjPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export default function Inscription() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', whatsapp: '',
    entreprise: '', ifu: '', rccm: '',
    specialite: '', specialiteAutre: '',
  })
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
    if (!form.specialite) {
      e.specialite = 'La spécialité est requise.'
    } else if (form.specialite === 'Autre' && !form.specialiteAutre.trim()) {
      e.specialiteAutre = 'Veuillez préciser votre spécialité.'
    }
    return e
  }

  const submitAccount = (password) => {
    const specialiteFinal = form.specialite === 'Autre' ? form.specialiteAutre : form.specialite
    localStorage.setItem('heliobenin_role', 'technicien')
    saveUserTechnicien({
      prenom: form.prenom, nom: form.nom, email: form.email,
      whatsapp: form.whatsapp, entreprise: form.entreprise,
      ifu: form.ifu, rccm: form.rccm, specialite: specialiteFinal,
      role: 'technicien',
      ...(password ? { password } : {}),
    })
    ;(async () => {
      try {
        const { error } = await supabase?.from('profiles').insert([{
          nom: form.nom, prenom: form.prenom, email: form.email, role: 'technicien',
          whatsapp: form.whatsapp || null, entreprise: form.entreprise || null,
          specialite: specialiteFinal || null, ifu: form.ifu || null, rccm: form.rccm || null,
        }]) ?? {}
        if (error) console.error('[Supabase] insert technicien:', error)
      } catch (err) { console.error('[Supabase]', err) }
    })()
    navigate('/qcm-tech')
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

            <div className={styles.field}>
              <label htmlFor="entreprise">Nom de l'entreprise</label>
              <input id="entreprise" value={form.entreprise} onChange={e => update('entreprise', e.target.value)}
                placeholder="Optionnel" autoComplete="off" />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="ifu">IFU</label>
                <input id="ifu" value={form.ifu} onChange={e => update('ifu', e.target.value)}
                  placeholder="Optionnel" autoComplete="off" />
              </div>
              <div className={styles.field}>
                <label htmlFor="rccm">RCCM</label>
                <input id="rccm" value={form.rccm} onChange={e => update('rccm', e.target.value)}
                  placeholder="Optionnel" autoComplete="off" />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="specialite">Spécialité <span className={styles.required}>*</span></label>
              {form.specialite === 'Autre' ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="specialiteAutre" value={form.specialiteAutre}
                    onChange={e => update('specialiteAutre', e.target.value)}
                    className={errors.specialiteAutre ? styles.inputError : ''}
                    placeholder="Ex : Électromécanicien" autoFocus autoComplete="off" style={{ flex: 1 }}
                  />
                  <button type="button" onClick={() => { update('specialite', ''); update('specialiteAutre', '') }}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: 'rgba(255,255,255,0.6)', padding: '0.45rem 0.75rem', cursor: 'pointer', fontSize: '0.95rem', lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 }}>
                    ‹
                  </button>
                </div>
              ) : (
                <select id="specialite" value={form.specialite} onChange={e => update('specialite', e.target.value)}
                  className={errors.specialite ? styles.inputError : ''}>
                  <option value="">-- Choisissez votre spécialité --</option>
                  {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {errors.specialite     && <span className={styles.errorMsg}>{errors.specialite}</span>}
              {form.specialite === 'Autre' && errors.specialiteAutre && (
                <span className={styles.errorMsg}>{errors.specialiteAutre}</span>
              )}
            </div>

            {submitError && (
              <p style={{ margin: '0 0 0.5rem', color: '#F87171', fontSize: '0.83rem', textAlign: 'center' }}>{submitError}</p>
            )}

            <div className={styles.infoBlue}>
              Accédez aux outils complets : paramètres avancés, base de données équipements,
              génération de devis PDF et gestion de projets clients.
            </div>

            <button type="submit" className={styles.btnBlue} disabled={otpSending}>
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
