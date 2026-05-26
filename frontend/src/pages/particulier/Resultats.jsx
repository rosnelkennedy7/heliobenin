import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Phone, Mail, AlertCircle } from 'lucide-react'
import Navbar from '../../components/Navbar'
import Avatar from '../../components/Avatar'
import vitreImg from '../../assets/images/vitre.png'
import { getParticulier, saveParticulier, getCurrentModeParticulier } from '../../utils/storage'
import { API_BASE } from '../../utils/api'
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


/* ── Format milliers avec espace insécable ── */
const fmt = (n) =>
  Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

/* ── Lookups dans le catalogue PRIX ── */
function lookupPanneau(prix, usys) {
  const tension = usys === 48 ? 24 : usys
  return prix?.['Panneaux Solaires']
    ?.find(p => p['Puissance / Tension']?.endsWith(`/ ${tension}V`))?.['Prix FCFA'] ?? 0
}

function lookupOnduleur(prix, usys, pondW) {
  const pondKw = pondW / 1000
  return prix?.['Onduleurs All-in-One']
    ?.filter(o => o['Puissance / Tension']?.includes(`/ ${usys}V`))
    .map(o => ({ ...o, _kw: parseFloat(o['Puissance / Tension']) }))
    .sort((a, b) => a._kw - b._kw)
    .find(o => o._kw >= pondKw)?.['Prix FCFA'] ?? 0
}

function lookupBatterie(prix, usys, cUnitaire) {
  return prix?.['Batteries LiFePO4']
    ?.find(b => b['Tension / Capacité'] === `${usys}V / ${cUnitaire}Ah`)?.['Prix FCFA'] ?? 0
}

function lookupCable(prix, typeCable, section) {
  const PC = prix?.['Protection & Câble'] ?? []
  const s1 = `1×${section}mm²`
  if (typeCable.includes('H1Z2Z2K')) {
    return PC.find(c => c['Désignation']?.includes('H1Z2Z2K') && c['Calibre/Section'] === s1)?.['Prix FCFA'] ?? 0
  }
  if (typeCable.includes('rouge') || typeCable.includes('Souple')) {
    return PC.find(c => c['Désignation']?.includes('rouge/noir') && c['Calibre/Section'] === s1)?.['Prix FCFA'] ?? 0
  }
  if (typeCable.includes('H07RN-F')) {
    const s3 = `3×${section}mm²`
    return PC.find(c => c['Désignation']?.includes('H07RN-F') && c['Calibre/Section'] === s3)?.['Prix FCFA'] ?? 0
  }
  return 0
}

function lookupProtection(prix, type, calibre) {
  const PC = prix?.['Protection & Câble'] ?? []
  if (type.includes('Disjoncteur DC') || type.includes('Fusible gPV')) {
    return PC.find(c =>
      c['Catégorie'] === 'Disjoncteur DC' &&
      c['Désignation']?.includes('2P') &&
      c['Calibre/Section'] === `1000V/${calibre}A`
    )?.['Prix FCFA'] ?? 0
  }
  if (type.toLowerCase().includes('différentiel') || type.toLowerCase().includes('differentiel')) {
    return PC.find(c =>
      c['Catégorie'] === 'Différentiel' &&
      c['Désignation']?.includes('2P 30mA') &&
      c['Calibre/Section'] === `${calibre}A`
    )?.['Prix FCFA'] ?? 0
  }
  return PC.find(c =>
    c['Catégorie'] === 'Disjoncteur AC' &&
    c['Calibre/Section'] === `${calibre}A`
  )?.['Prix FCFA'] ?? 0
}

