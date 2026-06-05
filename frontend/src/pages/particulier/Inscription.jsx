import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserParticulier } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import { generateAndSendMagicLink } from '../../utils/magicLink'
import ConfirmEmailPopup from '../../components/ConfirmEmailPopup'
import PasswordPopup from '../../components/PasswordPopup'
import styles from './Inscription.module.css'

const formatBjPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export default function Inscription() {
  const navigate = useNavigate()

  const [form, setForm] = useState({ prenom: '', nom: '', email: '', whatsapp: '' })
  const [errors,           setErrors]           = useState({})
  const [biometric,        setBiometric]        = useState(false)
  const [showPassPopup,    setShowPassPopup]    = useState(false)
  const [showConfirmEmail, setShowConfirmEmail] = useState(false)
  const [showLinkSent,     setShowLinkSent]     = useState(false)
  const [sending,          setSending]          = useState(false)
  const [submitError,      setSubmitError]      = useState('')

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

  const sendMagicLink = async () => {
    setSending(true)
    setSubmitError('')
    try {
      sessionStorage.setItem('helio_pending_reg', JSON.stringify({
        nom: form.nom, prenom: form.prenom, email: form.email,
        whatsapp: form.whatsapp || null, role: 'particulier',
      }))
      await generateAndSendMagicLink(form.email, 'particulier')
      setShowLinkSent(true)
    } catch {
      sessionStorage.removeItem('helio_pending_reg')
      setShowPassPopup(true)
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    if (biometric) {
      try {
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'HélioBénin', id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(form.email),
              name: form.email,
              displayName: `${form.prenom} ${form.nom}`,
            },
            pubKeyCredParams: [
              { alg: -7,   type: 'public-key' },
              { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred',
            },
            timeout: 60000,
          }
        })
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
        const credMap = JSON.parse(localStorage.getItem('helio_credentials') || '{}')
        credMap[form.email] = credentialId
        localStorage.setItem('helio_credentials', JSON.stringify(credMap))
        submitAccount(null)
        return
      } catch { /* biométrie échouée → Magic Link */ }
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

          {showLinkSent ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>📧</div>
              <p style={{ color: '#10B981', fontWeight: 700, fontSize: '1rem', margin: '0 0 0.5rem' }}>
                Lien envoyé !
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>
                Un lien de connexion a été envoyé à<br />
                <strong style={{ color: '#F97316' }}>{form.email}</strong><br />
                Vérifiez votre boîte mail et cliquez sur le lien.
              </p>
            </div>
          ) : (
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

              <button type="submit" className={styles.btnOrange} disabled={sending}>
                {sending ? 'Envoi du lien…' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>

      {showConfirmEmail && (
        <ConfirmEmailPopup
          email={form.email}
          onConfirm={() => { setShowConfirmEmail(false); sendMagicLink() }}
          onCorrect={() => setShowConfirmEmail(false)}
          onClose={() => setShowConfirmEmail(false)}
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
