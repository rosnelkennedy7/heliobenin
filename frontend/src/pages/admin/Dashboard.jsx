import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import EtudeModal from './EtudeModal'
import vitreImg from '../../assets/images/vitre.webp'

const API = import.meta.env.VITE_API_URL || 'http://51.75.35.141:8000'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]       = useState(null)
  const [etudes, setEtudes]     = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState('')

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetch(`${API}/api/admin/stats`).then(r => r.json()),
        fetch(`${API}/api/admin/etudes`).then(r => r.json()),
      ])
      setStats(s)
      setEtudes(e)
    } catch {
      setError('Erreur de chargement')
    }
  }, [])

  useEffect(() => { load() }, [load])

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
        {error && (
          <p style={{ color: '#EF4444', fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
        )}

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Études" value={stats.nb_etudes} color="#F59E0B" />
            <StatCard label="Utilisateurs" value={stats.nb_utilisateurs} color="#10B981" />
          </div>
        )}

        {/* Études table */}
        <div style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '0.9rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              Études récentes ({etudes.length})
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {etudes.length === 0 ? (
              <p style={{ margin: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
                Aucune étude enregistrée
              </p>
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
      </div>

      {selected && <EtudeModal etude={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: `rgba(${hexToRgb(color)}, 0.07)`,
      border: `1px solid rgba(${hexToRgb(color)}, 0.2)`,
      borderRadius: 12, padding: '1.2rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: 0, color, fontSize: '2rem', fontWeight: 800 }}>{value ?? '—'}</p>
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
