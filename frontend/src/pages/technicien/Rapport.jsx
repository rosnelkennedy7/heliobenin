import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Printer, ArrowLeft } from 'lucide-react'
import Navbar from '../../components/Navbar'
import AvatarTech from '../../components/AvatarTech'
import vitreImg from '../../assets/images/vitre.webp'
import { getTechnicien, getUserTechnicien } from '../../utils/storage'
import { supabase } from '../../utils/supabaseClient'
import s from './Rapport.module.css'
import NoteTool from '../../components/NoteTool'

const STEPS = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']
const SHORT_LABELS = {
  'Localisation': 'Local.',
  'Appareils':    'App.',
  'Étude':        'Étude',
  'Devis':        'Devis',
  'Rapport':      'Rapp.',
}

function Stepper({ active }) {
  return (
    <div className={s.stepper}>
      {STEPS.map((step, i) => (
        <div key={step} className={s.stepItem}>
          <div className={`${s.stepDot} ${i === active ? s.stepDotActive : ''} ${i < active ? s.stepDotDone : ''}`}>
            {i < active ? <Check size={20} strokeWidth={3} /> : i + 1}
          </div>
          <span className={`${s.stepLabel} ${i === active ? s.stepLabelActive : ''}`} data-short={SHORT_LABELS[step] ?? step}>{step}</span>
        </div>
      ))}
    </div>
  )
}

const fmt  = (n) => n != null && n !== '' ? Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—'
const fmtF = (n, d = 2) => n != null && n !== '' ? Number(n).toFixed(d) : '—'
const NA   = () => <span className={s.na}>Non renseigné</span>

