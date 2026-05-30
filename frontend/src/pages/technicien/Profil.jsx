import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, ChevronLeft } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { saveUserTechnicien } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import styles from './Profil.module.css'

const SPECIALITES = ['Technicien en solaire', 'Électricien', 'Ingénieur', 'Autre']

const formatWa = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ')
}

export default function Profil() {
  const navigate = useNavigate()

  const raw    = localStorage.getItem('helio_user_technicien')
  const stored = raw ? JSON.parse(raw) : {}

  const initSpec = stored.specialite || ''
  const isCustom = initSpec && !SPECIALITES.filter(s => s !== 'Autre').includes(initSpec)

  const [form, setForm] = useState({
    prenom:          stored.prenom     || '',
    nom:             stored.nom        || '',
    email:           stored.email      || '',
    whatsapp:        stored.whatsapp   || '',
    entreprise:      stored.entreprise || '',
    specialite:      isCustom ? 'Autre' : initSpec,
    specialiteAutre: isCustom ? initSpec : '',
    ifu:             stored.ifu        || '',
    rccm:            stored.rccm       || '',
  })

  const [editWa,    setEditWa]    = useState(false)
  const [oldPass,   setOldPass]   = useState('')
  const [newPass,   setNewPass]   = useState('')
  const [confPass,  setConfPass]  = useState('')
  const [showOld,   setShowOld]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [passError, setPassError] = useState('')

  useEffect(() => {
    if (!supabase || !form.email) return
    ;(async () => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('email', form.email).maybeSingle() ?? {}
        if (data) {
          const spec   = data.specialite || ''
          const isCust = spec && !SPECIALITES.filter(s => s !== 'Autre').includes(spec)
          setForm(f => ({
            prenom:          data.prenom     || f.prenom,
            nom:             data.nom        || f.nom,
            email:           data.email      || f.email,
            whatsapp:        data.whatsapp   || f.whatsapp,
            entreprise:      data.entreprise || f.entreprise,
            specialite:      isCust ? 'Autre' : (spec || f.specialite),
            specialiteAutre: isCust ? spec   : f.specialiteAutre,
            ifu:             data.ifu        || f.ifu,
            rccm:            data.rccm       || f.rccm,
          }))
        }
      } catch (e) { console.error('[Supabase] profil load:', e) }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const specialiteFinal = form.specialite === 'Autre' ? form.specialiteAutre : form.specialite

  const handleSave = async () => {
    setPassError('')
    if (newPass || confPass || oldPass) {
      if (!oldPass)            { setPassError("Saisissez l'ancien mot de passe."); return }
      if (newPass.length < 6)  { setPassError('Le nouveau mot de passe doit faire au moins 6 caractères.'); return }
      if (newPass !== confPass) { setPassError('Les mots de passe ne correspondent pas.'); return }
    }
    const userData = {
      ...stored,
      prenom:     form.prenom,
      nom:        form.nom,
      email:      form.email,
      whatsapp:   form.whatsapp,
      entreprise: form.entreprise,
      specialite: specialiteFinal,
      ifu:        form.ifu,
      rccm:       form.rccm,
      ...(newPass ? { password: newPass } : {}),
    }
    saveUserTechnicien(userData)
    window.dispatchEvent(new Event('storage'))
    if (supabase && form.email) {
      try {
        const { error } = await supabase.from('profiles').update({
          prenom:     form.prenom,
          nom:        form.nom,
          whatsapp:   form.whatsapp,
          entreprise: form.entreprise,
          specialite: specialiteFinal,
          ifu:        form.ifu,
          rccm:       form.rccm,
        }).eq('email', form.email) ?? {}
        if (error) console.error('[Supabase] profil update:', error)
      } catch (e) { console.error('[Supabase] profil exception:', e) }
    }
    setOldPass(''); setNewPass(''); setConfPass('')
    setEditWa(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const nomInitial = (form.nom?.[0] || 'U').toUpperCase()
  const fullName   = [form.prenom, form.nom].filter(Boolean).join(' ')
  const roleLabel  = stored.role === 'admin'      ? 'Administrateur'
                   : stored.role === 'technicien' ? 'Technicien'
                   : 'Particulier'

  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <div className={styles.inner}>
        <button className={styles.btnRetour} onClick={() => navigate(-1)}>
          <ChevronLeft size={18} /> Retour
        </button>

        <div className={styles.avatarBlock}>
          <div className={styles.bigCircle}>{nomInitial}</div>
          <h2 className={styles.userName}>{fullName || 'Utilisateur'}</h2>
          <span className={styles.badge}>{roleLabel}</span>
        </div>

        {/* ── Informations personnelles ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Informations personnelles</h3>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Prénom</label>
            <div className={styles.inputWrap}>
              <input value={form.prenom} onChange={e => update('prenom', e.target.value)} placeholder="Prénom" className={styles.input} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Nom</label>
            <div className={styles.inputWrap}>
              <input value={form.nom} onChange={e => update('nom', e.target.value)} placeholder="Nom" className={styles.input} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Email</label>
            <div className={styles.readBox}>{form.email || '–'}</div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>WhatsApp</label>
            <div className={styles.waRow}>
              {editWa ? (
                <div className={styles.inputWrap}>
                  <span className={styles.prefix}>🇧🇯 +229</span>
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => update('whatsapp', formatWa(e.target.value))}
                    placeholder="XX XX XX XX XX"
                    className={styles.input}
                    maxLength={14}
                    autoFocus
                  />
                </div>
              ) : (
                <div className={`${styles.readBox} ${styles.readBoxFlex}`}>
                  <span>{form.whatsapp ? `+229 ${form.whatsapp}` : '–'}</span>
                </div>
              )}
              <button className={styles.btnModif} onClick={() => setEditWa(v => !v)}>
                {editWa ? 'Annuler' : 'Modifier'}
              </button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Entreprise</label>
            <div className={styles.inputWrap}>
              <input value={form.entreprise} onChange={e => update('entreprise', e.target.value)} placeholder="Nom de l'entreprise" className={styles.input} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Spécialité</label>
            {form.specialite === 'Autre' ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div className={styles.inputWrap} style={{ flex: 1 }}>
                  <input
                    value={form.specialiteAutre}
                    onChange={e => update('specialiteAutre', e.target.value)}
                    placeholder="Ex : Électromécanicien"
                    className={styles.input}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { update('specialite', ''); update('specialiteAutre', '') }}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'rgba(255,255,255,0.6)', padding: '0.72rem 0.9rem', cursor: 'pointer', fontSize: '0.95rem', lineHeight: 1, fontFamily: 'inherit', flexShrink: 0 }}
                >
                  ‹
                </button>
              </div>
            ) : (
              <select
                value={form.specialite}
                onChange={e => update('specialite', e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 9, padding: '0.72rem 0.9rem', color: form.specialite ? '#fff' : 'rgba(255,255,255,0.28)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Choisissez une spécialité --</option>
                {SPECIALITES.map(s => (
                  <option key={s} value={s} style={{ background: '#0f172a' }}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>IFU</label>
            <div className={styles.inputWrap}>
              <input value={form.ifu} onChange={e => update('ifu', e.target.value)} placeholder="Numéro IFU" className={styles.input} />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>RCCM</label>
            <div className={styles.inputWrap}>
              <input value={form.rccm} onChange={e => update('rccm', e.target.value)} placeholder="Numéro RCCM" className={styles.input} />
            </div>
          </div>
        </section>

        {/* ── Sécurité ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Sécurité — Changer le mot de passe</h3>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Ancien mot de passe</label>
            <div className={styles.inputWrap}>
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPass}
                onChange={e => setOldPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowOld(v => !v)}>
                {showOld ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Nouveau mot de passe</label>
            <div className={styles.inputWrap}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.label}>Confirmer</label>
            <div className={styles.inputWrap}>
              <input
                type={showConf ? 'text' : 'password'}
                value={confPass}
                onChange={e => setConfPass(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowConf(v => !v)}>
                {showConf ? <EyeOff size={16} color="rgba(255,255,255,0.38)" /> : <Eye size={16} color="rgba(255,255,255,0.38)" />}
              </button>
            </div>
          </div>

          {passError && <p className={styles.error}>{passError}</p>}
        </section>

        <button className={styles.btnSave} onClick={handleSave}>
          {saved
            ? <><Check size={18} /> Modifications enregistrées</>
            : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
