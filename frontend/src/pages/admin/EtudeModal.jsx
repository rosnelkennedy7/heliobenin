const fmt = n => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export default function EtudeModal({ etude, onClose }) {
  if (!etude) return null
  const r = etude.resultat || {}
  const bilan     = r.bilan     || {}
  const onduleur  = r.onduleur  || {}
  const panneaux  = r.panneaux  || {}
  const batteries = r.batteries || {}
  const cables    = r.cables    || []

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: '1.5rem',
          width: '100%', maxWidth: 620,
          maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>
            Détail étude — {etude.mode_budget === 'avec_budget' ? 'Avec budget' : 'Sans budget'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
        </div>

        <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          {new Date(etude.created_at).toLocaleString('fr-FR')} — Mode : {etude.mode} — Irr. {etude.irradiation} kWh/m²/j
        </p>

        {/* 4 cartes colorées */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
          <InfoCard color="#10B981" label="Onduleur" lines={[
            onduleur.marque ? `${onduleur.marque} ${onduleur.modele || ''}` : '—',
            onduleur.puissance_va ? `${fmt(onduleur.puissance_va)} VA` : '',
            onduleur.tension_usys ? `${onduleur.tension_usys}V` : '',
          ]} />
          <InfoCard color="#F59E0B" label="Panneaux" lines={[
            panneaux.nombre ? `${panneaux.nombre} panneau${panneaux.nombre > 1 ? 'x' : ''}` : '—',
            panneaux.puissance_unitaire ? `${panneaux.puissance_unitaire}Wc/u` : '',
            panneaux.puissance_totale ? `Total : ${fmt(panneaux.puissance_totale)}Wc` : '',
          ]} />
          <InfoCard color="#6366F1" label="Batteries" lines={[
            batteries.nombre ? `${batteries.nombre} batterie${batteries.nombre > 1 ? 's' : ''}` : '—',
            batteries.tension ? `${batteries.tension}V` : '',
            batteries.capacite_unitaire ? `${batteries.capacite_unitaire}Ah/u` : '',
          ]} />
          <InfoCard color="#EC4899" label="Bilan" lines={[
            bilan.ej ? `Ej = ${fmt(bilan.ej)} Wh/j` : '—',
            bilan.pond ? `Pond = ${fmt(bilan.pond)} Wh/j` : '',
            bilan.pc ? `Pc = ${fmt(bilan.pc)} W` : '',
          ]} />
        </div>

        {/* Appareils */}
        {etude.appareils?.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Appareils ({etude.appareils.length})
            </p>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                    {['Appareil', 'Puiss.', 'Qté', 'H/jour', 'H/nuit'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {etude.appareils.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.85)' }}>{a.nom}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{a.puissance}W</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{a.quantite}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{a.h_jour}h</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{a.h_nuit}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Câbles */}
        {cables.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.4rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Câbles & protections
            </p>
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.95)' }}>
                    {['Tronçon', 'Section', 'Long.', 'Fusible'].map(h => (
                      <th key={h} style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cables.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.85)' }}>{c.troncon}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{c.section_mm2} mm²</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{c.longueur_m} m</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'rgba(255,255,255,0.7)' }}>{c.fusible_a} A</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ color, label, lines }) {
  return (
    <div style={{
      background: `rgba(${hexToRgb(color)}, 0.08)`,
      border: `1px solid rgba(${hexToRgb(color)}, 0.25)`,
      borderRadius: 10, padding: '0.8rem 1rem',
    }}>
      <p style={{ margin: '0 0 0.4rem', color, fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      {lines.filter(Boolean).map((l, i) => (
        <p key={i} style={{ margin: i === 0 ? '0' : '0.1rem 0 0', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: i === 0 ? '0.9rem' : '0.78rem', fontWeight: i === 0 ? 600 : 400 }}>{l}</p>
      ))}
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
