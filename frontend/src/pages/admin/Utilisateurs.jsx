import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import vitreImg from '../../assets/images/vitre.webp'

const API = import.meta.env.VITE_API_URL || 'http://51.75.35.141:8000'

export default function AdminUtilisateurs() {
  const navigate = useNavigate()
  const [utilisateurs, setUtilisateurs] = useState([])
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/utilisateurs`)
      const data = await res.json()
      setUtilisateurs(data)
    } catch {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = utilisateurs.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.nom || '').toLowerCase().includes(q) ||
      (u.prenom || '').toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, color: '#fff', fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{
        background: 'rgba(15,23,42,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.9rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }}
          >
            ‹
          </button>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F59E0B' }}>Utilisateurs</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par email, nom..."
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: '1rem',
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: 9, padding: '0.7rem 1rem',
            color: '#fff', fontSize: '0.95rem', outline: 'none', fontFamily: 'inherit',
          }}
        />

        {error && <p style={{ color: '#EF4444', fontSize: '0.9rem' }}>{error}</p>}

        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Chargement...</p>
          ) : filtered.length === 0 ? (
            <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
              {search ? 'Aucun résultat' : 'Aucun utilisateur enregistré'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                    {['Nom', 'Prénom', 'Email', 'Rôle', 'Inscrit le'].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <tr key={u.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.55rem 0.8rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{u.nom || '—'}</td>
                      <td style={{ padding: '0.55rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>{u.prenom || '—'}</td>
                      <td style={{ padding: '0.55rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>{u.email || '—'}</td>
                      <td style={{ padding: '0.55rem 0.8rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: u.role === 'technicien' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.12)', color: u.role === 'technicien' ? '#818CF8' : '#10B981' }}>
                          {u.role || 'particulier'}
                        </span>
                      </td>
                      <td style={{ padding: '0.55rem 0.8rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
