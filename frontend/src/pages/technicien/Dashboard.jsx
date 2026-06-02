import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import { supabase } from '../../utils/supabaseClient'
import { saveTechnicien, getUserTechnicien, clearTechnicien } from '../../utils/storage'
import SidebarTech from '../../components/SidebarTech'

export default function DashboardTech() {
  const navigate = useNavigate()
  const [user, setUser] = useState(getUserTechnicien)

  const [userId,        setUserId]        = useState(null)
  const [nbProjets,     setNbProjets]     = useState(null)
  const [abonnement,    setAbonnement]    = useState(undefined) // undefined = chargement
  const [dernierProjet, setDernierProjet] = useState(null)
  const [showPopup,     setShowPopup]     = useState(false)
  const [nomProjet,     setNomProjet]     = useState('')

  useEffect(() => {
    const handler = () => setUser(getUserTechnicien())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const initiales = [user.prenom?.[0], user.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'T'
  const fullName  = [user.prenom, user.nom].filter(Boolean).join(' ') || 'Technicien'

  const load = useCallback(async () => {
    if (!supabase || !user.email) return
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle()
      const uid = profile?.id
      if (!uid) return
      setUserId(uid)

      const [
        { count, error: e1 },
        { data: aboList, error: e2 },
        { data: projets, error: e3 },
      ] = await Promise.all([
        supabase.from('projets_technicien').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('abonnements').select('date_fin, date_debut, type, statut').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
        supabase.from('projets_technicien').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
      ])
      if (e1) console.error('[Supabase] projets count:', e1)
      if (e2) console.error('[Supabase] abonnements:', e2)
      if (e3) console.error('[Supabase] dernierProjet:', e3)

      setNbProjets(count ?? 0)
      setAbonnement(aboList?.[0] || null)
      setDernierProjet(projets?.[0] || null)
    } catch (e) {
      console.error('[Dashboard load]', e)
    }
  }, [user.email])

  useEffect(() => { load() }, [load])

  const getAboBadge = () => {
    if (abonnement === undefined) return null
    if (!abonnement) return { text: 'Aucun abonnement', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#EF4444', renew: true, btnColor: '#EF4444', btnText: 'Souscrire' }
    if (abonnement.type === 'unique') return { text: 'Abonnement à usage unique', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#F59E0B', renew: false }
    const joursRestants = Math.ceil((new Date(abonnement.date_fin) - new Date()) / (1000 * 60 * 60 * 24))
    if (joursRestants <= 0) return { text: 'Abonnement expiré',                                             bg: 'rgba(239,68,68,0.15)',    border: 'rgba(239,68,68,0.4)',    color: '#EF4444', renew: true, btnColor: '#EF4444', btnText: 'Renouveler' }
    if (joursRestants <= 3) return { text: `Expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''} !`, bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', color: '#EF4444', renew: true, btnColor: '#EF4444', btnText: 'Renouveler' }
    if (joursRestants <= 7) return { text: `Expire dans ${joursRestants} jours`,                             bg: 'rgba(245,158,11,0.15)',   border: 'rgba(245,158,11,0.4)',   color: '#F59E0B', renew: true, btnColor: '#F59E0B', btnText: 'Renouveler' }
    return { text: 'Abonnement actif', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', color: '#10B981', renew: false }
  }

  const handleCommencer = () => {
    if (nomProjet.trim().length < 3) return
    clearTechnicien()
    saveTechnicien({ ...getUserTechnicien() })
    saveTechnicien({ nom_projet: nomProjet.trim(), projet_id: null })
    setShowPopup(false)
    navigate('/localisation-tech')
  }

  const handleOuvrir = (projet) => {
    saveTechnicien({
      projet_id:    projet.id,
      etude:        projet.etude,
      localisation: projet.localisation,
      appareils:    projet.appareils,
      nom_projet:   projet.nom_projet,
    })
    navigate('/localisation-tech')
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

  const badge = getAboBadge()

  const renderAboInfo = () => {
    if (abonnement === undefined) return (
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>Chargement…</p>
    )
    if (!abonnement) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <p style={{ margin: 0, color: '#EF4444', fontSize: '0.9rem', fontWeight: 700 }}>Aucun abonnement</p>
        <button onClick={() => navigate('/paiement-tech')} style={{ alignSelf: 'flex-start', padding: '0.2rem 0.7rem', background: '#EF4444', border: 'none', borderRadius: 20, color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Souscrire</button>
      </div>
    )
    if (abonnement.type === 'unique') return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>Type : Usage unique</span>
        <span style={{ alignSelf: 'flex-start', display: 'inline-block', padding: '0.2rem 0.6rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, color: '#F59E0B', fontSize: '0.75rem', fontWeight: 700 }}>
          Abonnement à usage unique
        </span>
      </div>
    )

    const joursRestants = Math.ceil((new Date(abonnement.date_fin) - new Date()) / (1000 * 60 * 60 * 24))
    const expired = joursRestants <= 0

    let badgeText, badgeBg, badgeBorder, badgeColor, showBtn, btnColor
    if (expired)             { badgeText = 'Abonnement expiré';                                              badgeBg = 'rgba(239,68,68,0.15)';    badgeBorder = 'rgba(239,68,68,0.4)';    badgeColor = '#EF4444'; showBtn = true;  btnColor = '#EF4444' }
    else if (joursRestants <= 3) { badgeText = `Expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''} !`; badgeBg = 'rgba(239,68,68,0.15)';    badgeBorder = 'rgba(239,68,68,0.4)';    badgeColor = '#EF4444'; showBtn = true;  btnColor = '#EF4444' }
    else if (joursRestants <= 7) { badgeText = `Expire dans ${joursRestants} jours`;                         badgeBg = 'rgba(245,158,11,0.15)';   badgeBorder = 'rgba(245,158,11,0.4)';   badgeColor = '#F59E0B'; showBtn = true;  btnColor = '#F59E0B' }
    else                         { badgeText = 'Abonnement actif';                                           badgeBg = 'rgba(16,185,129,0.15)';   badgeBorder = 'rgba(16,185,129,0.35)';  badgeColor = '#10B981'; showBtn = false }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>Type : {abonnement.type === 'mensuel' ? 'Mensuel' : 'Annuel'}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>Début : {fmtDate(abonnement.date_debut)}</span>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>Fin : {fmtDate(abonnement.date_fin)}</span>
        <span style={{ color: expired ? '#EF4444' : '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>
          {expired ? `Expiré le ${fmtDate(abonnement.date_fin)}` : `Reste : ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`}
        </span>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.15rem' }}>
          <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: 20, color: badgeColor, fontSize: '0.75rem', fontWeight: 700 }}>
            {badgeText}
          </span>
          {showBtn && (
            <button onClick={() => navigate('/paiement-tech')} style={{ padding: '0.2rem 0.6rem', background: btnColor, border: 'none', borderRadius: 20, color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
              Renouveler
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.75)', zIndex: 0 }} />

      <SidebarTech />

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 1, marginLeft: 190, minHeight: '100vh', padding: '2rem 2rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Bannière bienvenue */}
        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: '0 0 0.3rem', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
              Bienvenue, Mr {fullName}
            </p>
            <p style={{ margin: '0 0 0.6rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
              Votre espace de dimensionnement solaire
            </p>
            {badge && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 20, color: badge.color, fontSize: '0.78rem', fontWeight: 700 }}>
                  {badge.text}
                </span>
                {badge.renew && (
                  <button
                    onClick={() => navigate('/paiement-tech')}
                    style={{ padding: '0.25rem 0.75rem', background: badge.btnColor, border: 'none', borderRadius: 20, color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {badge.btnText}
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,158,11,0.18)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', fontSize: '1.3rem', fontWeight: 800, flexShrink: 0 }}>
            {initiales}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <StatCard label="Mes projets" value={nbProjets ?? '—'} color="#F59E0B" />
          <div style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.22)', borderRadius: 12, padding: '1.1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Abonnement</p>
            {renderAboInfo()}
          </div>
        </div>

        {/* Bouton nouveau projet */}
        <button
          onClick={() => { setNomProjet(''); setShowPopup(true) }}
          style={{ width: '100%', padding: '0.9rem', background: '#F59E0B', border: 'none', borderRadius: 12, color: '#1E293B', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em' }}
        >
          + Nouveau projet
        </button>

        {/* Dernier projet */}
        {dernierProjet && (
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.2rem 1.5rem' }}>
            <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Dernier projet
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                  {dernierProjet.nom_projet}
                </p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                  {fmtDate(dernierProjet.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleOuvrir(dernierProjet)}
                style={{ padding: '0.5rem 1.2rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 8, color: '#F59E0B', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Ouvrir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popup nouveau projet */}
      {showPopup && (
        <div
          onClick={() => setShowPopup(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem 2rem 1.8rem', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}
          >
            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 800, textAlign: 'center' }}>
              Nouveau projet
            </h2>
            <div style={{ width: '100%' }}>
              <label style={{ display: 'block', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', marginBottom: '0.6rem' }}>
                Nom du projet
              </label>
              <input
                type="text"
                value={nomProjet}
                onChange={e => setNomProjet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCommencer()}
                placeholder="Nommez votre projet"
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', width: '100%' }}>
              <button
                onClick={() => setShowPopup(false)}
                style={{ flex: 1, padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ‹ Retour
              </button>
              <button
                onClick={handleCommencer}
                disabled={nomProjet.trim().length < 3}
                style={{ flex: 1, padding: '0.7rem', background: nomProjet.trim().length >= 3 ? '#F59E0B' : 'rgba(245,158,11,0.2)', border: 'none', borderRadius: 9, color: nomProjet.trim().length >= 3 ? '#1E293B' : 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontWeight: 700, cursor: nomProjet.trim().length >= 3 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}
              >
                Commencer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, small }) {
  return (
    <div style={{ background: `rgba(${hexToRgb(color)},0.07)`, border: `1px solid rgba(${hexToRgb(color)},0.22)`, borderRadius: 12, padding: '1.1rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
      <p style={{ margin: 0, color, fontSize: small ? '1.3rem' : '2rem', fontWeight: 800 }}>{value}</p>
    </div>
  )
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}
