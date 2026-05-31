import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { getTechnicien, saveUserTechnicien, clearTechnicien } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import OtpPopup from '../../components/OtpPopup'
import ConfirmEmailPopup from '../../components/ConfirmEmailPopup'
import styles from './Login.module.css'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function Login() {
  const navigate = useNavigate()
  const emailRef = useRef(null)

  const [email,             setEmail]             = useState('')
  const [password,          setPassword]          = useState('')
  const [showPass,          setShowPass]          = useState(false)
  const [loading,           setLoading]           = useState(false)
  const [error,             setError]             = useState('')
  const [biometric,         setBiometric]         = useState(false)
  const [showPassword,      setShowPassword]      = useState(false)
  const [showOtpPopup,      setShowOtpPopup]      = useState(false)
  const [showConfirmEmail,  setShowConfirmEmail]  = useState(false)
  const [resolvedUser,      setResolvedUser]      = useState(null)
  const [bioStarted,        setBioStarted]        = useState(false)

  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometric(ok))
        .catch(() => {})
    }
  }, [])

  const findUser = async () => {
    const stored  = localStorage.getItem('helio_user_technicien')
    const oldUser = stored ? JSON.parse(stored) : null

    if (oldUser && oldUser.email !== email.trim()) {
      clearTechnicien()
      localStorage.removeItem('helio_user_technicien')
    }

    let user = (!oldUser || oldUser.email !== email.trim()) ? null : oldUser
    if (!user) {
      const { data } = await supabase
        .from('profiles').select('*').eq('email', email.trim()).maybeSingle() ?? {}
      if (data) {
        saveUserTechnicien({ ...data, role: data.role || 'technicien' })
        user = data
      }
    }
    return user
  }

  const redirectTech = async (profile) => {
    console.log('[redirectTech] profile:', profile)
    if (profile?.id) {
      const [{ data: prof }, { data: abo }] = await Promise.all([
        supabase.from('profiles').select('qcm_valide').eq('id', profile.id).maybeSingle(),
        supabase.from('abonnements').select('type, date_fin, statut').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      console.log('[redirectTech] prof qcm_valide:', prof?.qcm_valide)
      console.log('[redirectTech] localStorage qcm:', getTechnicien().qcm_valide)
      console.log('[redirectTech] abo:', abo)

      const qcmValide = prof?.qcm_valide || getTechnicien().qcm_valide || false
      if (!qcmValide) { navigate('/qcm-tech'); return }

      if (abo) {
        if (abo.type === 'unique') { navigate('/paiement-tech'); return }
        if (abo.type === 'mensuel' || abo.type === 'annuel') {
          if (new Date(abo.date_fin) > new Date()) { navigate('/dashboard-tech'); return }
          navigate('/paiement-tech'); return
        }
      }
      navigate('/paiement-tech')
      return
    }

    // Fallback sans Supabase
    const qcmValide = getTechnicien().qcm_valide || false
    if (!qcmValide) { navigate('/qcm-tech'); return }
    navigate('/paiement-tech')
  }

  const sendOtp = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/otp/envoyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
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

  const handleBiometric = async (profile) => {
    setLoading(true)
    setBioStarted(true)
    let bioSuccess = false
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      await navigator.credentials.get({
        publicKey: { challenge, timeout: 60000, userVerification: 'required', rpId: window.location.hostname }
      })
      bioSuccess = true
      localStorage.setItem('heliobenin_role', 'technicien')
      await redirectTech(profile)
    } catch {
      bioSuccess = false
    } finally {
      setBioStarted(false)
      setLoading(false)
      if (!bioSuccess) setShowConfirmEmail(true)
    }
  }

  const handleEmailBlur = async () => {
    if (!email.trim()) return
    setError('')
    const user = await findUser()
    if (!user) { setError('Aucun compte trouvé avec cet email.'); return }
    setResolvedUser(user)
    if (biometric) {
      setBioStarted(true)
      await handleBiometric(user)
    } else {
      if (!biometric) setShowConfirmEmail(true)
    }
  }

  const handleConfirmEmail = async () => {
    setShowConfirmEmail(false)
    await sendOtp()
  }

  const handleCorrectEmail = () => {
    setShowConfirmEmail(false)
    setEmail('')
    setResolvedUser(null)
    setError('')
    setTimeout(() => emailRef.current?.focus(), 50)
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
      const stored = localStorage.getItem('helio_user_technicien')
      const user   = stored ? JSON.parse(stored) : null
      if (!user || user.email !== email.trim()) { setError('Aucun compte trouvé avec cet email.'); return }
      if (user.password && user.password !== password) { setError('Mot de passe incorrect.'); return }
      localStorage.setItem('heliobenin_role', 'technicien')
      await redirectTech(user)
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSuccess = async () => {
    setShowOtpPopup(false)
    localStorage.setItem('heliobenin_role', 'technicien')
    await redirectTech(resolvedUser)
  }

  const handleOtpFallback = () => {
    setShowOtpPopup(false)
    setShowPassword(true)
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
          <p className={styles.subtitle}>Connectez-vous à votre espace technicien</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <div className={styles.inputWrap}>
                <Mail size={17} className={styles.inputIcon} color="rgba(255,255,255,0.38)" />
                <input
                  ref={emailRef}
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

            {loading && !showPassword && !showOtpPopup && !showConfirmEmail && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', margin: '0.1rem 0' }}>
                {biometric ? 'Vérification biométrique…' : 'Recherche du compte…'}
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

      {showConfirmEmail && !bioStarted && !loading && (
        <ConfirmEmailPopup
          email={email.trim()}
          onConfirm={handleConfirmEmail}
          onCorrect={handleCorrectEmail}
          onClose={() => setShowConfirmEmail(false)}
        />
      )}

      {showOtpPopup && (
        <OtpPopup
          email={email.trim()}
          onSuccess={handleOtpSuccess}
          onClose={() => setShowOtpPopup(false)}
          onFallback={handleOtpFallback}
        />
      )}
    </div>
  )
}
