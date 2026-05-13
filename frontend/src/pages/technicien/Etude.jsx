import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check, ChevronDown, Search, Zap, Shield,
  AlertCircle, AlertTriangle, CheckCircle, Plus,
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import vitreImg from '../../assets/images/vitre.png'
import AvatarTech from '../../components/AvatarTech'

import { supabase } from '../../utils/supabaseClient'
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
  if ((lat || 6.4) < 8.0)  return 0.70
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

function saveTechnicien(data) {
  const ex = JSON.parse(localStorage.getItem('heliobenin_technicien') || '{}')
  localStorage.setItem('heliobenin_technicien', JSON.stringify({ ...ex, ...data }))
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

/* ─── Dropdown générique (compatible/autres groupés) ────── */
function Dropdown({ items = [], value, onChange, placeholder, labelFn, rightFn, compatFn }) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const allFiltered = items.filter(it => !q.trim() || labelFn(it).toLowerCase().includes(q.toLowerCase()))
  const compatible  = compatFn ? allFiltered.filter(it => compatFn(it))  : allFiltered
  const autres      = compatFn ? allFiltered.filter(it => !compatFn(it)) : []

  const renderItem = (it, i, isCompat) => (
    <button key={i} type="button"
      className={isCompat ? `${s.ddItem} ${s.ddItemCompat}` : s.ddItemOther}
      onClick={() => { onChange(it); setOpen(false) }}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFn(it)}</span>
      <span className={s.ddItemRight}>
        {isCompat && compatFn && <span className={`${s.badge} ${s.badgeGreen}`}>✓</span>}
        {rightFn && rightFn(it)}
      </span>
    </button>
  )

  return (
    <div className={s.ddWrap} ref={ref}>
      <button
        type="button"
        className={`${s.ddTrigger} ${open ? s.ddTriggerOpen : ''}`}
        onClick={() => { setOpen(o => !o); setQ('') }}
      >
        {value
          ? <span className={s.ddSelectedLabel}>{labelFn(value)}</span>
          : <span className={s.ddPlaceholder}>{placeholder}</span>}
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : '' }} />
      </button>
      {open && (
        <div className={s.ddPanel}>
          <div className={s.ddSearch}>
            <Search size={13} color="rgba(255,255,255,0.35)" />
            <input autoFocus className={s.ddSearchInput} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {allFiltered.length === 0 && <p className={s.ddNoResult}>Aucun résultat</p>}
          {compatible.length > 0 && (
            <>
              {compatFn && <div className={s.ddGroupHeader}>── Compatibles ✅ ──</div>}
              {compatible.map((it, i) => renderItem(it, `c${i}`, true))}
            </>
          )}
          {autres.length > 0 && (
            <>
              <div className={s.ddGroupHeader}>── Autres ──</div>
              {autres.map((it, i) => renderItem(it, `a${i}`, false))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Dropdown batteries groupé par technologie ─────────── */
const TECHNO_ORDER = ['LiFePO4', 'AGM', 'GEL', 'Plomb-acide']

function BatterieDropdown({ batteries = [], value, onChange, isTriphasé = false }) {
  const [open, setOpen] = useState(false)
  const [q, setQ]       = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const labelFn = b => `${b.marque} ${b.modele} — ${b.capacite}Ah / ${b.tension}V`

  const filtered = batteries.filter(b =>
    !q.trim() || labelFn(b).toLowerCase().includes(q.toLowerCase())
  )

  const grouped = TECHNO_ORDER.reduce((acc, t) => {
    const list = filtered.filter(b => {
      const techno = (b.technologie || '').toLowerCase()
      if (t === 'LiFePO4')    return techno.includes('lifepo4') || techno.includes('lithium')
      if (t === 'AGM')        return techno === 'agm'
      if (t === 'GEL')        return techno === 'gel'
      if (t === 'Plomb-acide') return techno.includes('plomb')
      return false
    })
    if (list.length) acc[t] = list
    return acc
  }, {})

  return (
    <div className={s.ddWrap} ref={ref}>
      <button
        type="button"
        className={`${s.ddTrigger} ${open ? s.ddTriggerOpen : ''}`}
        onClick={() => { setOpen(o => !o); setQ('') }}
      >
        {value
          ? <span className={s.ddSelectedLabel}>{labelFn(value)}</span>
          : <span className={s.ddPlaceholder}>Sélectionner une batterie…</span>}
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : '' }} />
      </button>
      {open && (
        <div className={s.ddPanel}>
          <div className={s.ddSearch}>
            <Search size={13} color="rgba(255,255,255,0.35)" />
            <input autoFocus className={s.ddSearchInput} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {filtered.length === 0 && <p className={s.ddNoResult}>Aucune batterie disponible</p>}
          {Object.entries(grouped).map(([techno, items]) => (
            <div key={techno}>
              <div className={s.ddGroupHeader}>── {techno} ──</div>
              {items.map((b, i) => (
                <button key={i} type="button" className={s.ddItem}
                  onClick={() => { onChange(b); setOpen(false) }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFn(b)}</span>
                  <span className={s.ddItemRight}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                      {b.energie ? `${b.energie} kWh` : `DoD ${b.dod}%`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
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
      {soumis && (
        <div className={s.msgSuccess}><CheckCircle size={15} style={{ flexShrink: 0 }} />Équipement ajouté</div>
      )}
      {!soumis && (
        <button type="button" className={s.btnPrimary} onClick={handleUse}>
          <Check size={15} /> Utiliser cet équipement
        </button>
      )}
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
function FormBatterieCustom({ onUse, onPropose, usys }) {
  const [f, setF] = useState({ tension: usys || 48, capacite: 200, technologie: 'LiFePO4', marque: '', modele: '', dod: 90, rendement: 95 })
  const [err, setErr]     = useState({})
  const [soumis, setSoumis] = useState(false)
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }

  const handleTechno = (t) => {
    set('technologie', t)
    set('dod', dodDefaut(t))
    set('rendement', rendDefaut(t))
  }

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
        type_equipement: 'batterie',
        caracteristiques: { ...item },
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
  const stored    = JSON.parse(localStorage.getItem('heliobenin_technicien') || '{}')
  const appareils = stored.appareils || []
  const loc       = stored.localisation || {}

  /* ── Params ── */
  const [cs,          setCs]          = useState(() => defaultCs(appareils))
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

  /* ── Équipements ── */
  const [selPanneau,  setSelPanneau]  = useState(null)
  const [selOnduleur, setSelOnduleur] = useState(null)
  const [selRegMppt,  setSelRegMppt]  = useState(null)
  const [selRegPwm,   setSelRegPwm]   = useState(null)
  const [selBatterie, setSelBatterie] = useState(null)
  const [usysManuel,  setUsysManuel]  = useState(48)
  const [vmaxMppt,    setVmaxMppt]    = useState(150)

  /* ── Formulaires custom ── */
  const [showCustomPan,  setShowCustomPan]  = useState(false)
  const [showCustomOnd,  setShowCustomOnd]  = useState(false)
  const [showCustomReg,  setShowCustomReg]  = useState(false)
  const [showCustomBat,  setShowCustomBat]  = useState(false)

  /* ── Équipements custom (ajoutés en tête de liste) ── */
  const [customPanneaux,  setCustomPanneaux]  = useState([])
  const [customOnduleurs, setCustomOnduleurs] = useState([])
  const [customRegsMppt,  setCustomRegsMppt]  = useState([])
  const [customRegsPwm,   setCustomRegsPwm]   = useState([])
  const [customBatteries, setCustomBatteries] = useState([])

  /* ── Équipements depuis l'API ── */
  const [equipements, setEquipements] = useState({})

  useEffect(() => {
    fetch('/api/equipements')
      .then(r => r.json())
      .then(data => setEquipements(data))
      .catch(() => {})
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
    if (sv.equipements?.panneau)  setSelPanneau(sv.equipements.panneau)
    if (sv.equipements?.onduleur) setSelOnduleur(sv.equipements.onduleur)
    if (sv.equipements?.batterie) setSelBatterie(sv.equipements.batterie)
  }, [])

  /* ── Section 3 longueurs ── */
  const [l3, setL3] = useState({ panOnd: 10, regBat: 2, batOnd: 2, ondTab: 10 })
  const [dirty3, setDirty3] = useState(false)
  const updateL3 = (k, v) => { setL3(p => ({ ...p, [k]: v })); setDirty3(true) }

  /* Sync longueurs → section 3 à la 1ère fois */
  useEffect(() => {
    if (resE2) setL3({ panOnd: dPanOnd, regBat: dRegBat, batOnd: dBatOnd, ondTab: dOndTab })
  }, [!!resE2])

  /* typeReg dérivé automatiquement : AIO ou MPPT/PWM selon Pc calculé */
  const typeReg = typeOnduleur === 'AIO' ? 'AIO'
    : resE1 ? ((resE1.pc ?? 0) > 800 ? 'MPPT' : 'PWM') : 'MPPT'

  /* Compatibilité panneaux selon Usys */
  const usysDetected = resE1?.usys || 48
  const isTriphasé = resE1?.nb_onduleurs === 3 || resE1?.phase === 'triphasé'
  const panneauCompat = (p) => {
    if (usysDetected === 12) return p.tension_nominale === 12
    if (usysDetected === 24) return p.tension_nominale === 24 || p.tension_nominale === 12
    return true  // 48V : tous compatibles (mise en série)
  }
  const batterieCompat = (b) => b.tension === usysDetected

  /* Listes filtrées depuis l'API */
  const panneauxList = [...customPanneaux, ...(equipements.panneaux || [])]
  const onduleursAioList = [...customOnduleurs, ...(equipements.onduleurs_aio || []).filter(o => !resE1 || o.usys === usysDetected)]
  const regulateursMpptList = [...customRegsMppt, ...(equipements.regulateurs || []).filter(r => {
    const ts = String(r.tension_systeme || '')
    return (r.type || '').toUpperCase() === 'MPPT' && ts.includes(String(usysDetected))
  })]
  const regulateursPwmList = [...customRegsPwm, ...(equipements.regulateurs || []).filter(r => {
    const ts = String(r.tension_systeme || '')
    return (r.type || '').toUpperCase() === 'PWM' && ts.includes(String(usysDetected))
  })]
  const batteriesList = [...customBatteries, ...(equipements.batteries || []).filter(b => {
    if (isTriphasé) {
      const t = (b.technologie || '').toLowerCase()
      return b.tension === usysDetected && (t.includes('lifepo4') || t.includes('lithium'))
    }
    return b.tension === usysDetected
  })]

  /* APPAREILS → format API */
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

  /* ────────────────────────────────── ÉTAPE 1 ── */
  const lancerCalcul = async () => {
    if (!appareils.length) { setErrE1('Aucun appareil trouvé. Retournez à la page Appareils.'); return }
    setLoadE1(true); setErrE1(null); setResE1(null); setResE2(null); setResE3(null)
    try {
      const r = await fetch('/api/calcul/technicien/etape1', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramsApi()),
      })
      if (!r.ok) throw new Error(`Serveur ${r.status}: ${await r.text()}`)
      const data = await r.json()
      setResE1(data)
      setOpenS1(false); setOpenS2(true)
    } catch (e) {
      setErrE1(e instanceof TypeError
        ? 'Impossible de joindre le backend.\nDémarrez le serveur FastAPI :\n  cd heliobenin/backend\n  uvicorn app.main:app --reload'
        : e.message)
    } finally { setLoadE1(false) }
  }

  /* ────────────────────────────────── ÉTAPE 2 ── */
  const panneau = selPanneau
    ? { puissance: selPanneau.puissance, voc: selPanneau.voc, vmp: selPanneau.vmp, isc: selPanneau.isc }
    : null

  const canLancer2 = !!panneau && (
    typeReg === 'AIO'  ? !!selOnduleur :
    typeReg === 'MPPT' ? !!selRegMppt  :
    !!selRegPwm
  )

  const lancerEtude = async () => {
    if (!panneau) { setErrE2('Sélectionnez un panneau.'); return }
    setLoadE2(true); setErrE2(null); setResE2(null); setResE3(null)
    try {
      const equip = {
        panneau, type_regulateur: paramsApi().type_regulateur,
        ...(typeReg === 'AIO'  && selOnduleur  ? { onduleur: selOnduleur }           : {}),
        ...(typeReg === 'MPPT' && selRegMppt   ? { usys: resE1?.usys || 48, vmax_mppt: +vmaxMppt } : {}),
        ...(typeReg === 'PWM'  && selRegPwm    ? { usys: resE1?.usys || 48 }           : {}),
        ...(selBatterie ? { batterie: selBatterie } : {}),
      }
      const body = { etape1: resE1, params: paramsApi(), ...equip }
      const r = await fetch('/api/calcul/technicien/etape2', {
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

  /* ────────────────────────────────── ÉTAPE 3 ── */
  const lancerCables = async (longueurs) => {
    const L = longueurs || l3
    setLoadE3(true); setErrE3(null); setDirty3(false)
    try {
      const body = {
        etape1: resE1, etape2: resE2,
        params: paramsApi(L),
        panneau,
        type_regulateur: paramsApi().type_regulateur,
      }
      const r = await fetch('/api/calcul/technicien/etape3', {
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
        equipements: { panneau, onduleur: selOnduleur, batterie: selBatterie },
      },
    })
    navigate('/devis-tech')
  }

  /* ─── Longueur d'un tronçon dans le tableau ── */
  const longueurForTroncon = (troncon) => {
    if (troncon.includes('Panneau'))      return l3.panOnd
    if (troncon.includes('Régulateur'))  return l3.regBat
    if (troncon.includes('Batterie'))    return l3.batOnd
    return l3.ondTab
  }
  const setLongueurForTroncon = (troncon, v) => {
    if (troncon.includes('Panneau'))     updateL3('panOnd', v)
    else if (troncon.includes('Régulateur')) updateL3('regBat', v)
    else if (troncon.includes('Batterie'))   updateL3('batOnd', v)
    else                                     updateL3('ondTab', v)
  }

  /* Voc_string pour warnings régulateur */
  const vocString = resE2?.panneaux?.voc_string

  /* ═══════════════════════════════════════════ RENDER ══ */
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
            <span className={s.sectionTitle}>1ère Étape — Paramètres de calcul</span>
            <span className={s.sectionStatus}>{resE1 ? '✅ Calculé' : '⏳ En attente'}</span>
            <ChevronDown size={16} className={`${s.sectionChevron} ${openS1 ? s.sectionChevronOpen : ''}`} />
          </div>

          {openS1 && (
            <div className={s.sectionBody}>
              {/* Irradiation — carte verte */}
              <div className={s.irrCard}>
                <div>
                  <span className={s.irrLabel}>Irradiation solaire </span>
                  {loc.moisMin && <div className={s.irrSub}>{loc.moisMin}</div>}
                </div>
                <span className={s.irrVal}>{loc.irradiation ?? '—'} kWh/m²/j</span>
              </div>

              {/* 8 paramètres — cartes amber compactes */}
              <div className={s.grid4}>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Coeff.Simultanéité</span>
                  <input type="number" min={0.50} max={1.0} step={0.01} value={cs} onChange={e => setCs(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}> Coeff.onduleur</span>
                  <input type="number" min={1.0} max={2.0} step={0.05} value={k} onChange={e => setK(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Rendement système</span>
                  <input type="number" min={0.60} max={0.95} step={0.01} value={eta} onChange={e => setEta(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Type d'onduleur</span>
                  <select value={typeOnduleur} onChange={e => { setTypeOnduleur(e.target.value); setSelOnduleur(null); setSelRegMppt(null); setSelRegPwm(null) }} className={s.selectOrange}>
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
                  <span className={s.paramLabel}>DoD batterie </span>
                  <input type="number" min={50} max={95} step={5} value={dod} onChange={e => setDod(+e.target.value)} className={s.inputOrange} />
                </div>
                <div className={s.paramCard}>
                  <span className={s.paramLabel}>Rendement batterie</span>
                  <input type="number" min={0.80} max={0.99} step={0.01} value={etaBat} onChange={e => setEtaBat(+e.target.value)} className={s.inputOrange} />
                </div>
              </div>

              {/* Distances — 3 ou 4 champs sur une ligne */}
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

              {/* Résultats E1 */}
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
              <span className={s.sectionTitle}>2ème Étape — Choix des équipements</span>
              <span className={s.sectionStatus}>{resE2 ? '✅ Validé' : '⏳ En attente'}</span>
              <ChevronDown size={16} className={`${s.sectionChevron} ${openS2 ? s.sectionChevronOpen : ''}`} />
            </div>

            {openS2 && (
              <div className={s.sectionBody}>
                <div className={s.equipGrid}>
                {/* ── PANNEAU ── */}
                <div className={s.equipSection}>
                  <div className={s.equipTitle}>☀ Panneau solaire</div>
                  <Dropdown
                    items={panneauxList}
                    value={selPanneau}
                    onChange={p => { setSelPanneau(p); setShowCustomPan(false) }}
                    placeholder="Sélectionner un panneau…"
                    labelFn={p => p.isCustom ? `✱ Personnalisé — ${p.puissance} Wc` : `${p.marque} ${p.modele} — ${p.puissance} Wc`}
                    rightFn={p => <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{p.vmp}V / {p.isc}A</span>}
                    compatFn={panneauCompat}
                  />
                  {!showCustomPan
                    ? <button type="button" className={s.btnSecondary} onClick={() => setShowCustomPan(true)}><Plus size={14} />Ajouter un panneau</button>
                    : <FormPanneauCustom pc={resE1.pc} onUse={p => {
                        setCustomPanneaux(prev => [p, ...prev])
                        setSelPanneau(p)
                        setShowCustomPan(false)
                      }} />
                  }
                </div>

                {/* ── ONDULEUR / RÉGULATEUR ── */}
                <div className={s.equipSection}>
                  <div className={s.equipTitle}>
                    ⚡ {typeReg === 'AIO' ? 'Onduleur All-in-One' : typeReg === 'MPPT' ? 'Régulateur MPPT' : 'Régulateur PWM'}
                  </div>

                  {typeReg === 'AIO' && (
                    <>
                      <Dropdown
                        items={onduleursAioList}
                        value={selOnduleur}
                        onChange={o => { setSelOnduleur(o); setShowCustomOnd(false) }}
                        placeholder="Choisir un onduleur AIO…"
                        labelFn={o => o.isCustom ? `✱ Personnalisé — ${o.puissance / 1000} kW / ${o.usys}V` : `${o.marque} ${o.modele} — ${o.puissance / 1000} kW / ${o.usys}V`}
                        rightFn={o => <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>MPPT {o.mppt_max}V</span>}
                      />
                      {!showCustomOnd
                        ? <button type="button" className={s.btnSecondary} onClick={() => setShowCustomOnd(true)}><Plus size={14} />Ajouter un onduleur</button>
                        : <FormOnduleurCustom pc={resE1.pc} onUse={o => {
                            setCustomOnduleurs(prev => [o, ...prev])
                            setSelOnduleur(o)
                            setShowCustomOnd(false)
                          }} />
                      }
                      {resE2?.warnings?.length > 0 && resE2.warnings.map((w, i) => (
                        <div key={i} className={s.warnMsg}>
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />{w}
                        </div>
                      ))}
                    </>
                  )}

                  {typeReg === 'MPPT' && (
                    <>
                      <Field label="Vmax MPPT (V)">
                        <input type="number" min={50} max={500} value={vmaxMppt} onChange={e => setVmaxMppt(+e.target.value)} className={s.inputOrange} style={{ maxWidth: 180 }} />
                      </Field>
                      <Dropdown
                        items={regulateursMpptList}
                        value={selRegMppt}
                        onChange={r => { setSelRegMppt(r); setShowCustomReg(false) }}
                        placeholder="Sélectionner un régulateur MPPT…"
                        labelFn={r => r.isCustom ? `✱ Personnalisé — ${r.courant_max}A / ${r.vmax_pv}V` : `${r.marque} ${r.modele} — ${r.courant_max}A`}
                        rightFn={r => <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{r.plage_pv}</span>}
                      />
                      {!showCustomReg
                        ? <button type="button" className={s.btnSecondary} onClick={() => setShowCustomReg(true)}><Plus size={14} />Ajouter un régulateur MPPT</button>
                        : <FormRegMpptCustom vocString={vocString} onUse={r => {
                            setCustomRegsMppt(prev => [r, ...prev])
                            setSelRegMppt(r)
                            setShowCustomReg(false)
                          }} />
                      }
                    </>
                  )}

                  {typeReg === 'PWM' && (
                    <>
                      <Dropdown
                        items={regulateursPwmList}
                        value={selRegPwm}
                        onChange={r => { setSelRegPwm(r); setShowCustomReg(false) }}
                        placeholder="Sélectionner un régulateur PWM…"
                        labelFn={r => r.isCustom ? `✱ Personnalisé — ${r.courant_max}A` : `${r.marque} ${r.modele} — ${r.courant_max}A`}
                      />
                      {!showCustomReg
                        ? <button type="button" className={s.btnSecondary} onClick={() => setShowCustomReg(true)}><Plus size={14} />Ajouter un régulateur PWM</button>
                        : <FormRegPwmCustom onUse={r => {
                            setCustomRegsPwm(prev => [r, ...prev])
                            setSelRegPwm(r)
                            setShowCustomReg(false)
                          }} />
                      }
                    </>
                  )}
                </div>

                {/* ── BATTERIE ── */}
                <div className={s.equipSection}>
                  <div className={s.equipTitle}>Batterie ({usysDetected}V)</div>
                  {isTriphasé && (
                    <div className={s.warnMsg}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2, color: '#F59E0B' }} />
                      Installation triphasée — batteries LiFePO4 uniquement
                    </div>
                  )}
                  <BatterieDropdown
                    batteries={batteriesList}
                    value={selBatterie}
                    onChange={b => { setSelBatterie(b); setShowCustomBat(false) }}
                    isTriphasé={isTriphasé}
                  />
                  {!showCustomBat
                    ? <button type="button" className={s.btnSecondary} onClick={() => setShowCustomBat(true)}><Plus size={14} />Ajouter une batterie</button>
                    : <FormBatterieCustom usys={usysDetected} onUse={b => {
                        setCustomBatteries(prev => [b, ...prev])
                        setSelBatterie(b)
                        setShowCustomBat(false)
                      }} />
                  }
                </div>
                </div>{/* equipGrid */}

                {errE2 && (
                  <div className={s.msgError}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />{errE2}
                  </div>
                )}

                <button className={s.btnPrimary} onClick={lancerEtude} disabled={loadE2 || !canLancer2}>
                  {loadE2 ? <><div className={s.spinner} />Calcul en cours…</> : <><Zap size={16} />Calculer l'étude</>}
                </button>

                {/* Résultats E2 */}
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
                      <div className={s.e2Row}><span className={s.e2Label}>Courant régulateur</span><span className={s.e2Val}>{resE2.courant_regulateur} A</span></div>
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
              <span className={s.sectionTitle}>3ème Étape — Câbles et protections</span>
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
                    {/* Tableau principal */}
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

                    {/* Porte-fusibles */}
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

                    {/* Parafoudres */}
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

        {/* Message backend non démarré */}
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

        {/* Navigation */}
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
