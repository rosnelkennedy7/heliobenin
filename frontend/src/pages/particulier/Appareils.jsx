import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Search, Check } from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.png'
import Avatar from '../../components/Avatar'
import { saveParticulier, getParticulier, getCurrentModeParticulier } from '../../utils/storage'
import { defaultHours } from '../../utils/defaultHours'
import { API_BASE } from '../../utils/api'
import styles from './Appareils.module.css'

/* ── Catégories ─────────────────────────────────────── */
const CATEGORIES = ['Eclairage','Climatisation','Audiovisuel','Cuisine','Informatique','Electroménager','Autre']
const CAT_ICONS  = { Eclairage:'🔆', Climatisation:'❄️', Audiovisuel:'📺', Cuisine:'🍳', Informatique:'💻', Electroménager:'🏠', Autre:'⚡' }

/* ── Formatage budget (séparateur milliers espace) ─── */
function fmtBudget(raw) {
  const digits = (raw || '').toString().replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmt = n => Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/* ── Stepper ─────────────────────────────────────────── */
const STEPS = ['Localisation', 'Appareils', 'Résultats']

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
export default function Appareils() {
  const navigate = useNavigate()
  const stored        = getParticulier()
  const mode          = stored.mode || 'sans_budget'
  const cas           = stored.cas   // 'A' = SBEE principale, 'B' = Solaire principale
  const cout_estime_stored = stored.cout_estime || 0
  const budgetManquant = mode === 'avec_budget' && (stored.budget || 0) < 500000

  /* Mode SBEE → colonne priorité visible */
  const hasPriorite = cas === 'A'
  /* Mode avec_budget + calcul précédent insuffisant → bandeau rouge */
  const showBudgetBanner = mode === 'avec_budget' && cout_estime_stored > 0

  const [rows, setRows] = useState(() => {
    const data = getParticulier()
    return (data.appareils || []).map((a, i) => ({
      id: Date.now() + i,
      nom: a.nom || '',
      puissance: a.puissance || 0,
      quantite: a.quantite || 1,
      hJour: a.hJour || 0,
      hNuit: a.hNuit || 0,
      typeCharge: a.typeCharge || 'Manuel',
      facteurPointe: a.facteurPointe || 1.0,
      isManual: !a.typeCharge || a.typeCharge === 'Manuel',
      priorite: a.priorite !== false,
    }))
  })
  const [budgetDisplay,setBudgetDisplay] = useState('')
  const [modalOpen,    setModalOpen]    = useState(false)
  const [appareils,    setAppareils]    = useState([])

  useEffect(() => {
    fetch(`${API_BASE}/api/appareils`)
      .then(r => r.json())
      .then(setAppareils)
      .catch(() => {})
  }, [])

  /* ── Dérivés ── */
  const budgetNum   = parseInt(budgetDisplay.replace(/\s/g, ''), 10) || 0
  const hasOverflow = rows.some(r => (r.hJour || 0) + (r.hNuit || 0) > 24)
  const budgetOk    = mode !== 'avec_budget' || budgetNum >= 500000
  const canProceed  = rows.length > 0 && !hasOverflow && budgetOk

  /* Top 3 appareils les plus énergivores */
  const topEnergivoresIds = showBudgetBanner
    ? [...rows]
        .sort((a, b) =>
          (b.puissance * b.quantite * ((b.hJour || 0) + (b.hNuit || 0)))
          - (a.puissance * a.quantite * ((a.hJour || 0) + (a.hNuit || 0)))
        )
        .slice(0, 3)
        .map(r => r.id)
    : []

  /* ── Lignes ── */
  const updateRow = (id, key, val) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))
  const deleteRow = (id) =>
    setRows(prev => prev.filter(r => r.id !== id))

  const selectFromModal = (app) => {
    if (rows.length >= 50) return
    const { hJour, hNuit } = defaultHours(app.nom, app.categorie)
    setRows(prev => [...prev, {
      id: Date.now() + Math.random(),
      nom: app.nom, puissance: app.puissance,
      quantite: 1, hJour, hNuit,
      typeCharge: app.typeCharge, facteurPointe: app.facteurPointe,
      isManual: false, priorite: true,
    }])
  }

  const addManual = () => {
    if (rows.length >= 50) return
    setRows(prev => [...prev, { id: Date.now() + Math.random(), nom: '', puissance: 0, quantite: 1, hJour: 4, hNuit: 0, typeCharge: 'Manuel', facteurPointe: 1.0, isManual: true, priorite: true }])
  }

  /* ── Budget ── */
  const handleBudgetChange = (e) => setBudgetDisplay(fmtBudget(e.target.value))

  /* ── Sauvegarder les appareils ── */
  const buildAppareils = () => rows.map(r => ({
    nom:           r.nom,
    puissance:     r.puissance,
    quantite:      r.quantite,
    hJour:         r.hJour,
    hNuit:         r.hNuit,
    wh_j:          r.puissance * r.quantite * ((r.hJour || 0) + (r.hNuit || 0)),
    typeCharge:    r.typeCharge,
    facteurPointe: r.facteurPointe,
    priorite:      r.priorite !== false,
  }))

  useEffect(() => {
    saveParticulier({ appareils: buildAppareils() })
  }, [rows])

  /* ── Suivant ── */
  const handleSuivant = () => {
    if (!canProceed) return
    saveParticulier({
      budget: mode === 'avec_budget' ? budgetNum : null,
      appareils: buildAppareils(),
    })
    navigate('/resultats')
  }

  /* ── Recalculer (mode avec_budget) ── */
  const handleRecalculer = () => {
    if (rows.length === 0 || hasOverflow) return
    saveParticulier({
      budget: mode === 'avec_budget' ? budgetNum : null,
      appareils: buildAppareils(),
      resultats: null,
    })
    navigate('/resultats')
  }

  /* ════════════════════════════════════════════════════ */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={1} />} avatar={<Avatar />} />

      <div className={styles.inner}>

       
        {/* ── Bandeau SBEE ── */}
        {cas === 'A' && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: '0.88rem',
            color: 'rgba(255, 255, 255, 0.82)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <span>⚡</span>
            <span>
              Renseignez uniquement les appareils qui resteront allumés pendant les coupures.
              Cliquez dans la colonne priorité pour prioriser un appareil. Le symbole ⭐ indique qu'il est prioritaire.
            </span>
          </div>
        )}

        {/* ── Bandeau budget insuffisant ── */}
        {showBudgetBanner && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: '0.88rem',
            color: '#EF4444',
          }}>
            Votre budget est insuffisant. Supprimez des appareils pour réduire le coût de l'installation.
            Les appareils les plus énergivores sont mis en évidence (fond orangé).
            <br />
            <strong>Budget précédent :</strong> {fmt(stored.budget || 0)} FCFA &nbsp;|&nbsp;
            <strong>Coût estimé :</strong> {fmt(cout_estime_stored)} FCFA
          </div>
        )}

        {/* Budget conditionnel */}
        {mode === 'avec_budget' && (
          <div className={styles.budgetSection}>
            <label className={styles.budgetLabel}>Votre budget disponible</label>
            <div className={`${styles.budgetInputWrap} ${budgetDisplay && budgetNum < 500000 ? styles.budgetError : ''}`}>
              <input
                type="text"
                inputMode="numeric"
                value={budgetDisplay}
                onChange={handleBudgetChange}
                placeholder="500 000"
                className={styles.budgetInput}
              />
              <span className={styles.budgetCurrency}>FCFA</span>
            </div>
            <p className={`${styles.budgetHint} ${budgetDisplay && budgetNum < 500000 ? styles.budgetHintError : ''}`}>
              Budget minimum requis : 500 000 FCFA
            </p>
          </div>
        )}

        {/* Boutons d'ajout — alignés à droite */}
        <div className={styles.actionsRow}>
          <button
            className={styles.btnAddLigne}
            onClick={() => !budgetOk ? undefined : setModalOpen(true)}
            style={{
              opacity: !budgetOk ? 0.4 : 1,
              cursor: !budgetOk ? 'not-allowed' : 'pointer',
              pointerEvents: !budgetOk ? 'none' : 'auto',
            }}
          >
            <Plus size={16} /> Ajouter un appareil
          </button>
          <button
            className={styles.btnAddManual}
            onClick={() => !budgetOk ? undefined : addManual()}
            style={{
              opacity: !budgetOk ? 0.4 : 1,
              cursor: !budgetOk ? 'not-allowed' : 'pointer',
              pointerEvents: !budgetOk ? 'none' : 'auto',
            }}
          >
            <Plus size={16} /> Ajouter manuellement
          </button>
        </div>

        {/* Tableau */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thApp}`}>Appareil</th>
                <th className={styles.th}>Puissance</th>
                <th className={styles.th}>Qté</th>
                <th className={styles.th}>
                  <span>Jour ☀️</span>
                  <span className={styles.thSub}>06h - 18h</span>
                </th>
                <th className={styles.th}>
                  <span>Nuit 🌙</span>
                  <span className={styles.thSub}>18h - 06h</span>
                </th>
                {hasPriorite && <th className={styles.th}>Priorité</th>}
                <th className={styles.th} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={hasPriorite ? 7 : 6} className={styles.emptyMsg}>
                    Ajoutez des appareils avec les boutons ci-dessus
                  </td>
                </tr>
              )}
              {rows.map(row => {
                const overflow    = (row.hJour || 0) + (row.hNuit || 0) > 24
                const isEnergivore = topEnergivoresIds.includes(row.id)
                return (
                  <tr
                    key={row.id}
                    className={
                      overflow      ? styles.rowError     :
                      isEnergivore  ? styles.rowHighlight  : ''
                    }
                  >

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
                        placeholder="0.5"
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
                          placeholder="0.5"
                          value={row.hNuit}
                          onChange={e => updateRow(row.id, 'hNuit', +e.target.value)}
                          className={`${styles.cellInput} ${styles.cellNum} ${overflow ? styles.cellInputError : ''}`}
                        />
                        {overflow && <span className={styles.overflowMsg}>Total &gt; 24h</span>}
                      </div>
                    </td>

                    {/* PRIORITÉ (seulement mode SBEE) */}
                    {hasPriorite && (
                      <td className={styles.td} style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, 'priorite', row.priorite === false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem', padding: '0 0.2rem', lineHeight: 1 }}
                          title={row.priorite !== false ? 'Prioritaire' : 'Non prioritaire'}
                        >
                          {row.priorite !== false ? '⭐' : '○'}
                        </button>
                      </td>
                    )}

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

        {/* Navigation */}
        <div className={styles.bottomNav}>
          <button className={styles.btnRetour} onClick={() => navigate('/localisation')}>
            ‹ Retour
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {mode === 'avec_budget' && cout_estime_stored > 0 && (
              <button
                className={`${styles.btnRecalculer} ${(!rows.length || hasOverflow) ? styles.btnDisabled : ''}`}
                onClick={handleRecalculer}
                disabled={!rows.length || hasOverflow}
              >
                Recalculer
              </button>
            )}
            <button
              className={`${styles.btnSuivant} ${!canProceed ? styles.btnDisabled : ''}`}
              onClick={handleSuivant}
              disabled={!canProceed}
            >
              Suivant ›
            </button>
          </div>
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
