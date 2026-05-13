import { useState, useEffect } from 'react'
import { Check, Phone, Mail, AlertCircle } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Avatar from '../../components/Avatar'
import vitreImg from '../../assets/images/vitre.png'
import { getParticulier, saveParticulier } from '../../utils/storage'
import { PRIX } from '../../data/prix'
import styles from './Resultats.module.css'

/* ── Marges ── */
const MARGE       = 1.015
const MARGE_TOTAL = 1.005

/* ── Stepper 3 étapes — copie exacte de Localisation.jsx ── */
function Stepper({ active }) {
  const steps = ['Localisation', 'Appareils', 'Résultats']
  return (
    <div className={styles.stepper}>
      {steps.map((step, i) => (
        <div key={step} className={styles.stepWrap}>
          {i > 0 && (
            <div className={`${styles.stepLine} ${i <= active ? styles.stepLineDone : ''}`} />
          )}
          <div className={styles.stepItem}>
            <div className={`
              ${styles.stepDot}
              ${i === active ? styles.stepDotActive : ''}
              ${i < active   ? styles.stepDotDone   : ''}
            `}>
              {i < active ? '✓' : i + 1}
            </div>
            <span className={`${styles.stepLabel} ${i === active ? styles.stepLabelActive : ''}`}>
              {step}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Défauts de calcul ── */
function defaultCs(appareils) {
  const n = appareils.reduce((acc, a) => acc + (a.quantite || 1), 0)
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

/* ── Panel type par tension système (pour appel API) ── */
const DEFAULT_PANEL = {
  12: { puissance: 400,  voc: 37.0,  vmp: 31.0,  isc: 13.72 },
  24: { puissance: 550,  voc: 49.8,  vmp: 41.95, isc: 13.98 },
  48: { puissance: 550,  voc: 49.8,  vmp: 41.95, isc: 13.98 },
}

/* ── Format milliers avec espace insécable ── */
const fmt = (n) =>
  Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/* ── Lookups dans le catalogue PRIX ── */
const PC = PRIX['Protection & Câble']

function lookupPanneau(usys) {
  return PRIX['Panneaux Solaires']
    .find(p => p['Puissance / Tension'].endsWith(`/ ${usys}V`))?.['Prix FCFA'] ?? 0
}

function lookupOnduleur(usys, pondW) {
  const pondKw = pondW / 1000
  return PRIX['Onduleurs All-in-One']
    .filter(o => o['Puissance / Tension'].includes(`/ ${usys}V`))
    .map(o => ({ ...o, _kw: parseFloat(o['Puissance / Tension']) }))
    .sort((a, b) => a._kw - b._kw)
    .find(o => o._kw >= pondKw)?.['Prix FCFA'] ?? 0
}

function lookupBatterie(usys, cUnitaire) {
  return PRIX['Batteries LiFePO4']
    .find(b => b['Tension / Capacité'] === `${usys}V / ${cUnitaire}Ah`)?.['Prix FCFA'] ?? 0
}

function lookupCable(typeCable, section) {
  const s1 = `1×${section}mm²`
  if (typeCable.includes('H1Z2Z2K')) {
    return PC.find(c => c['Désignation'].includes('H1Z2Z2K') && c['Calibre/Section'] === s1)?.['Prix FCFA'] ?? 0
  }
  if (typeCable.includes('rouge') || typeCable.includes('Souple')) {
    return PC.find(c => c['Désignation'].includes('rouge/noir') && c['Calibre/Section'] === s1)?.['Prix FCFA'] ?? 0
  }
  if (typeCable.includes('H07RN-F')) {
    const s3 = `3×${section}mm²`
    return PC.find(c => c['Désignation'].includes('H07RN-F') && c['Calibre/Section'] === s3)?.['Prix FCFA'] ?? 0
  }
  return 0
}

function lookupProtection(type, calibre) {
  if (type.includes('Disjoncteur DC') || type.includes('Fusible gPV')) {
    return PC.find(c =>
      c['Catégorie'] === 'Disjoncteur DC' &&
      c['Désignation'].includes('2P') &&
      c['Calibre/Section'] === `1000V/${calibre}A`
    )?.['Prix FCFA'] ?? 0
  }
  if (type.toLowerCase().includes('différentiel') || type.toLowerCase().includes('differentiel')) {
    return PC.find(c =>
      c['Catégorie'] === 'Différentiel' &&
      c['Désignation'].includes('2P 30mA') &&
      c['Calibre/Section'] === `${calibre}A`
    )?.['Prix FCFA'] ?? 0
  }
  return PC.find(c =>
    c['Catégorie'] === 'Disjoncteur AC' &&
    c['Calibre/Section'] === `${calibre}A`
  )?.['Prix FCFA'] ?? 0
}

function lookupPorteFusible(designation) {
  return PC.find(c =>
    c['Désignation'].toLowerCase().includes(
      designation.toLowerCase().split(' ').slice(0, 3).join(' ')
    )
  )?.['Prix FCFA'] ?? 0
}

function lookupParafoudre(designation) {
  if (designation.includes('1000V') || (designation.includes('DC') && !designation.includes('AC'))) return 22500
  if (designation.includes('230V') || designation.includes('AC')) return 15500
  return 0
}

/* ── Construire les lignes du devis ── */
function buildLignes(res) {
  const { usys, etape1, etape2, etape3 } = res
  if (!etape1 || !etape2 || !etape3) return []

  const { panneaux, batteries } = etape2
  const { troncons = [], parafoudres = [], porte_fusibles = [] } = etape3
  const rows = []

  // Panneaux
  rows.push({
    key: 'pann',
    designation: `Panneau solaire monocristallin PERC/TOPCon (${usys}V)`,
    qty: panneaux.np_final,
    pu: lookupPanneau(usys),
    unite: 'pce',
  })

  // Onduleur All-in-One
  const nbOnd    = etape1.nb_onduleurs || 1
  const pondUnit = (etape1.pond || 0) / nbOnd
  const pondKw   = (Math.round(pondUnit / 100) / 10).toFixed(1)
  rows.push({
    key: 'ond',
    designation: `Onduleur All-in-One ${pondKw} kW / ${usys}V (monophasé)`,
    qty: nbOnd,
    pu: lookupOnduleur(usys, pondUnit),
    unite: 'pce',
  })

  // Batterie LiFePO4
  rows.push({
    key: 'bat',
    designation: `Batterie LiFePO4 BMS intégré ${usys}V / ${batteries.c_unitaire}Ah`,
    qty: batteries.nb_batteries,
    pu: lookupBatterie(usys, batteries.c_unitaire),
    unite: 'pce',
  })

  // Câbles (1 ligne par tronçon)
  troncons.forEach((t, i) => {
    rows.push({
      key: `cable_${i}`,
      designation: `Câble ${t.type_cable} ${t.section}mm² — ${t.troncon}`,
      qty: Math.round(t.longueur),
      pu: lookupCable(t.type_cable, t.section),
      unite: 'm',
    })
  })

  // Protections (dédupliquées par tronçon)
  const seen = new Set()
  troncons.forEach((t, i) => {
    if (!t.protection || !t.calibre) return
    const key = `${t.protection}_${t.calibre}`
    if (seen.has(key)) return
    seen.add(key)
    rows.push({
      key: `prot_${i}`,
      designation: `${t.protection} ${t.calibre}A`,
      qty: 1,
      pu: lookupProtection(t.protection, t.calibre),
      unite: 'pce',
    })
  })

  // Porte-fusibles
  porte_fusibles.forEach((pf, i) => {
    rows.push({
      key: `pfus_${i}`,
      designation: pf.designation,
      qty: pf.quantite,
      pu: lookupPorteFusible(pf.designation),
      unite: 'pce',
    })
  })

  // Parafoudres
  parafoudres.forEach((pf, i) => {
    rows.push({
      key: `para_${i}`,
      designation: `Parafoudre ${pf.designation}`,
      qty: pf.quantite,
      pu: lookupParafoudre(pf.designation),
      unite: 'pce',
    })
  })

  return rows
}

/* ═══════════════════════════════════════════ COMPOSANT ══ */
export default function Resultats() {
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [resultats, setResultats] = useState(null)

  useEffect(() => {
    const data = getParticulier()
    if (data.resultats) {
      setResultats(data.resultats)
    } else if (data.appareils?.length) {
      compute(data)
    } else {
      setError('Aucune donnée disponible. Veuillez recommencer depuis le début.')
    }
  }, [])

  const compute = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const appareils = data.appareils || []
      const loc       = data.localisation || {}

      const paramsBase = {
        appareils: appareils.map(a => ({
          nom:            a.nom,
          puissance:      a.puissance,
          quantite:       a.quantite,
          h_jour:         a.hJour  ?? 0,
          h_nuit:         a.hNuit  ?? 0,
          facteur_pointe: a.facteurPointe ?? 1.0,
        })),
        cs:  defaultCs(appareils),
        k:   defaultK(appareils),
        eta: 0.80,
        n_jours:  2.0,
        dod:      0.90,
        eta_bat:  0.95,
        irradiation:          loc.irradiation  || 5.0,
        latitude:             loc.latitude     || 6.4,
        pr:                   defaultPr(loc.latitude),
        longueur_panneau_ond: 10,
        longueur_reg_bat:      2,
        longueur_bat_ond:      2,
        longueur_ond_tableau:  10,
        type_regulateur:      'AIO',
      }

      /* Étape 1 */
      const r1 = await fetch('/api/calcul/particulier/etape1', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(paramsBase),
      })
      if (!r1.ok) throw new Error(`Serveur ${r1.status}: ${await r1.text()}`)
      const etape1 = await r1.json()

      const usys     = etape1.usys || 48
      const onduleur = etape1.onduleur_suggere?.onduleur
      const panneau  = DEFAULT_PANEL[usys] || DEFAULT_PANEL[48]

      /* Étape 2 */
      const r2 = await fetch('/api/calcul/particulier/etape2', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape1, params: paramsBase, panneau, onduleur, type_regulateur: 'AIO' }),
      })
      if (!r2.ok) throw new Error(`Serveur ${r2.status}: ${await r2.text()}`)
      const etape2 = await r2.json()

      /* Étape 3 */
      const r3 = await fetch('/api/calcul/particulier/etape3', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ etape1, etape2, params: paramsBase, panneau, type_regulateur: 'AIO' }),
      })
      if (!r3.ok) throw new Error(`Serveur ${r3.status}: ${await r3.text()}`)
      const etape3 = await r3.json()

      const res = { usys, etape1, etape2, etape3, panneau }
      saveParticulier({ resultats: res })
      setResultats(res)
    } catch (e) {
      setError(e instanceof TypeError
        ? 'Impossible de joindre le serveur. Veuillez réessayer plus tard.'
        : (e.message || 'Erreur de calcul.'))
    } finally {
      setLoading(false)
    }
  }

  /* ── Calculs ── */
  const lignes     = resultats ? buildLignes(resultats) : []
  const sousTotal  = lignes.reduce((s, l) => s + Math.round(l.pu * MARGE) * l.qty, 0)
  const totalFinal = Math.round(sousTotal * MARGE_TOTAL)

  /* ── Contact dynamique ── */
  const user   = JSON.parse(localStorage.getItem('helio_user') || '{}')
  const waMsg  = encodeURIComponent(
    `Bonjour Mr Kennedy, je suis ` +
    `${user.prenom || ''} ${user.nom || ''}. ` +
    `J'ai utilisé HélioBénin pour ` +
    `dimensionner mon système solaire. ` +
    `Mon estimation s'élève à ` +
    `${fmt(totalFinal)} FCFA. ` +
    `Je souhaite aller plus loin ` +
    `avec une étude complète.`
  )
  const sujet  = encodeURIComponent(`Projet solaire - ${user.prenom || ''} ${user.nom || ''}`)
  const corps  = encodeURIComponent(
    `Bonjour Mr Kennedy,\n\n` +
    `Je suis ${user.prenom || ''} ${user.nom || ''}, ` +
    `joignable au +229 ${user.whatsapp || ''} ` +
    `ou à ${user.email || ''}.\n\n` +
    `J'ai utilisé HélioBénin pour ` +
    `dimensionner mon système solaire. ` +
    `Mon estimation s'élève à ` +
    `${fmt(totalFinal)} FCFA.\n\n` +
    `Je souhaite une étude complète ` +
    `et un devis détaillé.\n\n` +
    `Cordialement,\n` +
    `${user.prenom || ''} ${user.nom || ''}`
  )

  const handleWa   = () => window.open(`https://wa.me/2290194438907?text=${waMsg}`, '_blank')
  const handleMail = () => window.open(`mailto:rosnelkennedy7@gmail.com?subject=${sujet}&body=${corps}`, '_blank')

  /* ═══════════════════════════════ RENDER ══ */
  return (
    <div className={styles.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={styles.overlay} />

      <Navbar stepper={<Stepper active={2} />} avatar={<Avatar />} />

      <div className={styles.inner}>

        {/* ── Loading ── */}
        {loading && (
          <div className={styles.statusCard}>
            <div className={styles.spinner} />
            <p className={styles.statusText}>Calcul du dimensionnement en cours…</p>
          </div>
        )}

        {/* ── Erreur ── */}
        {!loading && error && (
          <div className={styles.errorCard}>
            <AlertCircle size={28} color="#EF4444" />
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {/* ── Résultats ── */}
        {!loading && !error && resultats && (
          <>
            {/* Tableau devis */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={`${styles.th} ${styles.thDes}`}>Désignation</th>
                    <th className={styles.th}>Qté</th>
                    <th className={styles.th}>Unité</th>
                    <th className={styles.th}>P.U. estimé (FCFA)</th>
                    <th className={styles.th}>Total (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(l => {
                    const pu  = Math.round(l.pu * MARGE)
                    const tot = pu * l.qty
                    return (
                      <tr key={l.key} className={styles.tr}>
                        <td className={`${styles.td} ${styles.tdDes}`}>{l.designation}</td>
                        <td className={styles.td}>{l.qty}</td>
                        <td className={styles.td}>{l.unite}</td>
                        <td className={styles.td}>{pu > 0 ? fmt(pu) : '—'}</td>
                        <td className={`${styles.td} ${styles.tdTot}`}>{tot > 0 ? fmt(tot) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className={styles.tfRowTotal}>
                    <td colSpan={4} className={styles.tfLabelTotal}>Estimation totale</td>
                    <td className={styles.tfValTotal}>{fmt(totalFinal)} FCFA</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Message estimatif */}
            <p className={styles.disclaimer}>
              Ceci n'est qu'un devis estimatif.<br />
              Contactez-nous pour une étude plus avancée et un devis plus détaillé.
            </p>

            {/* Carte contact */}
            <div className={styles.contactCard}>
              <p className={styles.contactName}>Rosnel Kennedy DOSSA</p>
              <div className={styles.contactBtns}>
                <button className={styles.btnWa} onClick={handleWa}>
                  <Phone size={16} />
                  WhatsApp
                </button>
                <button className={styles.btnMail} onClick={handleMail}>
                  <Mail size={16} />
                  Email
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
