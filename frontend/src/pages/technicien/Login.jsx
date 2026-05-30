import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { getTechnicien } from '../../utils/storage'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [biometric,    setBiometric]    = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(ok => setBiometric(ok))
        .catch(() => {})
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Veuillez saisir votre email.'); return }
    if (!password)     { setError('Veuillez saisir votre mot de passe.'); return }

    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 900))
      const stored = localStorage.getItem('helio_user_technicien')
      const user   = stored ? JSON.parse(stored) : null

      localStorage.setItem('heliobenin_role', 'technicien')
      if (user && user.email !== email) {
        const demo = { prenom: email.split('@')[0], nom: '', email, role: 'technicien' }
        localStorage.setItem('helio_user_technicien', JSON.stringify(demo))
      }
      const techData = getTechnicien()
      if (!techData.qcm_valide) navigate('/qcm-tech')
      else if (!techData.abonnement || techData.abonnement === 'unique') navigate('/paiement-tech')
      else navigate('/dashboard-tech')
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const handleBiometric = async () => {
    setError('')
    setLoading(true)
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        }
      })
      localStorage.setItem('heliobenin_role', 'technicien')
      const techDataBio = getTechnicien()
      if (!techDataBio.qcm_valide) navigate('/qcm-tech')
      else if (!techDataBio.abonnement || techDataBio.abonnement === 'unique') navigate('/paiement-tech')
      else navigate('/dashboard-tech')
    } catch {
      setError('Authentification biométrique annulée. Saisissez votre mot de passe.')
      setShowPassword(true)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailBlur = async () => {
    if (!email.trim()) return
    if (!biometric) { setShowPassword(true); return }
    const stored = localStorage.getItem('helio_user_technicien')
    const user   = stored ? JSON.parse(stored) : null
    if (!user || user.email !== email.trim()) { setShowPassword(true); return }
    await handleBiometric()
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

            {loading && !showPassword && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.83rem', margin: '0.1rem 0' }}>
                Vérification biométrique…
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
                    <button
                      type="button"
                      className={styles.eyeBtn}
                      onClick={() => setShowPass(v => !v)}
                      tabIndex={-1}
                      aria-label={showPass ? 'Masquer' : 'Afficher'}
                    >
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
    </div>
  )
}
