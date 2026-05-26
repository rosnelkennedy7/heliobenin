import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Search, Check } from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.png'
import AvatarTech from '../../components/AvatarTech'
import { defaultHours } from '../../utils/defaultHours'
import { saveTechnicien, getTechnicien } from '../../utils/storage'
import { API_BASE } from '../../utils/api'
import styles from './AppareilsTech.module.css'

/* ── Catégories ──────────────────────────────────────── */
const CATEGORIES = ['Eclairage','Climatisation','Audiovisuel','Cuisine','Informatique','Electroménager','Autre']
const CAT_ICONS  = { Eclairage:'🔆', Climatisation:'❄️', Audiovisuel:'📺', Cuisine:'🍳', Informatique:'💻', Electroménager:'🏠', Autre:'⚡' }

/* ── Stepper 5 étapes ────────────────────────────────── */
const STEPS = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']

function Stepper({ active }) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((step, i) => (
        <div key={step} className={styles.stepWrap}>
          <div className={styles.stepItem}>
            <div className={`${styles.stepDot} ${i === active ? styles.stepDotActive : ''} ${i < active ? styles.stepDotDone : ''}`}>
              {i < active ? <Check size={20} strokeWidth={3} /> : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === active ? styles.stepLabelActive : ''}`}>{step}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Modale appareils ────────────────────────────────── */
function AppareilsModal({ open, onClose, onSelect, appareils }) {
  const [q, setQ] = useState('')
  if (!open) return null

  const filtered = appareils.filter(a =>
    !q.trim() || a.nom.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '90%', maxWidth: 600, borderRadius: 10, overflow: 'hidden', background: 'rgba(15,23,42,0.98)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Plus size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>Ajouter un appareil</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', padding: '0 2px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Recherche */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '6px 10px' }}>
            <Search size={13} color="rgba(255,255,255,0.35)" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher un appareil…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Liste groupée */}
        <div style={{ maxHeight: 400, overflowY: 'auto', background: 'rgba(15,23,42,0.90)' }}>
          {CATEGORIES.map(cat => {
            const items = filtered.filter(a => a.categorie === cat)
            if (!items.length) return null
            return (
              <div key={cat}>
                <div style={{ padding: '6px 14px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(245,158,11,0.7)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  {CAT_ICONS[cat]} {cat}
                </div>
                {items.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { onSelect(a); onClose() }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.05)', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#fff' }}>{a.nom}</span>
                    <span style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>{a.puissance} W</span>
                  </button>
                ))}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
              Aucun résultat pour « {q} »
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function AppareilsTech() {
  const navigate = useNavigate()

  const [rows, setRows] = useState(() => {
    const sv = getTechnicien()
    return (sv.appareils || []).map(a => ({
      id: Date.now() + Math.random(),
      nom: a.nom || '',
      puissance: a.puissance || 0,
      quantite: a.quantite || 1,
      hJour: a.hJour ?? a.h_jour ?? 4,
      hNuit: a.hNuit ?? a.h_nuit ?? 0,
      typeCharge: a.typeCharge || 'Résistif',
      facteurPointe: a.facteurPointe || 1.0,
      isManual: false,
    }))
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [appareils, setAppareils] = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/appareils`)
      .then(r => r.json())
      .then(setAppareils)
      .catch(() => {})
  }, [])

  /* ── Dérivés ── */
  const hasOverflow  = rows.some(r => (r.hJour || 0) + (r.hNuit || 0) > 24)
  const canProceed   = rows.length > 0 && !hasOverflow
  const totPuissance = Math.round(rows.reduce((s, r) => s + r.puissance * r.quantite, 0))
  const totEnergie   = Math.round(rows.reduce((s, r) => s + r.puissance * r.quantite * ((r.hJour || 0) + (r.hNuit || 0)), 0))
  const totPointe    = Math.round(rows.reduce((s, r) => s + r.puissance * r.quantite * r.facteurPointe, 0))

  /* ── Lignes ── */
  const updateRow = (id, key, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRow = (id) =>
    setRows(prev => prev.filter(r => r.id !== id))

  const addLigne = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: '', puissance: 0, quantite: 1,
      hJour: 4, hNuit: 0,
      typeCharge: 'Résistif', facteurPointe: 1.0,
      isManual: false,
    }])
  }

  const selectFromModal = (app) => {
    if (rows.length >= 50) return
    const { hJour, hNuit } = defaultHours(app.nom, app.categorie)
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: app.nom, puissance: app.puissance,
      quantite: 1, hJour, hNuit,
      typeCharge: app.typeCharge, facteurPointe: app.facteurPointe,
      isManual: false,
    }])
  }

  const addManual = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: '', puissance: 0, quantite: 1,
      hJour: 4, hNuit: 0,
      typeCharge: 'Manuel', facteurPointe: 1.0,
      isManual: true,
    }])
  }


  /* ── Suivant ── */
  const handleSuivant = () => {
    if (!canProceed) return
    saveTechnicien({
      appareils: rows.map(r => ({
        nom:             r.nom,
        puissance:       r.puissance,
        quantite:        r.quantite,
        hJour:           r.hJour,
        hNuit:           r.hNuit,
        typeCharge:      r.typeCharge,
        facteurPointe:   r.facteurPointe,
        puissancePointe: Math.round(r.puissance * r.quantite * r.facteurPointe),
        wh_j:            r.puissance * r.quantite * ((r.hJour || 0) + (r.hNuit || 0)),
      })),
    })
    navigate('/etude-tech')
  }


  /* ════════════════════════════════════════════════════ */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={1} />} avatar={<AvatarTech />} />

      <div className={styles.inner}>

        {/* Boutons d'ajout — alignés à droite */}
        <div className={styles.actionsRow}>
          <button className={styles.btnAddLigne} onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Ajouter un appareil
          </button>
          <button className={styles.btnAddManual} onClick={addManual}>
            <Plus size={16} /> Ajouter manuellement
          </button>
        </div>

        {/* Tableau */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thApp}`}>Appareil</th>
                <th className={styles.th}>
                  <span>Puissance</span>
                  <span className={styles.thSub}>(W)</span>
                </th>
                <th className={styles.th}>Qté</th>
                <th className={styles.th}>
                  <span>Jour ☀️</span>
                  <span className={styles.thSub}>06h - 18h</span>
                </th>
                <th className={styles.th}>
                  <span>Nuit 🌙</span>
                  <span className={styles.thSub}>18h - 06h</span>
                </th>
                <th className={styles.th}>
                  <span>Coeff ⚡</span>
                  <span className={styles.thSub}>pointe</span>
                </th>
                <th className={styles.th}>
                  <span>P. Pointe</span>
                  <span className={styles.thSub}>(W) </span>
                </th>
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className={styles.emptyMsg}>
                    Ajoutez des appareils avec les boutons ci-dessus
                  </td>
                </tr>
              )}
              {rows.map(row => {
                const overflow        = (row.hJour || 0) + (row.hNuit || 0) > 24
                const puissancePointe = Math.round(row.puissance * row.quantite * row.facteurPointe)
                return (
                  <tr key={row.id} className={overflow ? styles.rowError : ''}>

                    {/* APPAREIL */}
                    <td className={`${styles.td} ${styles.tdApp}`}>
                      {row.isManual
                        ? <input
                            type="text"
                            value={row.nom}
                            onChange={e => updateRow(row.id, 'nom', e.target.value)}
                            placeholder="Nom de l'appareil"
                            className={styles.cellInput}
                          />
                        : <span className={styles.ddValue}>{row.nom || '—'}</span>
                      }
                    </td>

                    {/* PUISSANCE */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={0}
                        value={row.puissance}
                        onChange={e => updateRow(row.id, 'puissance', +e.target.value)}
                        className={`${styles.cellInput} ${styles.cellNum}`}
                      />
                    </td>

                    {/* QTÉ */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={1}
                        value={row.quantite}
                        onChange={e => updateRow(row.id, 'quantite', Math.max(1, +e.target.value))}
                        className={`${styles.cellInput} ${styles.cellNum}`}
                      />
                    </td>

                    {/* JOUR */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={0.1}
                        max={24}
                        step={0.1}
                        placeholder="0.1"
                        value={row.hJour}
                        onChange={e => updateRow(row.id, 'hJour', +e.target.value)}
                        className={`${styles.cellInput} ${styles.cellNum} ${overflow ? styles.cellInputError : ''}`}
                      />
                    </td>

                    {/* NUIT */}
                    <td className={styles.td}>
                      <div className={styles.cellNuitWrap}>
                        <input
                          type="number"
                          min={0.1}
                          max={24}
                          step={0.1}
                          placeholder="0.1"
                          value={row.hNuit}
                          onChange={e => updateRow(row.id, 'hNuit', +e.target.value)}
                          className={`${styles.cellInput} ${styles.cellNum} ${overflow ? styles.cellInputError : ''}`}
                        />
                        {overflow && <span className={styles.overflowMsg}>Total &gt; 24h</span>}
                      </div>
                    </td>

                    {/* COEFF POINTE */}
                    <td className={styles.td}>
                      <input
                        type="number"
                        min={1}
                        step={0.01}
                        value={row.facteurPointe}
                        onChange={e => updateRow(row.id, 'facteurPointe', Math.max(1, +e.target.value))}
                        className={`${styles.cellInput} ${styles.cellCoeff}`}
                      />
                    </td>

                    {/* PUISSANCE POINTE — lecture seule */}
                    <td className={styles.td}>
                      <div className={styles.cellReadonly}>
                        {puissancePointe > 0 ? puissancePointe : '—'}
                      </div>
                    </td>

                    {/* ACTION */}
                    <td className={styles.td}>
                      <button className={styles.trashBtn} onClick={() => deleteRow(row.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryBlock}>
              <span className={styles.summaryLabel}>Puissance totale</span>
              <span className={styles.summaryVal}>{totPuissance} W</span>
            </div>
            <div className={styles.summaryBlock}>
              <span className={styles.summaryLabel}>Énergie totale</span>
              <span className={styles.summaryVal}>{totEnergie} Wh/j</span>
            </div>
            <div className={styles.summaryBlock}>
              <span className={styles.summaryLabel}>Puissance de pointe</span>
              <span className={styles.summaryVal}>{totPointe} W</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className={styles.bottomNav}>
          <button className={styles.btnRetour} onClick={() => navigate('/localisation-tech')}>
            ‹ Retour
          </button>
          <button
            className={`${styles.btnSuivant} ${!canProceed ? styles.btnDisabled : ''}`}
            onClick={handleSuivant}
            disabled={!canProceed}
          >
            Suivant ›
          </button>
        </div>
      </div>

      {/* ── Modale appareils ── */}
      <AppareilsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={selectFromModal}
        appareils={appareils}
      />

    </div>
  )
}
