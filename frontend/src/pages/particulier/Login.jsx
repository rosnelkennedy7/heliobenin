import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserParticulier } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import OtpPopup from '../../components/OtpPopup'
import styles from './Login.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Login() {
  const navigate = useNavigate()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [biometric,    setBiometric]    = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOtpPopup, setShowOtpPopup] = useState(false)
  const [otpWhatsapp,  setOtpWhatsapp]  = useState(null)

  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometric(ok))
        .catch(() => {})
    }
  }, [])

  const findUser = async () => {
    const stored = localStorage.getItem('helio_user_particulier')
    let user = stored ? JSON.parse(stored) : null
    if (!user || user.email !== email.trim()) {
      const { data } = await supabase
        .from('profiles').select('*').eq('email', email.trim()).maybeSingle() ?? {}
      if (data) {
        saveUserParticulier({ ...data, role: data.role || 'particulier' })
        user = data
      } else {
        user = null
      }
    }
    return user
  }

  const sendOtp = async (user) => {
    setLoading(true)
    try {
      const wa = user?.whatsapp || null
      setOtpWhatsapp(wa)
      const res = await fetch(`${API_BASE}/api/otp/envoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), whatsapp: wa }),
      })
      if (!res.ok) throw new Error()
      setShowOtpPopup(true)
    } catch {
      setError("Erreur d'envoi du code. Saisissez votre mot de passe.")
      setShowPassword(true)
    } finally {
      setLoading(false)
    }
  }

  const handleBiometricForUser = async (user) => {
    setError('')
    setLoading(true)
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      await navigator.credentials.get({
        publicKey: { challenge, timeout: 60000, userVerification: 'required', rpId: window.location.hostname }
      })
      localStorage.setItem('heliobenin_role', 'particulier')
      navigate('/paiement')
    } catch {
      setLoading(false)
      await sendOtp(user)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailBlur = async () => {
    if (!email.trim()) return
    setError('')
    const user = await findUser()
    if (!user) { setError('Aucun compte trouvé avec cet email.'); return }
    if (biometric) {
      await handleBiometricForUser(user)
    } else {
      await sendOtp(user)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!showPassword) { await handleEmailBlur(); return }

    setError('')
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return }
    if (!password)     { setError('Veuillez saisir votre mot de passe.'); return }

    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 900))
      const stored = localStorage.getItem('helio_user_particulier')
      const user   = stored ? JSON.parse(stored) : null
      if (!user || user.email !== email.trim()) { setError('Aucun compte trouvé avec cet email.'); return }
      if (user.password && user.password !== password) { setError('Mot de passe incorrect.'); return }
      localStorage.setItem('heliobenin_role', 'particulier')
      navigate('/paiement')
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSuccess = () => {
    setShowOtpPopup(false)
    localStorage.setItem('heliobenin_role', 'particulier')
    navigate('/paiement')
  }

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />
      <div className={styles.center}>
        <div className={styles.card}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Hélio<span className={styles.logoAccent}>Bénin</span></span>
          </div>
          <h1 className={styles.title}>Bon retour !</h1>
          <p className={styles.subtitle}>Connectez-vous à votre espace solaire</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <div className={styles.inputWrap}>
                <Mail size={17} className={styles.inputIcon} color="rgba(255,255,255,0.38)" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="Adresse email"
                  className={styles.input}
                  autoComplete="off"
                  readOnly
                  onFocus={e => e.target.removeAttribute('readonly')}
                />
              </div>
            </div>

            {loading && !showPassword && !showOtpPopup && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', margin: '0.1rem 0' }}>
                {biometric ? 'Vérification biométrique…' : 'Envoi du code…'}
              </p>
            )}

            {showPassword && (
              <>
                <div className={styles.field}>
                  <div className={styles.inputWrap}>
                    <Lock size={17} className={styles.inputIcon} color="rgba(255,255,255,0.38)" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mot de passe"
                      className={styles.input}
                      autoComplete="new-password"
                      readOnly
                      onFocus={e => e.target.removeAttribute('readonly')}
                    />
                    <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(v => !v)}
                      tabIndex={-1} aria-label={showPass ? 'Masquer' : 'Afficher'}>
                      {showPass
                        ? <EyeOff size={17} color="rgba(255,255,255,0.38)" />
                        : <Eye    size={17} color="rgba(255,255,255,0.38)" />}
                    </button>
                  </div>
                </div>
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                  {loading ? <span className={styles.spinner} /> : 'Se connecter'}
                </button>
              </>
            )}

            {!showPassword && error && <p className={styles.error}>{error}</p>}
          </form>
        </div>
      </div>

      {showOtpPopup && (
        <OtpPopup
          email={email.trim()}
          whatsapp={otpWhatsapp}
          onSuccess={handleOtpSuccess}
          onClose={() => setShowOtpPopup(false)}
          onFallback={() => { setShowOtpPopup(false); setShowPassword(true) }}
        />
      )}
    </div>
  )
}
