import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronDown, Search, Zap, Shield,
  AlertCircle, AlertTriangle, CheckCircle, Plus,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.webp'
import AvatarTech from '../../components/AvatarTech'
import { supabase } from '../../utils/supabaseClient'
import { saveTechnicien, getTechnicien } from '../../utils/storage'
import { API_BASE } from '../../utils/api'
import s from './Etude.module.css'

const STEPS = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']

/* ─── helpers ────────────────────────────────────────────── */
const totalUnits = (appareils) => appareils.reduce((acc, a) => acc + (a.quantite || 1), 0)

function defaultCs(appareils) {
  const n = totalUnits(appareils)
  if (n <= 3)  return 0.95
  if (n <= 6)  return 0.88
  if (n <= 12) return 0.80
  return 0.75
}

function defaultK(appareils) {
  const inductifs = appareils.filter(a =>
    (a.typeCharge || '').toLowerCase().includes('inductif')
  ).length
  if (inductifs === 0) return 1.15
  if (inductifs <= 5)  return 1.25
  return 1.50
}

function defaultPr(lat) {
  if ((lat || 6.4) < 8.0)  return 0.75
  if ((lat || 6.4) < 10.0) return 0.73
  return 0.70
}

function dodDefaut(techno) {
  const t = (techno || '').toLowerCase()
  if (t.includes('lifepo4') || t.includes('lithium')) return 90
  if (t.includes('agm'))   return 50
  if (t.includes('gel'))   return 70
  return 40
}
function rendDefaut(techno) {
  const t = (techno || '').toLowerCase()
  if (t.includes('lifepo4') || t.includes('lithium')) return 95
  if (t.includes('agm') || t.includes('gel'))         return 85
  return 80
}


/* ─── Normaliseurs équipements ───────────────────────────── */
function normalisePanneau(p) {
  if (!p) return null
  return {
    puissance:        p.puissance         ?? p['Puissance (Wc)']       ?? 0,
    voc:              p.voc               ?? p['Voc (V)']              ?? 0,
    vmp:              p.vmp               ?? p['Vmp (V)']              ?? 0,
    isc:              p.isc               ?? p['Isc (A)']              ?? 0,
    tension_nominale: p.tension_nominale  ?? p['Tension nominale (V)'] ?? 24,
    marque:           p.marque            ?? p['Marque']               ?? '',
    modele:           p.modele            ?? p['Modèle']               ?? '',
    isCustom:         p.isCustom          ?? false,
  }
}

function normaliseOnduleur(o) {
  if (!o) return null
  return {
    puissance:  o.puissance  ?? o['Puissance (W)']       ?? 0,
    usys:       o.usys       ?? o['Tension système (V)'] ?? 48,
    mppt_min:   o.mppt_min   ?? o['MPPT min (V)']        ?? 60,
    mppt_max:   o.mppt_max   ?? o['MPPT max (V)']        ?? 500,
    pv_max:     o.pv_max     ?? o['PV max (W)']          ?? 9999,
    rendement:  o.rendement  ?? o['Rendement (%)']       ?? 97,
    marque:     o.marque     ?? o['Marque']              ?? '',
    modele:     o.modele     ?? o['Modèle']              ?? '',
    isCustom:   o.isCustom   ?? false,
  }
}

function normaliseBatterie(b) {
  if (!b) return null
  return {
    capacite:     b.capacite     ?? b['Capacité (Ah)']  ?? 200,
    tension:      b.tension      ?? b['Tension (V)']    ?? 48,
    dod:          b.dod          ?? b['DoD (%)']        ?? 80,
    rendement:    b.rendement    ?? b['Rendement (%)']  ?? 95,
    technologie:  b.technologie  ?? b['Technologie']    ?? '',
    marque:       b.marque       ?? b['Marque']         ?? '',
    modele:       b.modele       ?? b['Modèle']         ?? '',
    isCustom:     b.isCustom     ?? false,
  }
}

function normaliseRegulateur(r) {
  if (!r) return null
  return {
    courant_max:      r.courant_max      ?? r['Courant max (A)']   ?? 60,
    tension_systeme:  r.tension_systeme  ?? r['Tension système']   ?? '',
    plage_pv:         r.plage_pv         ?? r['Plage PV (V)']      ?? '',
    type:             r.type             ?? r['Type']              ?? '',
    marque:           r.marque           ?? r['Marque']            ?? '',
    modele:           r.modele           ?? r['Modèle']            ?? '',
    isCustom:         r.isCustom         ?? false,
  }
}

