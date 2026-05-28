import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import EtudeModal from './EtudeModal'
import vitreImg from '../../assets/images/vitre.webp'
import { supabase } from '../../utils/supabaseClient'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [nbUsers, setNbUsers]   = useState(null)
  const [etudes, setEtudes]     = useState([])
  const [avis, setAvis]         = useState([])
  const [noteInfo, setNoteInfo] = useState(null)
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    if (!supabase) { setError('Supabase non configuré'); return }
    try {
      const [
        { count: usersCount, error: e1 },
        { data: etudesData,  error: e2 },
        { data: avisData,    error: e3 },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('etudes_particulier').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('avis').select('*').order('created_at', { ascending: false }),
      ])
      if (e1) console.error('[Supabase] profiles count:', e1)
      if (e2) console.error('[Supabase] etudes_particulier:', e2)
      if (e3) console.error('[Supabase] avis:', e3)
      setNbUsers(usersCount ?? 0)
      setEtudes(etudesData || [])
      setAvis(avisData || [])
      if (avisData?.length) {
        const avg = avisData.reduce((sum, r) => sum + (r.note || 0), 0) / avisData.length
        setNoteInfo({ avg: avg.toFixed(1), count: avisData.length })
      }
    } catch (e) {
      console.error('[Dashboard load]', e)
      setError('Erreur de chargement')
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ minHeight: '100vh', backgroundImage: `url(${vitreImg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, color: '#fff', fontFamily: 'inherit' }}>

        {/* Header */}
        <div style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <span style={{ fontSize: '1.3rem' }}>☀️</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F59E0B' }}>HélioBénin Admin</span>
          </div>
          <button
            onClick={() => navigate('/admin/utilisateurs')}
            style={{ padding: '0.45rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Utilisateurs
          </button>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>
          {error && <p style={{ color: '#EF4444', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Études" value={etudes.length} color="#F59E0B" />
            <StatCard label="Utilisateurs" value={nbUsers ?? '—'} color="#10B981" />
            {noteInfo && <StatCard label="Note moyenne" value={`${noteInfo.avg} ⭐`} sub={`${noteInfo.count} avis`} color="#A78BFA" />}
          </div>

          {/* Études table */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                Études récentes ({etudes.length})
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {etudes.length === 0 ? (
                <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Aucune étude enregistrée</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                      {['Date', 'Mode budget', 'Mode', 'Irr.', 'Budget', 'Appareils', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {etudes.map((e, i) => (
                      <tr key={e.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                          {e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: e.mode_budget === 'avec_budget' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: e.mode_budget === 'avec_budget' ? '#F59E0B' : '#10B981' }}>
                            {e.mode_budget === 'avec_budget' ? 'Avec budget' : 'Sans budget'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>{e.mode || '—'}</td>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>{e.irradiation ? `${e.irradiation} kWh` : '—'}</td>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                          {e.budget ? `${Math.round(e.budget).toLocaleString('fr-FR')} FCFA` : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                          {e.appareils?.length || 0}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem' }}>
                          <button
                            onClick={() => setSelected(e)}
                            style={{ padding: '0.3rem 0.7rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 5, color: '#F59E0B', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Avis table */}
          <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                Avis ({avis.length})
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {avis.length === 0 ? (
                <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>Aucun avis enregistré</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                      {['Date', 'Rôle', 'Note ⭐', 'Commentaire'].map(h => (
                        <th key={h} style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {avis.map((a, i) => (
                      <tr key={a.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
                          {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: a.role === 'technicien' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.12)', color: a.role === 'technicien' ? '#818CF8' : '#10B981' }}>
                            {a.role || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem', color: '#F59E0B', fontWeight: 700, letterSpacing: '0.05em' }}>
                          {'★'.repeat(a.note || 0)}{'☆'.repeat(5 - (a.note || 0))}
                        </td>
                        <td style={{ padding: '0.5rem 0.8rem', color: 'rgba(255,255,255,0.6)', maxWidth: 300 }}>
                          {a.commentaire || <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {selected && <EtudeModal etude={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: `rgba(${hexToRgb(color)}, 0.07)`, border: `1px solid rgba(${hexToRgb(color)}, 0.2)`, borderRadius: 12, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, color, fontSize: '2rem', fontWeight: 800 }}>{value ?? '—'}</p>
      {sub && <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{sub}</p>}
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
