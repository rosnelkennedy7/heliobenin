import { useState } from 'react'
import vitreImg from '../../assets/images/vitre.webp'
import { getUserTechnicien, saveUserTechnicien } from '../../utils/storage'
import SidebarTech from '../../components/SidebarTech'

export default function ProfilTech() {
  const initial = getUserTechnicien()

  const [form, setForm]   = useState({
    prenom:     initial.prenom     || '',
    nom:        initial.nom        || '',
    email:      initial.email      || '',
    whatsapp:   initial.whatsapp   || '',
    entreprise: initial.entreprise || '',
    specialite: initial.specialite || '',
    ifu:        initial.ifu        || '',
    rccm:       initial.rccm       || '',
  })
  const [saved, setSaved] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = () => {
    saveUserTechnicien({ ...initial, ...form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const initiales = [form.prenom?.[0], form.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'T'

  const fields = [
    { key: 'prenom',     label: 'Prénom',     readOnly: false },
    { key: 'nom',        label: 'Nom',        readOnly: false },
    { key: 'email',      label: 'Email',      readOnly: true  },
    { key: 'whatsapp',   label: 'WhatsApp',   readOnly: false },
    { key: 'entreprise', label: 'Entreprise', readOnly: false },
    { key: 'specialite', label: 'Spécialité', readOnly: false },
    { key: 'ifu',        label: 'IFU',        readOnly: false },
    { key: 'rccm',       label: 'RCCM',       readOnly: false },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 0 }} />

      <SidebarTech />

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 1, marginLeft: 190, minHeight: '100vh', padding: '2rem 2rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 600 }}>

        {/* Titre + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.18)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', fontSize: '1.4rem', fontWeight: 800, flexShrink: 0 }}>
            {initiales}
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>Mon profil</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>Technicien</p>
          </div>
        </div>

        {/* Formulaire */}
        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {fields.map(({ key, label, readOnly }) => (
            <div key={key}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                {label}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={set(key)}
                readOnly={readOnly}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: readOnly ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${readOnly ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8, padding: '0.65rem 0.9rem',
                  color: readOnly ? 'rgba(255,255,255,0.35)' : '#fff',
                  fontSize: '0.92rem', fontFamily: 'inherit', outline: 'none',
                  cursor: readOnly ? 'default' : 'text',
                }}
              />
            </div>
          ))}
        </div>

        {/* Bouton sauvegarder */}
        <button
          onClick={handleSave}
          style={{ padding: '0.85rem', background: saved ? '#10B981' : '#F59E0B', border: 'none', borderRadius: 10, color: '#1E293B', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', transition: 'background 0.2s' }}
        >
          {saved ? '✓ Modifications enregistrées' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