/* ─── Stepper ────────────────────────────────────────────── */
function Stepper({ active }) {
  return (
    <div className={s.stepper}>
      {STEPS.map((step, i) => (
        <div key={step} className={s.stepItem}>
          <div className={`${s.stepDot} ${i === active ? s.stepDotActive : ''} ${i < active ? s.stepDotDone : ''}`}>
            {i < active ? <Check size={20} strokeWidth={3} /> : i + 1}
          </div>
          <span className={`${s.stepLabel} ${i === active ? s.stepLabelActive : ''}`}>{step}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Groupes batteries par technologie ─────────────────── */
const TECHNO_ORDER = ['LiFePO4', 'AGM', 'GEL', 'Plomb-acide']
function buildBatGroups(batteries) {
  return TECHNO_ORDER.reduce((acc, t) => {
    const list = batteries.filter(b => {
      const tech = (b.technologie || '').toLowerCase()
      if (t === 'LiFePO4')     return tech.includes('lifepo4') || tech.includes('lithium')
      if (t === 'AGM')         return tech === 'agm'
      if (t === 'GEL')         return tech === 'gel'
      if (t === 'Plomb-acide') return tech.includes('plomb')
      return false
    })
    if (list.length) acc.push({ label: t, items: list })
    return acc
  }, [])
}

/* ─── Modale équipement ──────────────────────────────────── */
function EquipementModal({
  open, onClose, titre, badge,
  groups: groupsProp = [], items = [],
  labelFn, subLabelFn, rightTopFn, rightBotFn,
  onSelect, onAjouter, compatFn,
}) {
  const [q, setQ] = useState('')
  if (!open) return null

  const filter = arr => arr.filter(it =>
    !q.trim() || labelFn(it).toLowerCase().includes(q.toLowerCase())
  )

  let displayGroups
  if (groupsProp.length > 0) {
    displayGroups = groupsProp
      .map(g => ({ label: g.label, items: filter(g.items), compat: true }))
      .filter(g => g.items.length > 0)
  } else {
    const filtered = filter(items)
    if (compatFn) {
      const compat = filtered.filter(it => compatFn(it))
      const autres = filtered.filter(it => !compatFn(it))
      displayGroups = [
        ...(compat.length ? [{ label: 'COMPATIBLES', items: compat, compat: true }] : []),
        ...(autres.length ? [{ label: 'AUTRES', items: autres, compat: false }] : []),
      ]
    } else {
      displayGroups = filtered.length ? [{ label: null, items: filtered, compat: true }] : []
    }
  }

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
          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>{titre}</span>
          {badge && (
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 4, padding: '1px 7px' }}>
              {badge}
            </span>
          )}
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
              placeholder="Rechercher…"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Liste */}
        <div style={{ maxHeight: 380, overflowY: 'auto', background: 'rgba(15,23,42,0.90)' }}>
          {displayGroups.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>Aucun résultat</div>
          )}
          {displayGroups.map((g, gi) => (
            <div key={gi}>
              {g.label && (
                <div style={{ padding: '6px 14px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: g.compat ? '#F59E0B' : 'rgba(255,255,255,0.3)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  {g.label}
                </div>
              )}
              {g.items.map((it, ii) => (
                <button
                  key={ii}
                  onClick={() => { onSelect(it); onClose() }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.05)', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <div style={{ flex: 1, overflow: 'hidden', marginRight: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: g.compat ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {labelFn(it)}
                    </div>
                    {subLabelFn && (
                      <div style={{ fontSize: 11, marginTop: 2, color: g.compat ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)' }}>
                        {subLabelFn(it)}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {rightTopFn && <div style={{ fontSize: 12, fontWeight: 500, color: g.compat ? '#F59E0B' : 'rgba(245,158,11,0.4)' }}>{rightTopFn(it)}</div>}
                    {rightBotFn && <div style={{ fontSize: 11, color: g.compat ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.25)' }}>{rightBotFn(it)}</div>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Bouton Ajouter */}
        {onAjouter && (
          <button
            onClick={() => { onAjouter(); onClose() }}
            style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#F59E0B', fontSize: '0.85rem', fontWeight: 500 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <Plus size={14} /> Ajouter un équipement personnalisé
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Carte équipement ───────────────────────────────────── */
function EquipCard({ titre, sel, labelSel, subLabelSel, onChoisir, onAjouter, children }) {
  return (
    <div
      style={{ border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, background: 'rgba(245,158,11,0.04)', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 8px rgba(245,158,11,0.3)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '5px 8px', borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.07)' }}>
        {titre}
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sel && labelSel && (
          <div>
            <div style={{ color: '#22C55E', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelSel}</div>
            {subLabelSel && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', marginTop: 2 }}>{subLabelSel}</div>}
          </div>
        )}
        <button
          onClick={onChoisir}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5, color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', padding: '6px 8px', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#F59E0B' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        >
          {sel ? '✎ Changer' : 'Choisir…'}
        </button>
        {onAjouter && (
          <button
            onClick={onAjouter}
            style={{ alignSelf: 'flex-end', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', padding: '2px 8px', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.color = '#F59E0B' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          >
            + Ajouter
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

/* ─── Formulaire panneau perso ───────────────────────────── */
function FormPanneauCustom({ onUse, pc }) {
  const [f, setF]   = useState({ puissance: 400, voc: 48.5, vmp: 40.2, isc: 10.2, tension_nominale: 24, marque: '', modele: '', imp: '', rendement: '' })
  const [err, setErr] = useState({})
  const [soumis, setSoumis] = useState(false)

  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!f.puissance || f.puissance < 50)  e.puissance = 'Requis (min 50 Wc)'
    if (!f.voc || f.voc < 10)              e.voc = 'Requis (min 10 V)'
    if (!f.vmp || f.vmp < 8)               e.vmp = 'Requis (min 8 V)'
    if (f.vmp && f.voc && +f.vmp >= +f.voc) e.vmp = 'Vmp doit être inférieur à Voc'
    if (!f.isc || f.isc < 1)               e.isc = 'Requis (min 1 A)'
    return e
  }

  const handleUse = () => {
    const e = validate()
    if (Object.keys(e).length) { setErr(e); return }
    const item = { ...f, puissance: +f.puissance, voc: +f.voc, vmp: +f.vmp, isc: +f.isc, tension_nominale: +f.tension_nominale, isCustom: true }
    setSoumis(true)
    if (supabase) {
      const user = JSON.parse(localStorage.getItem('helio_user') || '{}')
      supabase.from('equipements_custom').insert([{
        type_equipement: 'panneau',
        caracteristiques: { ...item },
        marque: f.marque || null, modele: f.modele || null,
        statut: 'en_attente', user_id: user.id || null,
      }]).catch(() => {})
    }
    onUse(item)
  }

  return (
    <div className={s.customCard}>
      <div className={s.customCardTitle}>Panneau</div>
      <div className={s.customGrid}>
        <Field label="Puissance (Wc) *" error={err.puissance}>
          <input type="number" min={50} max={700} value={f.puissance} onChange={e => set('puissance', e.target.value)} className={`${s.inputOrange} ${err.puissance ? s.inputError : ''}`} />
        </Field>
        <Field label="Voc (V) *" error={err.voc}>
          <input type="number" min={10} max={80} step={0.1} value={f.voc} onChange={e => set('voc', e.target.value)} className={`${s.inputOrange} ${err.voc ? s.inputError : ''}`} />
        </Field>
        <Field label="Vmp (V) *" error={err.vmp}>
          <input type="number" min={8} max={70} step={0.1} value={f.vmp} onChange={e => set('vmp', e.target.value)} className={`${s.inputOrange} ${err.vmp ? s.inputError : ''}`} />
        </Field>
        <Field label="Isc (A) *" error={err.isc}>
          <input type="number" min={1} max={20} step={0.1} value={f.isc} onChange={e => set('isc', e.target.value)} className={`${s.inputOrange} ${err.isc ? s.inputError : ''}`} />
        </Field>
        <Field label="Tension nominale *">
          <select value={f.tension_nominale} onChange={e => set('tension_nominale', e.target.value)} className={s.selectOrange}>
            <option value={12}>12 V</option>
            <option value={24}>24 V</option>
          </select>
        </Field>
      </div>
      <div className={s.customOptTitle}>Champs optionnels</div>
      <div className={s.customGrid}>
        <Field label="Marque"><input type="text" value={f.marque} onChange={e => set('marque', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Modèle"><input type="text" value={f.modele} onChange={e => set('modele', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Imp (A)"><input type="number" min={0} step={0.1} value={f.imp} onChange={e => set('imp', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Rendement (%)"><input type="number" min={10} max={30} step={0.1} value={f.rendement} onChange={e => set('rendement', e.target.value)} className={s.inputOrange} /></Field>
      </div>
      {soumis && <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />Équipement ajouté</div>}
      {!soumis && <button type="button" className={s.btnPrimary} onClick={handleUse}><Check size={15} /> Utiliser cet équipement</button>}
    </div>
  )
}

/* ─── Formulaire onduleur AIO perso ─────────────────────── */
function FormOnduleurCustom({ onUse, pc }) {
  const [f, setF]   = useState({ puissance: 5000, usys: 48, mppt_min: 120, mppt_max: 500, pv_max: 6500, marque: '', modele: '', rendement: 97 })
  const [err, setErr] = useState({})
  const [soumis, setSoumis] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!f.puissance || f.puissance < 500) e.puissance = 'Requis (min 500 W)'
    if (!f.mppt_min || f.mppt_min < 10)    e.mppt_min = 'Requis'
    if (!f.mppt_max || f.mppt_max < 50)    e.mppt_max = 'Requis'
    if (+f.mppt_max <= +f.mppt_min)        e.mppt_max = 'MPPT max doit être > MPPT min'
    if (!f.pv_max || f.pv_max < 500)       e.pv_max = 'Requis'
    return e
  }

  const handleUse = () => {
    const e = validate()
    if (Object.keys(e).length) { setErr(e); return }
    const item = { ...f, puissance: +f.puissance, usys: +f.usys, mppt_min: +f.mppt_min, mppt_max: +f.mppt_max, pv_max: +f.pv_max, rendement: +f.rendement, isCustom: true }
    setSoumis(true)
    if (supabase) {
      const user = JSON.parse(localStorage.getItem('helio_user') || '{}')
      supabase.from('equipements_custom').insert([{ type_equipement: 'onduleur', caracteristiques: item, marque: f.marque || null, statut: 'en_attente', user_id: user.id || null }]).catch(() => {})
    }
    onUse(item)
  }

  const pvInsuffisant = pc && +f.pv_max < pc

  return (
    <div className={s.customCard}>
      <div className={s.customCardTitle}>Onduleur</div>
      <div className={s.customGrid}>
        <Field label="Puissance (W) *" error={err.puissance}>
          <input type="number" min={500} max={15000} value={f.puissance} onChange={e => set('puissance', e.target.value)} className={`${s.inputOrange} ${err.puissance ? s.inputError : ''}`} />
        </Field>
        <Field label="Tension système *">
          <select value={f.usys} onChange={e => set('usys', e.target.value)} className={s.selectOrange}>
            <option value={12}>12 V</option>
            <option value={24}>24 V</option>
            <option value={48}>48 V</option>
          </select>
        </Field>
        <Field label="MPPT min (V) *" error={err.mppt_min}>
          <input type="number" min={10} max={200} value={f.mppt_min} onChange={e => set('mppt_min', e.target.value)} className={`${s.inputOrange} ${err.mppt_min ? s.inputError : ''}`} />
        </Field>
        <Field label="MPPT max (V) *" error={err.mppt_max}>
          <input type="number" min={50} max={600} value={f.mppt_max} onChange={e => set('mppt_max', e.target.value)} className={`${s.inputOrange} ${err.mppt_max ? s.inputError : ''}`} />
        </Field>
        <Field label="PV max (W) *" error={err.pv_max}>
          <input type="number" min={500} max={20000} value={f.pv_max} onChange={e => set('pv_max', e.target.value)} className={`${s.inputOrange} ${err.pv_max ? s.inputError : ''}`} />
        </Field>
        <Field label="Rendement (%)">
          <input type="number" min={80} max={100} step={0.1} value={f.rendement} onChange={e => set('rendement', e.target.value)} className={s.inputOrange} />
        </Field>
      </div>
      {pvInsuffisant && (
        <div className={s.warnMsg}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />
          PV max insuffisant pour votre champ solaire (Pc = {pc} Wc)
        </div>
      )}
      <div className={s.customOptTitle}>Optionnel</div>
      <div className={s.customGrid}>
        <Field label="Marque"><input type="text" value={f.marque} onChange={e => set('marque', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Modèle"><input type="text" value={f.modele} onChange={e => set('modele', e.target.value)} className={s.inputOrange} /></Field>
      </div>
      {soumis
        ? <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />✅ Équipement ajouté</div>
        : <button type="button" className={s.btnPrimary} style={{ marginTop: '0.25rem' }} onClick={handleUse}><Check size={15} /> Utiliser cet équipement</button>
      }
    </div>
  )
}

/* ─── Formulaire régulateur MPPT perso ──────────────────── */
function FormRegMpptCustom({ onUse, vocString }) {
  const [f, setF]   = useState({ courant_max: 60, usys: 48, vmax_pv: 150, marque: '', modele: '' })
  const [err, setErr] = useState({})
  const [soumis, setSoumis] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const handleUse = () => {
    const e = {}
    if (!f.courant_max || f.courant_max < 5) e.courant_max = 'Requis (min 5 A)'
    if (!f.vmax_pv || f.vmax_pv < 50)        e.vmax_pv = 'Requis (min 50 V)'
    if (Object.keys(e).length) { setErr(e); return }
    const item = { ...f, courant_max: +f.courant_max, usys: +f.usys, vmax_pv: +f.vmax_pv, isCustom: true }
    setSoumis(true)
    if (supabase) {
      const user = JSON.parse(localStorage.getItem('helio_user') || '{}')
      supabase.from('equipements_custom').insert([{ type_equipement: 'regulateur_mppt', caracteristiques: item, marque: f.marque || null, statut: 'en_attente', user_id: user.id || null }]).catch(() => {})
    }
    onUse(item)
  }

  const vmaxInsuffisant = vocString && +f.vmax_pv < vocString

  return (
    <div className={s.customCard}>
      <div className={s.customCardTitle}>Régulateur MPPT</div>
      <div className={s.customGrid}>
        <Field label="Courant max (A) *" error={err.courant_max}>
          <input type="number" min={5} max={200} value={f.courant_max} onChange={e => set('courant_max', e.target.value)} className={`${s.inputOrange} ${err.courant_max ? s.inputError : ''}`} />
        </Field>
        <Field label="Tension système *">
          <select value={f.usys} onChange={e => set('usys', e.target.value)} className={s.selectOrange}>
            <option value={12}>12 V</option><option value={24}>24 V</option><option value={48}>48 V</option>
          </select>
        </Field>
        <Field label="Vmax PV (V) *" error={err.vmax_pv}>
          <input type="number" min={50} max={600} value={f.vmax_pv} onChange={e => set('vmax_pv', e.target.value)} className={`${s.inputOrange} ${err.vmax_pv ? s.inputError : ''}`} />
        </Field>
        <Field label="Marque"><input type="text" value={f.marque} onChange={e => set('marque', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Modèle"><input type="text" value={f.modele} onChange={e => set('modele', e.target.value)} className={s.inputOrange} /></Field>
      </div>
      {vmaxInsuffisant && (
        <div className={s.warnMsg}><AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />
          Tension PV max insuffisante (Voc_string = {vocString} V)
        </div>
      )}
      {soumis
        ? <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />✅ Équipement ajouté</div>
        : <button type="button" className={s.btnPrimary} style={{ marginTop: '0.25rem' }} onClick={handleUse}><Check size={15} /> Utiliser cet équipement</button>
      }
    </div>
  )
}

/* ─── Formulaire régulateur PWM perso ───────────────────── */
function FormRegPwmCustom({ onUse }) {
  const [f, setF] = useState({ courant_max: 30, usys: 24, marque: '', modele: '' })
  const [err, setErr] = useState({})
  const [soumis, setSoumis] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }
  const handleUse = () => {
    if (!f.courant_max || f.courant_max < 5) { setErr({ courant_max: 'Requis (min 5 A)' }); return }
    const item = { ...f, courant_max: +f.courant_max, usys: +f.usys, isCustom: true }
    setSoumis(true)
    if (supabase) {
      const user = JSON.parse(localStorage.getItem('helio_user') || '{}')
      supabase.from('equipements_custom').insert([{ type_equipement: 'regulateur_pwm', caracteristiques: item, marque: f.marque || null, statut: 'en_attente', user_id: user.id || null }]).catch(() => {})
    }
    onUse(item)
  }
  return (
    <div className={s.customCard}>
      <div className={s.customCardTitle}> Régulateur PWM</div>
      <div className={s.customGrid}>
        <Field label="Courant max (A) *" error={err.courant_max}>
          <input type="number" min={5} max={100} value={f.courant_max} onChange={e => set('courant_max', e.target.value)} className={`${s.inputOrange} ${err.courant_max ? s.inputError : ''}`} />
        </Field>
        <Field label="Tension système *">
          <select value={f.usys} onChange={e => set('usys', e.target.value)} className={s.selectOrange}>
            <option value={12}>12 V</option><option value={24}>24 V</option><option value={48}>48 V</option>
          </select>
        </Field>
        <Field label="Marque"><input type="text" value={f.marque} onChange={e => set('marque', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Modèle"><input type="text" value={f.modele} onChange={e => set('modele', e.target.value)} className={s.inputOrange} /></Field>
      </div>
      {soumis
        ? <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />✅ Équipement ajouté</div>
        : <button type="button" className={s.btnPrimary} style={{ marginTop: '0.25rem' }} onClick={handleUse}><Check size={15} /> Utiliser cet équipement</button>
      }
    </div>
  )
}

/* ─── Formulaire batterie perso ──────────────────────────── */
function FormBatterieCustom({ onUse, usys }) {
  const [f, setF] = useState({ tension: usys || 48, capacite: 200, technologie: 'LiFePO4', marque: '', modele: '', dod: 90, rendement: 95 })
  const [err, setErr]     = useState({})
  const [soumis, setSoumis] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const handleTechno = (t) => { set('technologie', t); set('dod', dodDefaut(t)); set('rendement', rendDefaut(t)) }

  const validate = () => {
    const e = {}
    if (!f.capacite || f.capacite < 10) e.capacite = 'Requis (min 10 Ah)'
    if (+f.tension !== +(usys || 48))    e.tension  = `Doit correspondre à Usys = ${usys || 48} V`
    return e
  }

  const handleUse = () => {
    const e = validate()
    if (Object.keys(e).length) { setErr(e); return }
    const item = { ...f, tension: +f.tension, capacite: +f.capacite, dod: +f.dod, rendement: +f.rendement, isCustom: true }
    setSoumis(true)
    if (supabase) {
      const user = JSON.parse(localStorage.getItem('helio_user') || '{}')
      supabase.from('equipements_custom').insert([{
        type_equipement: 'batterie', caracteristiques: { ...item },
        marque: f.marque || null, modele: f.modele || null,
        statut: 'en_attente', user_id: user.id || null,
      }]).catch(() => {})
    }
    onUse(item)
  }

  return (
    <div className={s.customCard}>
      <div className={s.customCardTitle}>Batterie</div>
      <div className={s.customGrid}>
        <Field label="Tension (V) *" error={err.tension}>
          <select value={f.tension} onChange={e => set('tension', e.target.value)} className={`${s.selectOrange} ${err.tension ? s.inputError : ''}`}>
            <option value={12}>12 V</option><option value={24}>24 V</option><option value={48}>48 V</option>
          </select>
        </Field>
        <Field label="Capacité (Ah) *" error={err.capacite}>
          <input type="number" min={10} max={1000} value={f.capacite} onChange={e => set('capacite', e.target.value)} className={`${s.inputOrange} ${err.capacite ? s.inputError : ''}`} />
        </Field>
        <Field label="Technologie *">
          <select value={f.technologie} onChange={e => handleTechno(e.target.value)} className={s.selectOrange}>
            <option value="LiFePO4">LiFePO4</option>
            <option value="AGM">AGM</option>
            <option value="GEL">GEL</option>
            <option value="Plomb">Plomb acide</option>
          </select>
        </Field>
        <Field label="DoD (%)">
          <input type="number" min={20} max={100} value={f.dod} onChange={e => set('dod', e.target.value)} className={s.inputOrange} />
        </Field>
        <Field label="Rendement (%)">
          <input type="number" min={60} max={100} step={0.1} value={f.rendement} onChange={e => set('rendement', e.target.value)} className={s.inputOrange} />
        </Field>
      </div>
      {err.tension && <div className={s.msgError} style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}><AlertCircle size={14} style={{ flexShrink: 0 }} />{err.tension}</div>}
      <div className={s.customOptTitle}>Optionnel</div>
      <div className={s.customGrid}>
        <Field label="Marque"><input type="text" value={f.marque} onChange={e => set('marque', e.target.value)} className={s.inputOrange} /></Field>
        <Field label="Modèle"><input type="text" value={f.modele} onChange={e => set('modele', e.target.value)} className={s.inputOrange} /></Field>
      </div>
      {soumis
        ? <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />✅ Équipement ajouté</div>
        : <button type="button" className={s.btnPrimary} onClick={handleUse}><Check size={15} />Utiliser cet équipement</button>
      }
    </div>
  )
}

/* ─── Field wrapper ──────────────────────────────────────── */
function Field({ label, children, error }) {
  return (
    <div className={s.fieldGroup}>
      <label className={s.fieldLabel}>{label}</label>
      {children}
      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  )
}

/* ─── ResultCard ─────────────────────────────────────────── */
function RC({ label, val }) {
  return (
    <div className={s.resultCard}>
      <span className={s.resultLabel}>{label}</span>
      <span className={s.resultValue}>{val}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function Etude() {
  const navigate  = useNavigate()
  const stored    = getTechnicien()
  const appareils = stored.appareils || []
  const loc       = stored.localisation || {}

  /* ── Params ── */
  const [cs,          setCs]          = useState(0.80)
  const [k,           setK]           = useState(() => defaultK(appareils))
  const [eta,         setEta]         = useState(0.80)
  const [typeOnduleur,setTypeOnduleur]= useState('AIO')
  const [pr,          setPr]          = useState(() => defaultPr(loc.latitude))
  const [nJours,  setNJours]  = useState(2)
  const [dod,     setDod]     = useState(90)
  const [etaBat,  setEtaBat]  = useState(0.95)

  /* ── Distances ── */
  const [dPanOnd, setDPanOnd] = useState(10)
  const [dRegBat, setDRegBat] = useState(2)
  const [dBatOnd, setDBatOnd] = useState(2)
  const [dOndTab, setDOndTab] = useState(10)

  /* ── API ── */
  const [resE1, setResE1] = useState(null)
  const [resE2, setResE2] = useState(null)
  const [resE3, setResE3] = useState(null)
  const [loadE1, setLoadE1] = useState(false)
  const [loadE2, setLoadE2] = useState(false)
  const [loadE3, setLoadE3] = useState(false)
  const [errE1,  setErrE1]  = useState(null)
  const [errE2,  setErrE2]  = useState(null)
  const [errE3,  setErrE3]  = useState(null)

  /* ── Accordéon ── */
  const [openS1, setOpenS1] = useState(true)
  const [openS2, setOpenS2] = useState(false)
  const [openS3, setOpenS3] = useState(false)

  /* ── Équipements sélectionnés ── */
  const [selPanneau,        setSelPanneau]        = useState(null)
  const [selOnduleur,       setSelOnduleur]       = useState(null)
  const [selOnduleurSepare, setSelOnduleurSepare] = useState(null)
  const [selRegMppt,        setSelRegMppt]        = useState(null)
  const [selRegPwm,         setSelRegPwm]         = useState(null)
  const [selBatterie,       setSelBatterie]       = useState(null)
  const [vmaxMppt,          setVmaxMppt]          = useState(150)

  /* ── Modale ouverte ── */
  const [modal, setModal] = useState(null)

  /* ── Formulaires custom ── */
  const [showCustomPan,    setShowCustomPan]    = useState(false)
  const [showCustomOnd,    setShowCustomOnd]    = useState(false)
  const [showCustomOndSep, setShowCustomOndSep] = useState(false)
  const [showCustomReg,    setShowCustomReg]    = useState(false)
  const [showCustomBat,    setShowCustomBat]    = useState(false)

  /* ── Équipements custom ── */
  const [customPanneaux,  setCustomPanneaux]  = useState([])
  const [customOnduleurs, setCustomOnduleurs] = useState([])
  const [customRegsMppt,  setCustomRegsMppt]  = useState([])
  const [customRegsPwm,   setCustomRegsPwm]   = useState([])
  const [customBatteries, setCustomBatteries] = useState([])

  /* ── Équipements depuis l'API ── */
  const [equipements, setEquipements] = useState({})

  useEffect(() => {
    fetch(`${API_BASE}/api/equipements`)
      .then(r => r.json())
      .then(data => {
        console.log('Clés panneaux:',     Object.keys(data.panneaux?.[0]           || {}))
        console.log('Clés batteries:',    Object.keys(data.batteries?.[0]          || {}))
        console.log('Clés onduleurs_aio:', Object.keys(data.onduleurs_aio?.[0]     || {}))
        console.log('Clés regulateurs:',  Object.keys(data.regulateurs?.[0]        || {}))
        console.log('Clés ond_hybrides:', Object.keys(data.onduleurs_hybrides?.[0] || {}))
        console.log('Clés ond_classiques:', Object.keys(data.onduleurs_classiques?.[0] || {}))
        console.log('[Équipements] panneaux:', (data.panneaux||[]).length,
          '| batteries:', (data.batteries||[]).length,
          '| aio:', (data.onduleurs_aio||[]).length,
          '| hybrides:', (data.onduleurs_hybrides||[]).length,
          '| classiques:', (data.onduleurs_classiques||[]).length,
          '| regulateurs:', (data.regulateurs||[]).length)
        setEquipements(data)
      })
      .catch(err => console.error(err))
  }, [])

  /* ── Restaurer depuis localStorage ── */
  useEffect(() => {
    const sv = stored.etude
    if (!sv) return
    if (sv.parametres) {
      const p = sv.parametres
      if (p.cs           !== undefined) setCs(p.cs)
      if (p.k            !== undefined) setK(p.k)
      if (p.eta          !== undefined) setEta(p.eta)
      if (p.typeOnduleur !== undefined) setTypeOnduleur(p.typeOnduleur)
      if (p.pr           !== undefined) setPr(p.pr)
      if (p.nJours       !== undefined) setNJours(p.nJours)
      if (p.dod          !== undefined) setDod(p.dod)
      if (p.etaBat       !== undefined) setEtaBat(p.etaBat)
      if (p.dPanOnd      !== undefined) setDPanOnd(p.dPanOnd)
      if (p.dRegBat      !== undefined) setDRegBat(p.dRegBat)
      if (p.dBatOnd      !== undefined) setDBatOnd(p.dBatOnd)
      if (p.dOndTab      !== undefined) setDOndTab(p.dOndTab)
    }
    if (sv.etape1) { setResE1(sv.etape1); setOpenS1(false); setOpenS2(true) }
    if (sv.etape2) { setResE2(sv.etape2); setOpenS2(false); setOpenS3(true) }
    if (sv.etape3) setResE3(sv.etape3)
    if (sv.equipements?.panneau)        setSelPanneau(sv.equipements.panneau)
    if (sv.equipements?.onduleur)       setSelOnduleur(sv.equipements.onduleur)
    if (sv.equipements?.onduleurSepare) setSelOnduleurSepare(sv.equipements.onduleurSepare)
    if (sv.equipements?.batterie)       setSelBatterie(sv.equipements.batterie)
  }, [])

  /* ── Section 3 longueurs ── */
  const [l3, setL3] = useState({ panOnd: 10, regBat: 2, batOnd: 2, ondTab: 10 })
  const [dirty3, setDirty3] = useState(false)
  const updateL3 = (k, v) => { setL3(p => ({ ...p, [k]: v })); setDirty3(true) }

  useEffect(() => {
    if (resE2) setL3({ panOnd: dPanOnd, regBat: dRegBat, batOnd: dBatOnd, ondTab: dOndTab })
  }, [!!resE2])

  /* ── Valeurs dérivées ── */
  const usysDetected = resE1?.usys || 48
  const isTriphasé   = resE1?.nb_onduleurs === 3 || resE1?.phase === 'triphasé'
  const typeReg      = typeOnduleur === 'AIO' ? 'AIO'
    : resE1 ? ((resE1.pc ?? 0) > 800 ? 'MPPT' : 'PWM') : 'MPPT'

  /* casEquip : 1=AIO, 2=SEPARE, 3=triphasé */
  const casEquip = isTriphasé ? 3 : typeOnduleur === 'SEPARE' ? 2 : 1

  /* ── Listes filtrées ── */
  const panneauxFiltres = [
    ...customPanneaux,
    ...(equipements.panneaux?.filter(p => {
      const tn = Number(p['Tension nominale (V)'] || p.tension_nominale)
      if (usysDetected === 12) return tn === 12
      if (usysDetected === 24) return tn === 24
      if (usysDetected === 48) return tn === 24
      return true
    }) || []),
  ]
  const onduleursAioFiltres = [
    ...customOnduleurs,
    ...(equipements.onduleurs_aio || []).filter(o => o.usys === usysDetected),
  ]
  const hybridesFiltrés   = (equipements.onduleurs_hybrides?.filter(o =>
    Number(o['Tension système (V)'] || o.usys) === usysDetected
  ) || [])
  const classiquesFiltrés = (equipements.onduleurs_classiques?.filter(o =>
    Number(o['Tension système (V)'] || o.usys) === usysDetected
  ) || [])
  const regulateursMpptFiltres = [
    ...customRegsMppt,
    ...(equipements.regulateurs || []).filter(r => {
      const ts = String(r.tension_systeme || '')
      return (r.type || '').toUpperCase() === 'MPPT' && ts.includes(String(usysDetected))
    }),
  ]
  const regulateursPwmFiltres = [
    ...customRegsPwm,
    ...(equipements.regulateurs || []).filter(r => {
      const ts = String(r.tension_systeme || '')
      return (r.type || '').toUpperCase() === 'PWM' && ts.includes(String(usysDetected))
    }),
  ]
  const batteriesFiltrees = equipements.batteries?.filter(b => {
    const techno = (b.technologie || b['Technologie'] || '').toLowerCase()
    const tension = Number(b.tension || b['Tension (V)'] || 0)
    const isLFP = techno.includes('lifepo4') || techno.includes('lithium')
    const isPWM = typeReg === 'PWM'
    const isTri = resE1?.nb_onduleurs === 3

    // PWM → pas de LiFePO4
    if (isPWM && isLFP) return false

    // Triphasé → LiFePO4 uniquement
    if (isTri && !isLFP) return false

    // Usys 48V → LiFePO4 accepte 48V et 24V ; AGM/GEL → uniquement 24V
    if (usysDetected === 48) {
      if (isLFP) return tension === 48 || tension === 24
      else return tension === 24
    }

    // Usys 12V ou 24V → même tension
    return tension === usysDetected
  }) || []

  console.log('Batteries chargées:', equipements.batteries?.length)
  console.log('Batteries filtrées:', batteriesFiltrees.length)
  console.log('Usys actuel:', usysDetected, 'typeReg:', typeReg)

  const batteriesList = [...customBatteries, ...batteriesFiltrees]

  /* ── Format API ── */
  const appareilsApi = () => appareils.map(a => ({
    nom: a.nom, puissance: a.puissance, quantite: a.quantite,
    h_jour: a.hJour ?? a.h_jour ?? 0,
    h_nuit: a.hNuit ?? a.h_nuit ?? 0,
    facteur_pointe: a.facteurPointe ?? a.facteur_pointe ?? 1.0,
  }))

  const paramsApi = (L) => ({
    appareils: appareilsApi(), cs, k, eta,
    n_jours: nJours, dod: dod / 100, eta_bat: etaBat,
    irradiation: loc.irradiation || 5.0,
    latitude: loc.latitude || 6.4, pr,
    longueur_panneau_ond: L?.panOnd ?? dPanOnd,
    longueur_reg_bat:     L?.regBat ?? dRegBat,
    longueur_bat_ond:     L?.batOnd ?? dBatOnd,
    longueur_ond_tableau: L?.ondTab ?? dOndTab,
    type_regulateur: typeReg === 'AIO' ? 'AIO' : typeReg === 'MPPT' ? 'MPPT' : 'PWM',
  })

  /* ── ÉTAPE 1 ── */
  const lancerCalcul = async () => {
    if (!appareils.length) { setErrE1('Aucun appareil trouvé. Retournez à la page Appareils.'); return }
    setLoadE1(true); setErrE1(null); setResE1(null); setResE2(null); setResE3(null)
    try {
      const r = await fetch(`${API_BASE}/api/calcul/technicien/etape1`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramsApi()),
      })
      if (!r.ok) throw new Error(`Serveur ${r.status}: ${await r.text()}`)
      const data = await r.json()
      setResE1(data); setOpenS1(false); setOpenS2(true)
    } catch (e) {
      setErrE1(e instanceof TypeError
        ? 'Impossible de joindre le backend.\nDémarrez le serveur FastAPI :\n  cd heliobenin/backend\n  uvicorn app.main:app --reload'
        : e.message)
    } finally { setLoadE1(false) }
  }

  /* ── ÉTAPE 2 ── */
  const panneau = normalisePanneau(selPanneau)

  const canLancer2 = !!panneau && (
    casEquip !== 2
      ? !!selOnduleur
      : !!selOnduleurSepare && (typeReg === 'MPPT' ? !!selRegMppt : !!selRegPwm)
  )
  console.log('canLancer2:', canLancer2)
  console.log('selPanneau:', selPanneau)
  console.log('selOnduleur:', selOnduleur)
  console.log('selBatterie:', selBatterie)

  const lancerEtude = async () => {
    if (!panneau) { setErrE2('Sélectionnez un panneau.'); return }
    setLoadE2(true); setErrE2(null); setResE2(null); setResE3(null)
    try {
      const equip = {
        panneau: normalisePanneau(selPanneau),
        type_regulateur: paramsApi().type_regulateur,
        ...(selOnduleur
          ? { onduleur: normaliseOnduleur(selOnduleur) }
          : {}),
        ...(selOnduleurSepare
          ? { onduleur: normaliseOnduleur(selOnduleurSepare) }
          : {}),
        ...(selRegMppt
          ? { regulateur: normaliseRegulateur(selRegMppt), usys: resE1?.usys || 48, vmax_mppt: +vmaxMppt }
          : {}),
        ...(selRegPwm
          ? { regulateur: normaliseRegulateur(selRegPwm), usys: resE1?.usys || 48 }
          : {}),
        ...(selBatterie
          ? { batterie: normaliseBatterie(selBatterie) }
          : {}),
      }
      const body = { etape1: resE1, params: paramsApi(), ...equip }
      const r = await fetch(`${API_BASE}/api/calcul/technicien/etape2`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`Serveur ${r.status}: ${await r.text()}`)
      const data = await r.json()
      setResE2(data); setOpenS2(false); setOpenS3(true)
    } catch (e) {
      setErrE2(e instanceof TypeError ? 'Backend inaccessible.' : e.message)
    } finally { setLoadE2(false) }
  }

  /* ── ÉTAPE 3 ── */
  const lancerCables = async (longueurs) => {
    const L = longueurs || l3
    setLoadE3(true); setErrE3(null); setDirty3(false)
    try {
      const body = {
        etape1: resE1, etape2: resE2,
        params: paramsApi(L), panneau,
        type_regulateur: paramsApi().type_regulateur,
      }
      const r = await fetch(`${API_BASE}/api/calcul/technicien/etape3`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`Serveur ${r.status}: ${await r.text()}`)
      setResE3(await r.json())
    } catch (e) {
      setErrE3(e instanceof TypeError ? 'Backend inaccessible.' : e.message)
    } finally { setLoadE3(false) }
  }

  /* ── Suivant ── */
  const handleSuivant = () => {
    saveTechnicien({
      etude: {
        etape1: resE1, etape2: resE2, etape3: resE3,
        parametres: { cs, k, eta, typeOnduleur, pr, nJours, dod, etaBat, dPanOnd, dRegBat, dBatOnd, dOndTab },
        equipements: { panneau, onduleur: selOnduleur, onduleurSepare: selOnduleurSepare, batterie: selBatterie },
      },
    })
    navigate('/devis-tech')
  }

  const longueurForTroncon = (troncon) => {
    if (troncon.includes('Panneau'))    return l3.panOnd
    if (troncon.includes('Régulateur')) return l3.regBat
    if (troncon.includes('Batterie'))   return l3.batOnd
    return l3.ondTab
  }
  const setLongueurForTroncon = (troncon, v) => {
    if (troncon.includes('Panneau'))          updateL3('panOnd', v)
    else if (troncon.includes('Régulateur'))  updateL3('regBat', v)
    else if (troncon.includes('Batterie'))    updateL3('batOnd', v)
    else                                      updateL3('ondTab', v)
  }

  const vocString = resE2?.panneaux?.voc_string

  /* helpers labels cartes */
  const labelPanneau     = p => p?.isCustom ? `✱ ${p.puissance} Wc` : `${p?.marque} ${p?.modele} — ${p?.puissance} Wc`
  const labelOnduleur    = o => o?.isCustom ? `✱ ${(o.puissance/1000).toFixed(1)}kW` : `${o?.marque} ${o?.modele} — ${(o?.puissance/1000).toFixed(1)}kW`
  const labelOndSepare   = o => {
    if (!o) return null
    if (o.isCustom) return `✱ Personnalisé — ${((o.puissance||0)/1000).toFixed(1)}kW`
    return `${o.Marque || o.marque} ${o['Modèle'] || o.modele} — ${((o['Puissance (W)'] || o.puissance || 0)/1000).toFixed(1)}kW`
  }
  const labelReg         = r => r?.isCustom ? `✱ ${r.courant_max}A` : `${r?.marque} ${r?.modele} — ${r?.courant_max}A`
  const labelBatterie    = b => b?.isCustom ? `✱ ${b.capacite}Ah` : `${b?.marque} ${b?.modele} — ${b?.capacite}Ah`

  const selReg = typeReg === 'MPPT' ? selRegMppt : selRegPwm

  /* ═══════════════════════ RENDER ══════════════════════════ */
  return (
    <div className={s.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={s.overlay} />
      <Navbar stepper={<Stepper active={2} />} avatar={<AvatarTech />} />

      <div className={s.inner}>

        {/* ══════════════════ SECTION 1 ══════════════════════ */}
        <div className={s.section}>
          <div className={s.sectionHeader} onClick={() => setOpenS1(o => !o)}>
            <div className={`${s.sectionNum} ${resE1 ? s.sectionNumDone : ''}`}>
              {resE1 ? <Check size={16} strokeWidth={3} /> : '1'}
            </div>
            <span className={s.sectionTitle}>Paramètres de calcul</span>
            <span className={s.sectionStatus}>{resE1 ? '✅ Calculé' : '⏳ En attente'}</span>
            <ChevronDown size={16} className={`${s.sectionChevron} ${openS1 ? s.sectionChevronOpen : ''}`} />
          </div>

          {openS1 && (
            <div className={s.sectionBody}>
              <div className={s.irrCard}>
                <div>
                  <span className={s.irrLabel}>
                    Irradiation solaire
                    {loc.locality && ` | ${loc.locality}`}
                  </span>
                  {loc.moisMin && <div className={s.irrSub}>{loc.moisMin}</div>}
                </div>
                <span className={s.irrVal}>{loc.irradiation ?? '—'} kWh/m²/j</span>
              </div>

              <div className={s.grid4}>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Coeff.Simultanéité</span>
                  <input type="number" min={0.50} max={1.0} step={0.01} value={cs} onChange={e => setCs(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Coeff.onduleur</span>
                  <input type="number" min={1.0} max={2.0} step={0.05} value={k} onChange={e => setK(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Rendement système</span>
                  <input type="number" min={0.60} max={0.95} step={0.01} value={eta} onChange={e => setEta(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Type d'onduleur</span>
                  <select
                    value={typeOnduleur}
                    onChange={e => {
                      setTypeOnduleur(e.target.value)
                      setSelOnduleur(null); setSelOnduleurSepare(null)
                      setSelRegMppt(null); setSelRegPwm(null)
                    }}
                    className={s.selectOrange}
                  >
                    <option value="AIO">All-in-One</option>
                    <option value="SEPARE">Régulateur séparé</option>
                  </select>
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Ratio de performance</span>
                  <input type="number" min={0.60} max={0.85} step={0.01} value={pr} onChange={e => setPr(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Autonomie système</span>
                  <input type="number" min={1} max={5} step={0.1} value={nJours} onChange={e => setNJours(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>DoD batterie</span>
                  <input type="number" min={50} max={95} step={5} value={dod} onChange={e => setDod(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Rendement batterie</span>
                  <input type="number" min={0.80} max={0.99} step={0.01} value={etaBat} onChange={e => setEtaBat(+e.target.value)} className={s.inputOrange} />
                </div>
              </div>

              <div>
                <div className={s.blkTitle}>Distances</div>
                <div className={typeOnduleur === 'AIO' ? s.grid3 : s.grid4}>
                  <Field label={typeOnduleur === 'AIO' ? 'Panneau → Onduleur' : 'Panneau → Régulateur'}>
                    <input type="number" min={1} max={100} value={dPanOnd} onChange={e => setDPanOnd(+e.target.value)} className={s.inputOrange} />
                  </Field>
                  {typeOnduleur !== 'AIO' && (
                    <Field label="Régulateur → Batterie">
                      <input type="number" min={1} max={50} value={dRegBat} onChange={e => setDRegBat(+e.target.value)} className={s.inputOrange} />
                    </Field>
                  )}
                  <Field label="Batterie → Onduleur">
                    <input type="number" min={1} max={50} value={dBatOnd} onChange={e => setDBatOnd(+e.target.value)} className={s.inputOrange} />
                  </Field>
                  <Field label="Onduleur → Tableau AC">
                    <input type="number" min={1} max={100} value={dOndTab} onChange={e => setDOndTab(+e.target.value)} className={s.inputOrange} />
                  </Field>
                </div>
              </div>

              {errE1 && (
                <div className={s.msgError}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>{errE1}</pre>
                </div>
              )}

              <button className={s.btnPrimary} onClick={lancerCalcul} disabled={loadE1}>
                {loadE1 ? <><div className={s.spinner} />Calcul en cours…</> : <><Zap size={16} />Lancer le calcul</>}
              </button>

              {resE1 && (
                <div className={s.resultsGrid}>
                  {resE1.usys             && <RC label="Tension système"      val={`${resE1.usys} V`} />}
                  {resE1.ej               && <RC label="Énergie journalière"   val={`${resE1.ej} Wh/j`} />}
                  {resE1.pc               && <RC label="Puissance champ"       val={`${resE1.pc} Wc`} />}
                  {resE1.pond             && <RC label="Puissance onduleur"    val={`${resE1.pond} W`} />}
                  {resE1.puissance_pointe && <RC label="Puissance de pointe"   val={`${resE1.puissance_pointe} W`} />}
                  {resE1.courant_regulateur && <RC label="Courant régulateur"  val={`${resE1.courant_regulateur} A`} />}
                  <RC label="Type régulation" val={typeReg === 'AIO' ? 'MPPT intégré' : typeReg} />
                  {resE1.pr               && <RC label="PR utilisé"            val={resE1.pr} />}
                  {resE1.onduleur_suggere && <RC label="Onduleur suggéré"      val={`${(resE1.onduleur_suggere.onduleur.puissance / 1000).toFixed(1)} kW`} />}
                  {resE1.nb_onduleurs > 1 && <RC label="Nb onduleurs"          val={`${resE1.nb_onduleurs} × (${resE1.phase})`} />}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════ SECTION 2 ══════════════════════ */}
        {resE1 && (
          <div className={s.section}>
            <div className={s.sectionHeader} onClick={() => setOpenS2(o => !o)}>
              <div className={`${s.sectionNum} ${resE2 ? s.sectionNumDone : ''}`}>
                {resE2 ? <Check size={16} strokeWidth={3} /> : '2'}
              </div>
              <span className={s.sectionTitle}>Choix des équipements</span>
              <span className={s.sectionStatus}>{resE2 ? '✅ Validé' : '⏳ En attente'}</span>
              <ChevronDown size={16} className={`${s.sectionChevron} ${openS2 ? s.sectionChevronOpen : ''}`} />
            </div>

            {openS2 && (
              <div className={s.sectionBody}>

                {/* Avertissement triphasé */}
                {isTriphasé && (
                  <div className={s.warnMsg}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />
                    Installation triphasée : onduleur AIO et batteries LiFePO4 uniquement
                  </div>
                )}

                {/* ── Grille de cartes ── */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${casEquip === 2 ? 4 : 3}, 1fr)`, gap: 12, marginBottom: 12 }}>

                  {/* Carte PANNEAU */}
                  <EquipCard
                    titre="Panneau solaire"
                    sel={!!selPanneau}
                    labelSel={selPanneau ? labelPanneau(selPanneau) : null}
                    subLabelSel={selPanneau ? `Vmp ${selPanneau.vmp}V / Isc ${selPanneau.isc}A` : null}
                    onChoisir={() => { setShowCustomPan(false); setModal('panneau') }}
                    onAjouter={() => setShowCustomPan(p => !p)}
                  >
                    {showCustomPan && (
                      <FormPanneauCustom pc={resE1.pc} onUse={p => {
                        setCustomPanneaux(prev => [p, ...prev])
                        setSelPanneau(p); setShowCustomPan(false); setModal(null)
                      }} />
                    )}
                  </EquipCard>

                  {/* Carte ONDULEUR AIO (CAS 1 et 3) */}
                  {casEquip !== 2 && (
                    <EquipCard
                      titre={isTriphasé ? 'Onduleur AIO Triphasé' : 'Onduleur All-in-One'}
                      sel={!!selOnduleur}
                      labelSel={selOnduleur ? labelOnduleur(selOnduleur) : null}
                      subLabelSel={selOnduleur ? `MPPT ${selOnduleur.mppt_max}V / ${selOnduleur.usys}V` : null}
                      onChoisir={() => { setShowCustomOnd(false); setModal('onduleur_aio') }}
                      onAjouter={() => setShowCustomOnd(p => !p)}
                    >
                      {showCustomOnd && (
                        <FormOnduleurCustom pc={resE1.pc} onUse={o => {
                          setCustomOnduleurs(prev => [o, ...prev])
                          setSelOnduleur(o); setShowCustomOnd(false); setModal(null)
                        }} />
                      )}
                    </EquipCard>
                  )}

                  {/* Carte ONDULEUR SÉPARÉ (CAS 2) */}
                  {casEquip === 2 && (
                    <EquipCard
                      titre="Onduleur séparé"
                      sel={!!selOnduleurSepare}
                      labelSel={labelOndSepare(selOnduleurSepare)}
                      subLabelSel={selOnduleurSepare
                        ? `${selOnduleurSepare['Tension système (V)'] || selOnduleurSepare.usys || usysDetected}V sys.`
                        : null}
                      onChoisir={() => { setShowCustomOndSep(false); setModal('onduleur_separe') }}
                      onAjouter={() => setShowCustomOndSep(p => !p)}
                    >
                      {showCustomOndSep && (
                        <FormOnduleurCustom pc={resE1.pc} onUse={o => {
                          setCustomOnduleurs(prev => [o, ...prev])
                          setSelOnduleurSepare(o); setShowCustomOndSep(false); setModal(null)
                        }} />
                      )}
                    </EquipCard>
                  )}

                  {/* Carte RÉGULATEUR (CAS 2) */}
                  {casEquip === 2 && (
                    <EquipCard
                      titre={`Régulateur ${typeReg}`}
                      sel={!!selReg}
                      labelSel={selReg ? labelReg(selReg) : null}
                      subLabelSel={selReg?.plage_pv || null}
                      onChoisir={() => { setShowCustomReg(false); setModal('regulateur') }}
                      onAjouter={() => setShowCustomReg(p => !p)}
                    >
                      {typeReg === 'MPPT' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                          <span style={{ whiteSpace: 'nowrap' }}>Vmax MPPT</span>
                          <input type="number" min={50} max={500} value={vmaxMppt} onChange={e => setVmaxMppt(+e.target.value)} className={s.inputOrange} style={{ width: 70, minWidth: 0 }} />
                          <span>V</span>
                        </div>
                      )}
                      {showCustomReg && typeReg === 'MPPT' && (
                        <FormRegMpptCustom vocString={vocString} onUse={r => {
                          setCustomRegsMppt(prev => [r, ...prev])
                          setSelRegMppt(r); setShowCustomReg(false); setModal(null)
                        }} />
                      )}
                      {showCustomReg && typeReg === 'PWM' && (
                        <FormRegPwmCustom onUse={r => {
                          setCustomRegsPwm(prev => [r, ...prev])
                          setSelRegPwm(r); setShowCustomReg(false); setModal(null)
                        }} />
                      )}
                    </EquipCard>
                  )}

                  {/* Carte BATTERIE */}
                  <EquipCard
                    titre={`Batterie ${usysDetected}V`}
                    sel={!!selBatterie}
                    labelSel={selBatterie ? labelBatterie(selBatterie) : null}
                    subLabelSel={selBatterie ? `${selBatterie.technologie || ''} / DoD ${selBatterie.dod}%` : null}
                    onChoisir={() => { setShowCustomBat(false); setModal('batterie') }}
                    onAjouter={() => setShowCustomBat(p => !p)}
                  >
                    {showCustomBat && (
                      <FormBatterieCustom usys={usysDetected} onUse={b => {
                        setCustomBatteries(prev => [b, ...prev])
                        setSelBatterie(b); setShowCustomBat(false); setModal(null)
                      }} />
                    )}
                  </EquipCard>

                </div>{/* fin grille cartes */}

                {/* ── Modales ── */}
                {modal === 'panneau' && (
                  <EquipementModal
                    open onClose={() => setModal(null)}
                    titre="Panneau solaire" badge={`${usysDetected}V`}
                    items={panneauxFiltres}
                    labelFn={p => p.isCustom ? `✱ Personnalisé — ${p.puissance} Wc` : `${p.marque} ${p.modele} — ${p.puissance} Wc`}
                    subLabelFn={p => `Voc ${p.voc}V / Vmp ${p.vmp}V / Isc ${p.isc}A`}
                    rightTopFn={p => `${p.puissance} Wc`}
                    rightBotFn={p => `${p.tension_nominale}V nominale`}
                    onSelect={p => setSelPanneau(p)}
                    onAjouter={() => setShowCustomPan(true)}
                  />
                )}

                {modal === 'onduleur_aio' && (
                  <EquipementModal
                    open onClose={() => setModal(null)}
                    titre={isTriphasé ? 'Onduleur AIO Triphasé' : 'Onduleur All-in-One'}
                    badge={`${usysDetected}V`}
                    items={onduleursAioFiltres}
                    labelFn={o => o.isCustom ? `✱ Personnalisé — ${(o.puissance/1000).toFixed(1)}kW` : `${o.marque} ${o.modele} — ${(o.puissance/1000).toFixed(1)}kW`}
                    subLabelFn={o => `MPPT ${o.mppt_min}–${o.mppt_max}V / PV max ${o.pv_max}W`}
                    rightTopFn={o => `${(o.puissance/1000).toFixed(1)} kW`}
                    rightBotFn={o => `${o.usys}V / rend. ${o.rendement}%`}
                    onSelect={o => setSelOnduleur(o)}
                    onAjouter={() => setShowCustomOnd(true)}
                  />
                )}

                {modal === 'onduleur_separe' && (
                  <EquipementModal
                    open onClose={() => setModal(null)}
                    titre="Onduleur séparé" badge={`${usysDetected}V`}
                    groups={[
                      { label: 'HYBRIDES',   items: hybridesFiltrés },
                      { label: 'CLASSIQUES', items: classiquesFiltrés },
                    ]}
                    labelFn={o => `${o.Marque} ${o['Modèle']} — ${((o['Puissance (W)']||0)/1000).toFixed(1)}kW`}
                    subLabelFn={o => `Tension sys. ${o['Tension système (V)']}V`}
                    rightTopFn={o => `${((o['Puissance (W)']||0)/1000).toFixed(1)} kW`}
                    rightBotFn={o => `Rend. ${o['Rendement (%)']}%`}
                    onSelect={o => setSelOnduleurSepare(o)}
                    onAjouter={null}
                  />
                )}

                {modal === 'regulateur' && (
                  <EquipementModal
                    open onClose={() => setModal(null)}
                    titre={`Régulateur ${typeReg}`} badge={`${usysDetected}V`}
                    items={typeReg === 'MPPT' ? regulateursMpptFiltres : regulateursPwmFiltres}
                    labelFn={r => r.isCustom ? `✱ Personnalisé — ${r.courant_max}A` : `${r.marque} ${r.modele} — ${r.courant_max}A`}
                    subLabelFn={r => r.plage_pv ? `PV: ${r.plage_pv}` : `Usys: ${r.tension_systeme}V`}
                    rightTopFn={r => `${r.courant_max}A`}
                    rightBotFn={r => `${r.type || typeReg}`}
                    onSelect={r => { typeReg === 'MPPT' ? setSelRegMppt(r) : setSelRegPwm(r) }}
                    onAjouter={() => setShowCustomReg(true)}
                  />
                )}

                {modal === 'batterie' && (
                  <EquipementModal
                    open onClose={() => setModal(null)}
                    titre={`Batterie ${usysDetected}V`} badge={`${usysDetected}V`}
                    groups={buildBatGroups(batteriesList)}
                    labelFn={b => b.isCustom ? `✱ Personnalisé — ${b.capacite}Ah/${b.tension}V` : `${b.marque} ${b.modele} — ${b.capacite}Ah`}
                    subLabelFn={b => `${b.technologie} / DoD ${b.dod}%`}
                    rightTopFn={b => b.energie ? `${b.energie} kWh` : `${b.capacite} Ah`}
                    rightBotFn={b => `${b.tension}V`}
                    onSelect={b => setSelBatterie(b)}
                    onAjouter={() => setShowCustomBat(true)}
                  />
                )}

                {/* Warnings onduleur */}
                {resE2?.warnings?.length > 0 && resE2.warnings.map((w, i) => (
                  <div key={i} className={s.warnMsg}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />{w}
                  </div>
                ))}

                {errE2 && (
                  <div className={s.msgError}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />{errE2}
                  </div>
                )}

                <button className={s.btnPrimary} onClick={lancerEtude} disabled={loadE2 || !canLancer2}>
                  {loadE2 ? <><div className={s.spinner} />Calcul en cours…</> : <><Zap size={16} />Calculer l'étude</>}
                </button>

                {resE2 && (
                  <div className={s.e2Grid}>
                    <div className={s.e2Block}>
                      <div className={s.e2BlockTitle}>☀ Champ photovoltaïque</div>
                      <div className={s.e2Row}><span className={s.e2Label}>Nb panneaux en série (Ns)</span><span className={s.e2Val}>{resE2.panneaux.ns}</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Nb strings parallèle (N//)</span><span className={s.e2Val}>{resE2.panneaux.n_parallele}</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Total panneaux (Np)</span><span className={s.e2Val}>{resE2.panneaux.np_final}</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Vmp string</span><span className={s.e2Val}>{resE2.panneaux.vmp_string} V</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Voc string</span><span className={s.e2Val}>{resE2.panneaux.voc_string} V</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Puissance réelle champ</span><span className={s.e2Val}>{resE2.panneaux.pc_reel} Wc</span></div>
                    </div>
                    <div className={s.e2Block}>
                      <div className={s.e2BlockTitle}>Pack batteries</div>
                      <div className={s.e2Row}><span className={s.e2Label}>Capacité calculée</span><span className={s.e2Val}>{resE2.batteries.c_calculee} Ah</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Capacité unitaire</span><span className={s.e2Val}>{resE2.batteries.c_unitaire} Ah</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Nombre de batteries</span><span className={s.e2Val}>{resE2.batteries.nb_batteries}</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Connexion</span><span className={s.e2Val}>{resE2.batteries.nb_serie}S / {resE2.batteries.nb_parallele}P</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Énergie totale</span><span className={s.e2Val}>{resE2.batteries.energie_totale} kWh</span></div>
                      <div className={s.e2Row}><span className={s.e2Label}>Courant régulateur</span><span className={s.e2Val}>{resE1.courant_regulateur} A</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ SECTION 3 ══════════════════════ */}
        {resE2 && (
          <div className={s.section}>
            <div className={s.sectionHeader} onClick={() => setOpenS3(o => !o)}>
              <div className={`${s.sectionNum} ${resE3 ? s.sectionNumDone : ''}`}>
                {resE3 ? <Check size={16} strokeWidth={3} /> : '3'}
              </div>
              <span className={s.sectionTitle}>Câbles et protections</span>
              <span className={s.sectionStatus}>{resE3 ? '✅ Calculé' : '⏳ En attente'}</span>
              <ChevronDown size={16} className={`${s.sectionChevron} ${openS3 ? s.sectionChevronOpen : ''}`} />
            </div>

            {openS3 && (
              <div className={s.sectionBody}>
                {errE3 && (
                  <div className={s.msgError}><AlertCircle size={16} style={{ flexShrink: 0 }} />{errE3}</div>
                )}

                <button className={s.btnPrimary} onClick={() => lancerCables()} disabled={loadE3}>
                  {loadE3 ? <><div className={s.spinner} />Calcul en cours…</> : <><Shield size={16} />Calculer câbles et protections</>}
                </button>

                {resE3 && (
                  <>
                    <div>
                      <div className={s.blkTitle}>Tronçons câbles</div>
                      <div className={s.tableWrap}>
                        <table className={s.table}>
                          <thead>
                            <tr>
                              {['Tronçon','L (m)','I (A)','Type câble','Section (mm²)','Qté','Protection','Calibre (A)'].map(h =>
                                <th key={h} className={s.th}>{h}</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {resE3.troncons.map((t, i) => (
                              <tr key={i} className={i % 2 !== 0 ? s.trEven : ''}>
                                <td className={s.td}>{t.troncon}</td>
                                <td className={s.td}>
                                  <input
                                    type="number" min={1} max={200}
                                    value={longueurForTroncon(t.troncon)}
                                    onChange={e => setLongueurForTroncon(t.troncon, +e.target.value)}
                                    className={s.longueurInput}
                                  />
                                </td>
                                <td className={`${s.td} ${s.tdOrange}`}>{t.courant}</td>
                                <td className={s.td}>{t.type_cable}</td>
                                <td className={`${s.td} ${s.tdOrange}`}>{t.section} mm²</td>
                                <td className={`${s.td} ${s.tdOrange}`}>{t.quantite ?? 1}</td>
                                <td className={s.td}>{t.protection}</td>
                                <td className={`${s.td} ${s.tdGreen}`}>{t.calibre} A</td>
                              </tr>
                            ))}
                            {resE3.differentiel && (
                              <tr style={{ background: 'rgba(34,197,94,0.06)' }}>
                                <td className={s.td}>{resE3.differentiel.type}</td>
                                <td className={s.td}>—</td>
                                <td className={s.td}>—</td>
                                <td className={s.td}>—</td>
                                <td className={s.td}>—</td>
                                <td className={`${s.td} ${s.tdOrange}`}>{resE3.differentiel.quantite}</td>
                                <td className={s.td}>Différentiel</td>
                                <td className={`${s.td} ${s.tdGreen}`}>{resE3.differentiel.calibre} A</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {dirty3 && (
                        <button className={s.btnRecalculer} onClick={() => lancerCables()} disabled={loadE3}>
                          Recalculer les câbles
                        </button>
                      )}
                    </div>

                    {resE3.porte_fusibles?.length > 0 && (
                      <div>
                        <div className={s.blkTitle}>Porte-fusibles</div>
                        <table className={s.tableSmall}>
                          <thead><tr><th className={s.th}>Désignation</th><th className={s.th}>Quantité</th></tr></thead>
                          <tbody>
                            {resE3.porte_fusibles.map((pf, i) => (
                              <tr key={i} className={i % 2 !== 0 ? s.trEven : ''}>
                                <td className={s.td}>{pf.designation}</td>
                                <td className={`${s.td} ${s.tdOrange}`}>{pf.quantite}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div>
                      <div className={s.blkTitle}>Parafoudres</div>
                      <table className={s.tableSmall}>
                        <thead><tr>
                          <th className={s.th}>Désignation</th>
                          <th className={s.th}>Quantité</th>
                          <th className={s.th}>Position</th>
                        </tr></thead>
                        <tbody>
                          {resE3.parafoudres.map((pf, i) => (
                            <tr key={i} className={i % 2 !== 0 ? s.trEven : ''}>
                              <td className={s.td}>{pf.designation}</td>
                              <td className={`${s.td} ${s.tdOrange}`}>{pf.quantite}</td>
                              <td className={s.td}>{pf.position}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {errE1?.includes('FastAPI') && (
          <div className={s.msgWarn}>
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#F59E0B' }} />
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>Démarrez le backend FastAPI pour continuer</div>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                {`cd heliobenin/backend\n.venv\\Scripts\\activate\nuvicorn app.main:app --reload`}
              </pre>
            </div>
          </div>
        )}

        <div className={s.bottomNav}>
          <button className={s.btnRetour} onClick={() => navigate('/appareils-tech')}>‹ Retour</button>
          <button className={s.btnSuivant} disabled={!resE3} onClick={handleSuivant}>
            Suivant ›
          </button>
        </div>
      </div>
    </div>
  )
}