function lookupPorteFusible(prix, designation) {
  const PC = prix?.['Protection & Câble'] ?? []
  return PC.find(c =>
    c['Désignation']?.toLowerCase().includes(
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
function buildLignes(result, prix) {
  const { bilan, onduleur, panneaux, batteries, cables } = result
  if (!bilan || !panneaux || !batteries || !cables) return []

  const usys = bilan.usys
  const { troncons = [], parafoudres = [], porte_fusibles = [] } = cables
  const rows = []

  // Panneaux
  rows.push({
    key: 'pann',
    designation: `Panneau solaire monocristallin PERC/TOPCon (${usys === 48 ? 24 : usys}V)`,
    qty: panneaux.np_final,
    pu: lookupPanneau(prix, usys),
    unite: 'pce',
  })

  // Onduleur All-in-One
  const pondKw = (Math.round((onduleur?.puissance || bilan.pond) / 100) / 10).toFixed(1)
  rows.push({
    key: 'ond',
    designation: `Onduleur All-in-One ${pondKw} kW / ${usys}V (monophasé)`,
    qty: 1,
    pu: lookupOnduleur(prix, usys, bilan.pond),
    unite: 'pce',
  })

  // Batterie LiFePO4
  rows.push({
    key: 'bat',
    designation: `Batterie LiFePO4 BMS intégré ${usys}V / ${batteries.c_unitaire}Ah`,
    qty: batteries.nb_batteries,
    pu: lookupBatterie(prix, usys, batteries.c_unitaire),
    unite: 'pce',
  })

  // Câbles (1 ligne par tronçon)
  troncons.forEach((t, i) => {
    rows.push({
      key: `cable_${i}`,
      designation: `Câble ${t.type_cable} ${t.section}mm² — ${t.troncon}`,
      qty: Math.round(t.longueur),
      pu: lookupCable(prix, t.type_cable, t.section),
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
      pu: lookupProtection(prix, t.protection, t.calibre),
      unite: 'pce',
    })
  })

  // Porte-fusibles
  porte_fusibles.forEach((pf, i) => {
    rows.push({
      key: `pfus_${i}`,
      designation: pf.designation,
      qty: pf.quantite,
      pu: lookupPorteFusible(prix, pf.designation),
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
  const navigate = useNavigate()
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [resultats,   setResultats]   = useState(null)
  const [modeBudget,  setModeBudget]  = useState('sans_budget')
  const [budget,      setBudget]      = useState(0)
  const [modifie,     setModifie]     = useState(false)
  const [prix,        setPrix]        = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/prix`)
      .then(r => r.json())
      .then(setPrix)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const data = getParticulier()
    setModeBudget(data.mode || 'sans_budget')
    setBudget(data.budget || 0)
    if (data.resultats?.bilan) {
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
      const appareils   = data.appareils || []
      const loc         = data.localisation || {}
      const grille      = data.grille_coupure || null
      const mode_budget = data.mode || 'sans_budget'
      const budget_val  = data.budget || 0

      const mode = (data.cas === 'A' && grille?.heures?.length > 0) ? 'sbee' : 'solaire'
      const heures  = grille?.heures || []
      const t_matin = heures.filter(h => h >= 6 && h <= 11).length
      const t_midi  = heures.filter(h => h >= 12 && h <= 17).length
      const t_soir  = heures.filter(h => h >= 18 || h <= 5).length

      const body = {
        mode,
        appareils: appareils.map(a => ({
          nom:         a.nom,
          puissance:   a.puissance,
          quantite:    a.quantite,
          h_jour:      a.hJour ?? 0,
          h_nuit:      a.hNuit ?? 0,
          prioritaire: a.priorite !== false,
        })),
        irradiation: loc.irradiation || 5.0,
        latitude:    loc.latitude    || 6.4,
        t_matin,
        t_midi,
        t_soir,
        ...(mode_budget === 'avec_budget' ? { budget: budget_val } : {}),
      }

      const endpoint = `${API_BASE}${mode_budget === 'avec_budget'
        ? '/api/calcul/particulier/avec-budget'
        : '/api/calcul/particulier/sans-budget'}`

      const r = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!r.ok) throw new Error(`Serveur ${r.status}: ${await r.text()}`)
      const result = await r.json()

      const tmpLignes = buildLignes(result)
      const tmpSous   = tmpLignes.reduce((s, l) => s + Math.round(l.pu * MARGE) * l.qty, 0)
      const tmpTotal  = Math.round(tmpSous * MARGE_TOTAL)
      saveParticulier({ resultats: result, dernier_total: tmpTotal })
      setResultats(result)
      setModifie(true)
    } catch (e) {
      setError(e instanceof TypeError
        ? 'Impossible de joindre le serveur. Veuillez réessayer plus tard.'
        : (e.message || 'Erreur de calcul.'))
    } finally {
      setLoading(false)
    }
  }

  /* ── Calculs prix ── */
  const lignes          = resultats ? buildLignes(resultats, prix) : []
  const sousTotal       = lignes.reduce((s, l) => s + Math.round(l.pu * MARGE) * l.qty, 0)
  const totalFinal      = Math.round(sousTotal * MARGE_TOTAL)
  const cout_estime     = totalFinal
  const budget_suffisant = budget <= 0 || budget >= cout_estime
  const manque          = budget_suffisant ? 0 : cout_estime - budget
  const reste           = budget_suffisant ? budget - cout_estime : 0

  /* ── Contact dynamique ── */
  const user   = JSON.parse(localStorage.getItem('helio_user_particulier') || '{}')
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

  const dernierTotal  = getParticulier().dernier_total || 0
  const boutonsActifs = budget_suffisant && (totalFinal !== dernierTotal || modifie)
  const tooltipBtn    = !budget_suffisant
    ? "Résolvez d'abord le budget"
    : !boutonsActifs ? "Aucune modification détectée" : undefined

  const handleWa = () => {
    saveParticulier({ dernier_total: totalFinal })
    setModifie(false)
    window.open(`https://wa.me/2290194438907?text=${waMsg}`, '_blank')
  }
  const handleMail = () => {
    saveParticulier({ dernier_total: totalFinal })
    setModifie(false)
    window.open(`mailto:rosnelkennedy7@gmail.com?subject=${sujet}&body=${corps}`, '_blank')
  }

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
            {/* ── Carte budget (mode avec_budget) ── */}
            {modeBudget === 'avec_budget' && budget > 0 && (
              <div className={styles.budgetCard}>
                <div className={styles.budgetRow}>
                  <span>Votre budget</span>
                  <span className={styles.budgetVal}>{fmt(budget)} FCFA</span>
                </div>
                <div className={styles.budgetRow}>
                  <span>Coût estimé</span>
                  <span className={styles.coutVal}>{fmt(cout_estime)} FCFA</span>
                </div>
                <div className={`${styles.budgetRow} ${styles.budgetDiff} ${budget_suffisant ? styles.diffVert : styles.diffRouge}`}>
                  <span>{budget_suffisant ? 'Reste budget' : 'Manque'}</span>
                  <span>
                    {budget_suffisant
                      ? `+ ${fmt(reste)} FCFA`
                      : `- ${fmt(manque)} FCFA`}
                  </span>
                </div>
              </div>
            )}

            {/* ── Budget insuffisant ── */}
            {modeBudget === 'avec_budget' && budget > 0 && !budget_suffisant && (
              <div className={styles.insuffCard}>
                <p>Votre budget ne couvre pas cette installation. Que souhaitez-vous faire ?</p>
                <div className={styles.insuffBtns}>
                  <button
                    className={styles.btnAugmenter}
                    onClick={() => navigate('/budget')}
                  >
                    Augmenter mon budget
                  </button>
                  <button
                    className={styles.btnReduire}
                    onClick={() => {
                      saveParticulier({ cout_estime, manque })
                      navigate('/appareils')
                    }}
                  >
                    Réduire mes charges
                  </button>
                </div>
              </div>
            )}

            {/* Tableau devis — toujours affiché */}
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
                <button
                  className={styles.btnWa}
                  onClick={boutonsActifs ? handleWa : undefined}
                  title={tooltipBtn}
                  style={{ opacity: boutonsActifs ? 1 : 0.4, cursor: boutonsActifs ? 'pointer' : 'not-allowed', pointerEvents: boutonsActifs ? 'auto' : 'none' }}
                >
                  <Phone size={16} />
                  WhatsApp
                </button>
                <button
                  className={styles.btnMail}
                  onClick={boutonsActifs ? handleMail : undefined}
                  title={tooltipBtn}
                  style={{ opacity: boutonsActifs ? 1 : 0.4, cursor: boutonsActifs ? 'pointer' : 'not-allowed', pointerEvents: boutonsActifs ? 'auto' : 'none' }}
                >
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