const MAINTENANCE_DATA = [
  {
    section: 'Panneaux solaires',
    rows: [
      { operation: 'Nettoyage surface',         intervalle: 'Mensuel',    responsable: 'Technicien',                    travaux: 'Laver eau propre, essuyer délicatement, éviter heures chaudes',                        outils: 'Chiffon, eau, seau' },
      { operation: 'Vérification fixations',    intervalle: 'Semestriel', responsable: 'Technicien',                    travaux: 'Contrôler boulons, vis, structure. Vérifier inclinaison',                              outils: 'Clé, tournevis' },
      { operation: 'Inspection visuelle cellules', intervalle: 'Semestriel', responsable: 'Technicien',                 travaux: 'Rechercher fissures, délaminage, points chauds. Remplacer panneau endommagé',            outils: 'Visuel' },
      { operation: 'Contrôle connecteurs MC4',  intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Vérifier étanchéité, corrosion, surchauffe',                                            outils: 'Multimètre, outil MC4' },
    ],
  },
  {
    section: 'Batteries LFP',
    rows: [
      { operation: 'Vérification SOC',          intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire SOC sur écran onduleur. Alerter si SOC < 10% répété',                             outils: 'Écran onduleur' },
      { operation: 'Contrôle température',      intervalle: 'Mensuel',    responsable: 'Technicien',                    travaux: 'Vérifier 0°C à 45°C. Améliorer ventilation si nécessaire',                             outils: 'Thermomètre' },
      { operation: 'Inspection bornes et câbles', intervalle: 'Semestriel', responsable: 'Technicien',                  travaux: 'Nettoyer corrosion, resserrer bornes, vérifier isolation',                              outils: 'Clé, chiffon, multimètre' },
      { operation: 'Lecture cycles BMS',        intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Relever cycles, comparer durée de vie prévue 6000 cycles',                              outils: 'Application BMS, PC' },
    ],
  },
  {
    section: 'Batteries AGM',
    rows: [
      { operation: 'Vérification charge',       intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire tension écran. Pleine ≈ 13,8V. Alerter si tension anormalement basse',            outils: 'Écran onduleur' },
      { operation: 'Contrôle visuel boîtier',   intervalle: 'Mensuel',    responsable: 'Technicien',                    travaux: 'Vérifier absence gonflement, fissure, fuite. Déformation = remplacement',               outils: 'Visuel' },
      { operation: 'Nettoyage bornes',          intervalle: 'Semestriel', responsable: 'Technicien',                    travaux: 'Déposer, nettoyer bornes, appliquer graisse anti-oxydation',                            outils: 'Clé, brosse, graisse' },
      { operation: 'Test capacité résiduelle',  intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Mesurer capacité réelle. Si < 80% nominal, planifier remplacement',                     outils: 'Testeur batterie, multimètre' },
    ],
  },
  {
    section: 'Batteries GEL',
    rows: [
      { operation: 'Vérification charge',       intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire tension. Pleine ≈ 13,8V. Ne jamais décharger sous 11,8V',                        outils: 'Écran onduleur' },
      { operation: 'Contrôle visuel boîtier',   intervalle: 'Mensuel',    responsable: 'Technicien',                    travaux: 'Vérifier absence gonflement, fuite gel. Gonflée = remplacement immédiat',               outils: 'Visuel' },
      { operation: 'Inspection câbles et bornes', intervalle: 'Semestriel', responsable: 'Technicien',                  travaux: 'Nettoyer, resserrer bornes. Pas de charge rapide (dégrade gel)',                        outils: 'Clé, chiffon, multimètre' },
      { operation: 'Test capacité résiduelle',  intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Mesurer capacité réelle. Si < 80% nominal, planifier remplacement',                     outils: 'Testeur batterie, multimètre' },
    ],
  },
  {
    section: 'Batteries Plomb',
    rows: [
      { operation: 'Vérification niveau électrolyte', intervalle: 'Mensuel', responsable: 'Technicien',                 travaux: "Compléter avec eau distillée si niveau bas. Ne jamais ajouter d'acide",                  outils: 'Seringue, eau distillée' },
      { operation: 'Mesure densité électrolyte', intervalle: 'Mensuel',   responsable: 'Technicien',                    travaux: 'Densité chargée ≈ 1,26 g/cm³. Égalisation si écart > 0,03 entre cellules',             outils: 'Pèse-acide, multimètre' },
      { operation: 'Nettoyage bornes',          intervalle: 'Semestriel', responsable: 'Technicien',                    travaux: 'Déposer bornes, nettoyer sulfatation, appliquer graisse anti-oxydation',                 outils: 'Clé, brosse métallique, graisse' },
      { operation: 'Test capacité résiduelle',  intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Mesurer capacité réelle. Si < 70% nominal, planifier remplacement',                     outils: 'Testeur batterie, multimètre' },
    ],
  },
  {
    section: 'Onduleur / Régulateur',
    rows: [
      { operation: 'Lecture alarmes',           intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Vérifier absence alarme écran. Noter code et contacter technicien',                    outils: 'Écran onduleur' },
      { operation: 'Nettoyage grilles ventilation', intervalle: 'Mensuel', responsable: 'Technicien',                   travaux: 'Souffler poussière grilles. Ne pas obstruer ventilations. Vérifier ventilateur interne', outils: "Souffleur d'air" },
      { operation: 'Test basculement réseau/batterie', intervalle: 'Semestriel', responsable: 'Technicien',             travaux: 'Simuler coupure SBEE, vérifier commutation < 20ms',                                     outils: 'Chronomètre, multimètre' },
      { operation: 'Mise à jour firmware + rapport', intervalle: 'Annuel', responsable: 'Technicien',                   travaux: 'Consulter site fabricant, sauvegarder config avant MAJ, rédiger rapport maintenance',   outils: 'PC, connexion internet' },
    ],
  },
  {
    section: 'Câbles et protections',
    rows: [
      { operation: 'Inspection visuelle câbles', intervalle: 'Semestriel', responsable: 'Technicien',                   travaux: 'Rechercher brûlures, fissures, rongeurs. Remplacer câble endommagé',                      outils: 'Visuel, multimètre' },
      { operation: 'Test disjoncteurs et fusibles', intervalle: 'Annuel', responsable: 'Technicien',                    travaux: 'Déclencher manuellement. Vérifier réarmement. Remplacer fusibles grillés',               outils: 'Tournevis, multimètre' },
      { operation: 'Contrôle parafoudre DC',    intervalle: 'Annuel',     responsable: 'Technicien',                    travaux: 'Vérifier voyant état. Rouge ou absent = remplacement immédiat',                          outils: 'Visuel, multimètre' },
      { operation: 'Mesure résistance de terre', intervalle: 'Annuel',    responsable: 'Technicien',                    travaux: 'Mesurer résistance terre. Max admissible 5 Ω. Reprendre terre si dépassé',               outils: 'Telluromètre' },
    ],
  },
]

export default function Rapport() {
  const navigate = useNavigate()
  const [toast,   setToast]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const handleEnregistrer = async () => {
    setSaving(true)
    setSaveErr('')
    try {
      const userProfile = getUserTechnicien()
      const techStore   = getTechnicien()
      const projetId    = techStore.projet_id || null

      let userId = userProfile.id
      if (!userId && userProfile.email && supabase) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', userProfile.email).maybeSingle()
        userId = profile?.id
      }
      if (!userId) throw new Error('Profil introuvable')

      if (projetId) {
        // UPDATE
        const { error } = await supabase.from('projets_technicien').update({
          etude:        techStore.etude        || null,
          localisation: techStore.localisation || null,
          appareils:    techStore.appareils    || null,
          updated_at:   new Date().toISOString(),
        }).eq('id', projetId)
        if (error) throw error
      } else {
        // INSERT
        const { data, error } = await supabase.from('projets_technicien').insert([{
          user_id:      userId,
          nom_projet:   techStore.nom_projet   || 'Sans nom',
          etude:        techStore.etude        || null,
          localisation: techStore.localisation || null,
          appareils:    techStore.appareils    || null,
        }]).select().single()
        if (error) throw error
        saveTechnicien({ projet_id: data.id })
      }

      setToast(true)
      setTimeout(() => setToast(false), 2500)
    } catch (e) {
      console.error('[Rapport] save:', e)
      setSaveErr('Erreur lors de la sauvegarde.')
      setTimeout(() => setSaveErr(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const techStore = getTechnicien()
  const loc       = techStore.localisation || {}
  const appareils = techStore.appareils    || []
  const etude     = techStore.etude        || {}
  const devis     = techStore.devis        || {}
  const etape1    = etude.etape1           || {}
  const etape2    = etude.etape2           || {}
  const etape3    = etude.etape3           || {}
  const params    = etude.parametres       || {}
  const equip     = etude.equipements      || {}
  const client    = devis.client           || {}
  const tech      = devis.tech             || {}

  const today      = new Date()
  const dateStr    = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  const techName   = tech.nom   ? [tech.civilite,   tech.nom].filter(Boolean).join(' ')   : null
  const clientName = client.nom ? [client.civilite, client.nom].filter(Boolean).join(' ') : null

  const energiesTable = appareils.map((a, i) => {
    const h = (a.hJour ?? a.h_jour ?? 0) + (a.hNuit ?? a.h_nuit ?? 0)
    return {
      num: i + 1,
      nom: a.nom || '',
      puissance: a.puissance || 0,
      quantite: a.quantite || 1,
      heures: h,
      energie: (a.puissance || 0) * (a.quantite || 1) * h,
    }
  })
  const totalBrutWh = energiesTable.reduce((acc, r) => acc + r.energie, 0)

  const protections = []
  if (etape3.troncons?.length) {
    const seen = new Set()
    etape3.troncons.forEach((t) => {
      if (t.protection && t.calibre) {
        const key = `${t.protection}_${t.calibre}`
        if (!seen.has(key)) {
          seen.add(key)
          protections.push({ designation: `${t.protection} ${t.calibre}A`, calibre: t.calibre, tension: '—', modele: '—', qty: 1 })
        }
      }
    })
  }
  if (etape3.porte_fusibles?.length)
    etape3.porte_fusibles.forEach((pf) =>
      protections.push({ designation: pf.designation, calibre: '—', tension: '—', modele: '—', qty: pf.quantite })
    )
  if (etape3.parafoudres?.length)
    etape3.parafoudres.forEach((pf) =>
      protections.push({ designation: `Parafoudre ${pf.designation}`, calibre: '—', tension: '—', modele: '—', qty: pf.quantite })
    )
  if (etape3.differentiel) {
    const d = etape3.differentiel
    protections.push({ designation: `${d.type} ${d.calibre}A`, calibre: d.calibre, tension: '—', modele: '—', qty: d.quantite })
  }

  // Plan d'entretien filtré selon technologie batterie
  const techBat = (equip.batterie?.technologie || '').toLowerCase()
  const isLFP = techBat.includes('lifepo4') || techBat.includes('lithium')
  const isAGM = techBat.includes('agm')
  const isGEL = techBat.includes('gel')

  const maintDataFiltered = MAINTENANCE_DATA.filter(sec => {
    if (sec.section === 'Panneaux solaires')     return true
    if (sec.section === 'Batteries LFP')         return isLFP
    if (sec.section === 'Batteries AGM')         return isAGM
    if (sec.section === 'Batteries GEL')         return isGEL
    if (sec.section === 'Batteries Plomb')       return !isLFP && !isAGM && !isGEL
    if (sec.section === 'Onduleur / Régulateur') return true
    if (sec.section === 'Câbles et protections') return true
    return false
  })

  const maintRows = maintDataFiltered.flatMap(sec => [
    { type: 'header', section: sec.section },
    ...sec.rows.map(r => ({ type: 'row', ...r })),
  ])

  const isTriphasé = (etape1.nb_onduleurs || 1) > 1

  return (
    <div className={s.page} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={s.overlay} />
      <Navbar stepper={<Stepper active={4} />} avatar={<AvatarTech />} />

      <div className={s.pageContent}>
        <div className={s.carteRapport}>

          {/* ══════════════════ PAGE 1 — EN-TÊTE ══════════════════ */}
          <div className={s.a4Page}>
            <div className={s.entete}>
              {devis.type_entete === 'entete_complete' && devis.enteteDataUrl
                ? <img src={devis.enteteDataUrl} className={s.enteteImg} alt="En-tête" />
                : devis.logoDataUrl
                  ? <img src={devis.logoDataUrl} className={s.logoImg} alt="Logo" />
                  : <div className={s.enteteVide} />
              }
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className={s.titrePrincipal}>RAPPORT TECHNIQUE</div>
              <div className={s.titreTrait} />
            </div>

            <div className={s.infoGrid}>
              <div className={s.infoBlock}>
                <div className={s.infoBlockTitle}>Client</div>
                {clientName    && <div className={s.infoRow}><span className={s.infoLabel}>Nom</span><span className={s.infoVal}>{clientName}</span></div>}
                {client.telephone && <div className={s.infoRow}><span className={s.infoLabel}>Téléphone</span><span className={s.infoVal}>{client.telephone}</span></div>}
                {client.email  && <div className={s.infoRow}><span className={s.infoLabel}>Email</span><span className={s.infoVal}>{client.email}</span></div>}
                {client.localisation && <div className={s.infoRow}><span className={s.infoLabel}>Adresse</span><span className={s.infoVal}>{client.localisation}</span></div>}
                {!clientName && !client.telephone && !client.email && !client.localisation && (
                  <div className={s.infoRow}><span className={s.infoVal}><NA /></span></div>
                )}
              </div>
              <div className={s.infoBlock}>
                <div className={s.infoBlockTitle}>Localisation &amp; Projet</div>
                {loc.latitude  != null && <div className={s.infoRow}><span className={s.infoLabel}>Latitude</span><span className={s.infoVal}>{`${fmtF(loc.latitude, 4)}°`}</span></div>}
                {loc.longitude != null && <div className={s.infoRow}><span className={s.infoLabel}>Longitude</span><span className={s.infoVal}>{`${fmtF(loc.longitude, 4)}°`}</span></div>}
                {loc.irradiation != null && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Irradiation</span>
                    <span className={s.infoVal}>{`${loc.irradiation} kWh/m²/j${loc.moisMin ? ` (${loc.moisMin})` : ''}`}</span>
                  </div>
                )}
                {techName && <div className={s.infoRow}><span className={s.infoLabel}>Technicien</span><span className={s.infoVal}>{techName}</span></div>}
                <div className={s.infoRow}><span className={s.infoLabel}>Date rapport</span><span className={s.infoVal}>{dateStr}</span></div>
              </div>
            </div>

            <div className={s.piedPage}>
               &bull;
              <span className={s.pageNum}>Page 1</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 2 — BILAN + ÉQUIPEMENTS + CÂBLES ══════════════════ */}
          <div className={s.a4Page}>
            <div className={s.secTitle}>Bilan énergétique</div>
            <div className={s.secSubtitle}>Inventaire des charges</div>

            <table className={s.table}>
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>N°</th>
                  <th>Désignation</th>
                  <th style={{ width: '14%' }}>Puissance (W)</th>
                  <th style={{ width: '7%' }}>Qté</th>
                  <th style={{ width: '11%' }}>Heures/j</th>
                  <th style={{ width: '16%' }}>Énergie/j (Wh)</th>
                </tr>
              </thead>
              <tbody>
                {energiesTable.length > 0 ? energiesTable.map((r) => (
                  <tr key={r.num}>
                    <td className={s.tdCenter}>{r.num}</td>
                    <td className={s.tdLeft}>{r.nom || <NA />}</td>
                    <td className={s.tdCenter}>{fmt(r.puissance)}</td>
                    <td className={s.tdCenter}>{r.quantite}</td>
                    <td className={s.tdCenter}>{fmtF(r.heures, 1)}</td>
                    <td className={s.tdCenter}>{fmt(r.energie)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className={s.tdCenter}><NA /></td></tr>
                )}
                <tr className={s.trTotal}>
                  <td colSpan={5} className={s.tdRight}>TOTAL Ej</td>
                  <td className={s.tdRight}>{fmt(totalBrutWh)} Wh/j</td>
                </tr>
              </tbody>
            </table>

            <div className={s.secTitle} style={{ marginTop: '1.5rem' }}>Résultats du dimensionnement</div>

            <table className={s.table}>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th>Modèle</th>
                  <th>Configuration</th>
                  <th style={{ width: '6%' }}>Qté</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={s.tdLeft}>Panneau solaire</td>
                  <td>{[equip.panneau?.marque, equip.panneau?.modele, equip.panneau?.puissance ? `${equip.panneau.puissance} Wc` : null].filter(Boolean).join(' ') || '—'}</td>
                  <td>{etape2.panneaux?.ns != null ? `${etape2.panneaux.ns}S / ${etape2.panneaux.n_parallele}P` : '—'}</td>
                  <td className={s.tdCenter}>{etape2.panneaux?.np_final ?? '—'}</td>
                </tr>
                <tr>
                  <td className={s.tdLeft}>{params.typeReg === 'AIO' ? 'Onduleur All-in-One' : 'Onduleur'}</td>
                  <td>{[equip.onduleur?.marque, equip.onduleur?.modele].filter(Boolean).join(' ') || '—'}</td>
                  <td>{isTriphasé ? `Triphasé (×${etape1.nb_onduleurs})` : 'Monophasé'}</td>
                  <td className={s.tdCenter}>{etape1.nb_onduleurs || 1}</td>
                </tr>
                {params.typeReg !== 'AIO' && (
                  <tr>
                    <td className={s.tdLeft}>{`Régulateur ${params.typeReg || ''}`.trim()}</td>
                    <td>{[equip.regulateur?.marque, equip.regulateur?.modele].filter(Boolean).join(' ') || '—'}</td>
                    <td>{etape2.courant_regulateur != null ? `${etape2.courant_regulateur} A` : '—'}</td>
                    <td className={s.tdCenter}>1</td>
                  </tr>
                )}
                <tr>
                  <td className={s.tdLeft}>{`Batterie ${equip.batterie?.technologie || ''}`.trim()}</td>
                  <td>{[equip.batterie?.marque, equip.batterie?.modele, equip.batterie?.capacite ? `${equip.batterie.capacite}Ah` : null, equip.batterie?.tension ? `${equip.batterie.tension}V` : null].filter(Boolean).join(' ') || '—'}</td>
                  <td>{etape2.batteries?.nb_serie != null ? `${etape2.batteries.nb_serie}S / ${etape2.batteries.nb_parallele}P` : '—'}</td>
                  <td className={s.tdCenter}>{etape2.batteries?.nb_batteries ?? '—'}</td>
                </tr>
              </tbody>
            </table>

            <div className={s.secTitle} style={{ marginTop: '1.5rem' }}>Câbles et protections</div>

            <div className={s.secSubA}>Tableau des câbles</div>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Tronçon</th>
                  <th style={{ width: '13%' }}>Section (mm²)</th>
                  <th style={{ width: '13%' }}>Longueur (m)</th>
                  <th style={{ width: '13%' }}>Courant (A)</th>
                  <th style={{ width: '18%' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {etape3.troncons?.length > 0
                  ? etape3.troncons.map((t, i) => (
                      <tr key={i}>
                        <td>{t.troncon}</td>
                        <td className={s.tdCenter}>{t.section}</td>
                        <td className={s.tdCenter}>{t.longueur}</td>
                        <td className={s.tdCenter}>{t.courant != null ? fmtF(t.courant, 1) : '—'}</td>
                        <td>{t.type_cable || '—'}</td>
                      </tr>
                    ))
                  : <tr><td colSpan={5} className={s.tdCenter}><NA /></td></tr>
                }
              </tbody>
            </table>

            <div className={s.secSubA} style={{ marginTop: '1rem' }}>Protections électriques</div>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th style={{ width: '13%' }}>Calibre</th>
                  <th style={{ width: '13%' }}>Tension (V)</th>
                  <th>Modèle</th>
                  <th style={{ width: '8%' }}>Qté</th>
                </tr>
              </thead>
              <tbody>
                {protections.length > 0
                  ? protections.map((p, i) => (
                      <tr key={i}>
                        <td className={s.tdLeft}>{p.designation}</td>
                        <td className={s.tdCenter}>{p.calibre}</td>
                        <td className={s.tdCenter}>{p.tension}</td>
                        <td>{p.modele}</td>
                        <td className={s.tdCenter}>{p.qty}</td>
                      </tr>
                    ))
                  : <tr><td colSpan={5} className={s.tdCenter}><NA /></td></tr>
                }
              </tbody>
            </table>

            <div className={s.piedPage}>
               &bull;
              <span className={s.pageNum}>Page 2</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 3 — ENTRETIEN ══════════════════ */}
          <div className={s.a4Page}>
            <div className={s.secTitle}>Plan d'entretien préventif</div>

            <table className={s.tableMaint}>
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Opération</th>
                  <th style={{ width: '12%' }}>Intervalle</th>
                  <th style={{ width: '18%' }}>Responsable</th>
                  <th>Travaux à effectuer</th>
                  <th style={{ width: '16%' }}>Outils</th>
                </tr>
              </thead>
              <tbody>
                {maintRows.map((item, i) =>
                  item.type === 'header' ? (
                    <tr key={`h${i}`} className={s.maintSecHeader}>
                      <td colSpan={5}>{item.section}</td>
                    </tr>
                  ) : (
                    <tr key={`r${i}`}>
                      <td className={s.tdLeft}>{item.operation}</td>
                      <td className={s.tdCenter}>{item.intervalle}</td>
                      <td className={s.tdLeft}>{item.responsable}</td>
                      <td className={s.tdLeft}>{item.travaux}</td>
                      <td>{item.outils}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className={s.piedPage}>
               &bull;
              <span className={s.pageNum}>Page 3</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 4 — SIGNATURES ══════════════════ */}
          <div className={`${s.a4Page} ${s.lastPage}`}>
            <div className={s.secTitle}>Validation et signatures</div>

            <div className={s.sigGrid}>
              <div className={s.sigBlock}>
                <div className={s.sigRole}>Le Technicien</div>
                <p className={s.sigText}>
                  Je soussigné(e),{' '}
                  <strong>{techName || '____________________________'}</strong>
                  , certifie avoir réalisé cette étude
                  conformément aux règles de l'art.
                </p>
                <div className={s.sigLine}><span>Signature</span></div>
                <div className={s.sigLine}><span>Date : {dateStr}</span></div>
                <div className={s.cachet}><div className={s.cachetInner}>Cachet</div></div>
              </div>

              <div className={s.sigBlock}>
                <div className={s.sigRole}>Le Client</div>
                <p className={s.sigText}>
                  Je soussigné(e),{' '}
                  <strong>{clientName || '____________________________'}</strong>
                  , déclare avoir pris connaissance
                  de ce rapport technique.
                </p>
                <div className={s.sigLine}><span>Signature</span></div>
                <div className={s.sigLine}><span>Date : {dateStr}</span></div>
              </div>
            </div>

            <div className={s.piedPage}>
               &bull;
              <span className={s.pageNum}>Page 4</span>
            </div>
          </div>

        </div>

        {/* ═══ Boutons ═══ */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 10, fontWeight: 700, zIndex: 100, fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            Projet enregistré ✅
          </div>
        )}
        {saveErr && (
          <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#EF4444', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: 10, fontWeight: 700, zIndex: 100, fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
            {saveErr}
          </div>
        )}
        <div className={s.btnActions}>
          <button onClick={() => navigate('/dashboard-tech')} className={s.btnRetour}>
            <ArrowLeft size={18} /> Retour au Dashboard
          </button>
          <button onClick={handleEnregistrer} disabled={saving} className={s.btnSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={() => {
            alert(
              "Conseil : Dans les options d'impression"
              + "\n→ Décochez 'En-têtes et pieds de page'"
              + "\npour un rendu optimal."
            )
            window.print()
          }} className={s.btnPrint}>
            <Printer size={18} /> Imprimer / PDF
          </button>
        </div>
        <NoteTool role="technicien" />
      </div>
    </div>
  )
}
