import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserParticulier } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import styles from './Inscription.module.css'

/* Formatte 10 chiffres en XX XX XX XX XX */
const formatBjPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

function PasswordInput({ id, label, value, onChange, error, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label} <span className={styles.required}>*</span>
      </label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder || ''}
          className={error ? styles.inputError : ''}
        />
        <button
          type="button"
          className={styles.eyeBtn}
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Masquer' : 'Afficher'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
    </div>
  )
}

export default function Inscription() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', whatsapp: '',
    password: '', confirmPassword: '',
  })

  const [errors, setErrors] = useState({})

  const update = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const e = {}

    if (!form.prenom.trim()) e.prenom = 'Le prénom est requis.'
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'

    if (!form.email.trim()) {
      e.email = "L'email est requis."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Format d'email invalide."
    }

    const phoneDigits = form.whatsapp.replace(/\D/g, '')
    if (!phoneDigits) {
      e.whatsapp = 'Le numéro WhatsApp est requis.'
    } else if (phoneDigits.length !== 10) {
      e.whatsapp = 'Le numéro doit contenir exactement 10 chiffres.'
    }

    if (!form.password) {
      e.password = 'Le mot de passe est requis.'
    } else if (form.password.length < 8) {
      e.password = 'Le mot de passe doit contenir au moins 8 caractères.'
    }

    if (!form.confirmPassword) {
      e.confirmPassword = 'Veuillez confirmer votre mot de passe.'
    } else if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Les mots de passe ne correspondent pas.'
    }

    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    localStorage.setItem('heliobenin_role', 'particulier')
    saveUserParticulier({ prenom: form.prenom, nom: form.nom, email: form.email, role: 'particulier' })
    ;(async () => {
      try {
        const { error } = await supabase?.from('profiles').insert([{
          nom: form.nom, prenom: form.prenom, email: form.email, role: 'particulier',
        }]) ?? {}
        if (error) console.error('[Supabase] profiles insert (particulier):', error)
      } catch (e) { console.error('[Supabase] profiles exception (particulier):', e) }
    })()
    navigate('/paiement')
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
            {/* Prénom + Nom */}
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="prenom">
                  Prénom <span className={styles.required}>*</span>
                </label>
                <input
                  id="prenom"
                  value={form.prenom}
                  onChange={e => update('prenom', e.target.value)}
                  className={errors.prenom ? styles.inputError : ''}
                  placeholder="Jean"
                />
                {errors.prenom && <span className={styles.errorMsg}>{errors.prenom}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="nom">
                  Nom <span className={styles.required}>*</span>
                </label>
                <input
                  id="nom"
                  value={form.nom}
                  onChange={e => update('nom', e.target.value)}
                  className={errors.nom ? styles.inputError : ''}
                  placeholder="Doe"
                />
                {errors.nom && <span className={styles.errorMsg}>{errors.nom}</span>}
              </div>
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email">
                Adresse email <span className={styles.required}>*</span>
              </label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className={errors.email ? styles.inputError : ''}
                placeholder="jean.doe@email.com"
              />
              {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>

            {/* WhatsApp */}
            <div className={styles.field}>
              <label htmlFor="whatsapp">
                Numéro WhatsApp <span className={styles.required}>*</span>
              </label>
              <div className={`${styles.phoneWrap} ${errors.whatsapp ? styles.phoneError : ''}`}>
                <span className={styles.phonePrefix}>🇧🇯 +229</span>
                <input
                  id="whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={e => update('whatsapp', formatBjPhone(e.target.value))}
                  className={styles.phoneInput}
                  placeholder="97 00 00 00 00"
                  maxLength={14}
                />
              </div>
              {errors.whatsapp && <span className={styles.errorMsg}>{errors.whatsapp}</span>}
            </div>

            <PasswordInput
              id="password"
              label="Mot de passe"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              error={errors.password}
              placeholder="8 caractères minimum"
            />

            <PasswordInput
              id="confirmPassword"
              label="Confirmer le mot de passe"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              placeholder="Répétez votre mot de passe"
            />

            <div className={styles.infoOrange}>
              Obtenez une estimation de vos équipements et contactez un technicien pour votre
              installation. Les résultats sont indicatifs.
            </div>

            <button type="submit" className={styles.btnOrange}>
              Créer mon compte
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
