import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'
import { supabase } from '../../utils/supabaseClient'
import { saveTechnicien, getUserTechnicien } from '../../utils/storage'
import SidebarTech from '../../components/SidebarTech'

export default function MesProjets() {
  const navigate = useNavigate()
  const user     = getUserTechnicien()

  const [projets,   setProjets]   = useState([])
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [showPopup, setShowPopup] = useState(false)
  const [nomProjet, setNomProjet] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !user.email) { setLoading(false); return }
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', user.email).maybeSingle()
      const uid = profile?.id
      if (!uid) { setLoading(false); return }

      const { data, error } = await supabase
        .from('projets_technicien')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (error) console.error('[Supabase] projets_technicien:', error)
      setProjets(data || [])
    } catch (e) {
      console.error('[MesProjets load]', e)
    } finally {
      setLoading(false)
    }
  }, [user.email])

  useEffect(() => { load() }, [load])

  const filtered = projets.filter(p =>
    (p.nom_projet || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleOuvrir = (projet) => {
    saveTechnicien({
      etude:        projet.etude,
      localisation: projet.localisation,
      appareils:    projet.appareils,
      nom_projet:   projet.nom_projet,
    })
    navigate('/etude-tech')
  }

  const handleCommencer = () => {
    if (nomProjet.trim().length < 3) return
    saveTechnicien({ nom_projet: nomProjet.trim() })
    setShowPopup(false)
    navigate('/localisation-tech')
  }

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 0 }} />

      <SidebarTech />

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 1, marginLeft: 190, minHeight: '100vh', padding: '2rem 2rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

        {/* Titre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>Mes projets</h1>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
            {filtered.length} projet{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Barre de recherche */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un projet..."
          style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '0.7rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit' }}
        />

        {/* Bouton nouveau projet */}
        <button
          onClick={() => { setNomProjet(''); setShowPopup(true) }}
          style={{ width: '100%', padding: '0.85rem', background: '#F59E0B', border: 'none', borderRadius: 12, color: '#1E293B', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }}
        >
          + Nouveau projet
        </button>

        {/* Liste */}
        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>Chargement...</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', textAlign: 'center' }}>
                {search ? 'Aucun résultat pour cette recherche.' : 'Aucun projet pour l\'instant.'}
              </p>
              {!search && (
                <button
                  onClick={() => navigate('/dashboard-tech')}
                  style={{ padding: '0.6rem 1.4rem', background: '#F59E0B', border: 'none', borderRadius: 9, color: '#1E293B', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  + Nouveau projet
                </button>
              )}
            </div>
          ) : (
            <div>
              {filtered.map((p, i) => (
                <div
                  key={p.id || i}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.4rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', gap: '1rem', flexWrap: 'wrap' }}
                >
                  <div>
                    <p style={{ margin: '0 0 0.2rem', color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                      {p.nom_projet || 'Projet sans nom'}
                    </p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '0.78rem' }}>
                      {fmtDate(p.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOuvrir(p)}
                    style={{ padding: '0.45rem 1.1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#F59E0B', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Ouvrir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
                placeholder="Résidence KOKOUN Donald"
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
