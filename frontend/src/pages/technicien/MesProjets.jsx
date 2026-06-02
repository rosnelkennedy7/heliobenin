import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import vitreImg from '../../assets/images/vitre.webp'
import { supabase } from '../../utils/supabaseClient'
import { saveTechnicien, getUserTechnicien } from '../../utils/storage'
import SidebarTech from '../../components/SidebarTech'

export default function MesProjets() {
  const navigate = useNavigate()
  const user     = getUserTechnicien()

  const [projets,       setProjets]       = useState([])
  const [search,        setSearch]        = useState('')
  const [loading,       setLoading]       = useState(true)
  const [deleteTarget,  setDeleteTarget]  = useState(null) // projet à supprimer
  const [deleting,      setDeleting]      = useState(false)
  const [toast,         setToast]         = useState('')

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
      projet_id:    projet.id,
      etude:        projet.etude,
      localisation: projet.localisation,
      appareils:    projet.appareils,
      nom_projet:   projet.nom_projet,
    })
    navigate('/localisation-tech')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('projets_technicien').delete().eq('id', deleteTarget.id)
      if (error) throw error
      setProjets(prev => prev.filter(p => p.id !== deleteTarget.id))
      setToast('Projet supprimé')
      setTimeout(() => setToast(''), 2500)
    } catch (e) {
      console.error('[MesProjets delete]', e)
      setToast('Erreur lors de la suppression.')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
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

        {/* Liste */}
        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>Chargement...</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: '2.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem' }}>
              {search ? 'Aucun résultat pour cette recherche.' : "Aucun projet pour l'instant."}
            </p>
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
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => handleOuvrir(p)}
                      style={{ padding: '0.45rem 1.1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#F59E0B', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Ouvrir
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      style={{ padding: '0.45rem 0.6rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, color: '#EF4444', cursor: 'pointer', lineHeight: 0 }}
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popup confirmation suppression */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', textAlign: 'center' }}
          >
            <div style={{ fontSize: '2rem' }}>🗑️</div>
            <div>
              <h2 style={{ margin: '0 0 0.4rem', color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>Supprimer ce projet ?</h2>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                « {deleteTarget.nom_projet || 'Projet sans nom'} »
              </p>
              <p style={{ margin: '0.4rem 0 0', color: '#EF4444', fontSize: '0.8rem' }}>Cette action est irréversible.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ flex: 1, padding: '0.75rem', background: '#EF4444', border: 'none', borderRadius: 10, color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {deleting ? '…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: toast.includes('Erreur') ? '#EF4444' : '#10B981', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 10, fontWeight: 700, zIndex: 100, fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
