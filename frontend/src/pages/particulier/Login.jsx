import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserParticulier } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import { generateAndSendMagicLink } from '../../utils/magicLink'
import ConfirmEmailPopup from '../../components/ConfirmEmailPopup'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const emailRef = useRef(null)

  const blurLockRef = useRef(false)

  const [email,            setEmail]            = useState('')
  const [password,         setPassword]         = useState('')
  const [showPass,         setShowPass]         = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [biometric,        setBiometric]        = useState(false)
  const [showPassword,     setShowPassword]     = useState(false)
  const [showConfirmEmail, setShowConfirmEmail] = useState(false)
  const [showLinkSent,     setShowLinkSent]     = useState(false)
  const [bioRunning,       setBioRunning]       = useState(false)

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

  const sendMagicLink = async () => {
    setLoading(true)
    try {
      await generateAndSendMagicLink(email.trim(), 'particulier')
      setShowLinkSent(true)
    } catch {
      setError("Erreur d'envoi du lien. Saisissez votre mot de passe.")
      setShowPassword(true)
    } finally {
      setLoading(false)
    }
  }

  const getCredentialId = (em) => {
    const credMap = JSON.parse(localStorage.getItem('helio_credentials') || '{}')
    const b64 = credMap[em]
    if (!b64) return null
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }

  const handleEmailBlur = async () => {
    if (!email.trim() || blurLockRef.current) return
    blurLockRef.current = true
    setError('')
    const user = await findUser()
    if (!user) { setError('Aucun compte trouvé avec cet email.'); blurLockRef.current = false; return }

    if (biometric) {
      setBioRunning(true)
      try {
        const challenge    = crypto.getRandomValues(new Uint8Array(32))
        const credentialId = getCredentialId(email.trim())
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
            rpId: window.location.hostname,
            ...(credentialId ? {
              allowCredentials: [{ type: 'public-key', id: credentialId, transports: ['internal'] }]
            } : {})
          }
        })
        // Mémoriser le credentialId choisi pour cibler directement la prochaine fois
        const usedId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)))
        const credMap = JSON.parse(localStorage.getItem('helio_credentials') || '{}')
        credMap[email.trim()] = usedId
        localStorage.setItem('helio_credentials', JSON.stringify(credMap))
        setBioRunning(false)
        localStorage.setItem('heliobenin_role', 'particulier')
        navigate('/paiement')
      } catch {
        setBioRunning(false)
        blurLockRef.current = false
        await sendMagicLink()
      }
      return
    }

    if (!biometric) setShowConfirmEmail(true)
  }

  const handleConfirmEmail = async () => {
    setShowConfirmEmail(false)
    await sendMagicLink()
  }

  const handleCorrectEmail = () => {
    setShowConfirmEmail(false)
    setEmail('')
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

            {loading && !showPassword && !showLinkSent && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', margin: '0.1rem 0' }}>
                Envoi du lien…
              </p>
            )}

            {showLinkSent && (
              <div style={{ textAlign: 'center', color: '#10B981', padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, fontSize: '0.85rem', lineHeight: 1.6 }}>
                ✅ Un lien de connexion a été envoyé à <strong>{email}</strong>
                <br />
                <small style={{ color: 'rgba(255,255,255,0.45)' }}>Vérifiez votre boîte mail et cliquez sur le lien</small>
              </div>
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

            {!showPassword && !showLinkSent && error && <p className={styles.error}>{error}</p>}
          </form>
        </div>
      </div>

      {showConfirmEmail && !bioRunning && !loading && (
        <ConfirmEmailPopup
          email={email.trim()}
          onConfirm={handleConfirmEmail}
          onCorrect={handleCorrectEmail}
          onClose={() => setShowConfirmEmail(false)}
        />
      )}
    </div>
  )
}
