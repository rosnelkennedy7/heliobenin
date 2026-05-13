import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Printer, ArrowLeft } from 'lucide-react'
import Navbar from '../../components/Navbar'
import AvatarTech from '../../components/AvatarTech'
import vitreImg from '../../assets/images/vitre.png'
import s from './Rapport.module.css'

const STEPS = ['Localisation', 'Appareils', 'Étude', 'Devis', 'Rapport']

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

const fmt = (n) =>
  n != null && n !== '' ? Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '—'
const fmtF = (n, d = 2) => n != null && n !== '' ? Number(n).toFixed(d) : '—'
const NA = () => <span className={s.na}>Non renseigné</span>

const MAINTENANCE_DATA = [
  {
    section: 'Panneaux solaires',
    rows: [
      { operation: 'Nettoyage surface', intervalle: 'Mensuel', responsable: 'Technicien', travaux: 'Laver eau propre, essuyer délicatement, éviter heures chaudes', outils: 'Chiffon, eau, seau' },
      { operation: 'Vérification fixations', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Contrôler boulons, vis, structure. Vérifier inclinaison', outils: 'Clé, tournevis' },
      { operation: 'Inspection visuelle cellules', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Rechercher fissures, délaminage, points chauds. Remplacer panneau endommagé', outils: 'Visuel' },
      { operation: 'Contrôle connecteurs MC4', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Vérifier étanchéité, corrosion, surchauffe', outils: 'Multimètre, outil MC4' },
    ],
  },
  {
    section: 'Batteries LFP',
    rows: [
      { operation: 'Vérification SOC', intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire SOC sur écran onduleur. Alerter si SOC < 10% répété', outils: 'Écran onduleur' },
      { operation: 'Contrôle température', intervalle: 'Mensuel', responsable: 'Technicien', travaux: 'Vérifier 0°C à 45°C. Améliorer ventilation si nécessaire', outils: 'Thermomètre' },
      { operation: 'Inspection bornes et câbles', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Nettoyer corrosion, resserrer bornes, vérifier isolation', outils: 'Clé, chiffon, multimètre' },
      { operation: 'Lecture cycles BMS', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Relever cycles, comparer durée de vie prévue 6000 cycles', outils: 'Application BMS, PC' },
    ],
  },
  {
    section: 'Batteries AGM',
    rows: [
      { operation: 'Vérification charge', intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire tension écran. Pleine ≈ 13,8V. Alerter si tension anormalement basse', outils: 'Écran onduleur' },
      { operation: 'Contrôle visuel boîtier', intervalle: 'Mensuel', responsable: 'Technicien', travaux: 'Vérifier absence gonflement, fissure, fuite. Déformation = remplacement', outils: 'Visuel' },
      { operation: 'Nettoyage bornes', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Déposer, nettoyer bornes, appliquer graisse anti-oxydation', outils: 'Clé, brosse, graisse' },
      { operation: 'Test capacité résiduelle', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Mesurer capacité réelle. Si < 80% nominal, planifier remplacement', outils: 'Testeur batterie, multimètre' },
    ],
  },
  {
    section: 'Batteries GEL',
    rows: [
      { operation: 'Vérification charge', intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: 'Lire tension. Pleine ≈ 13,8V. Ne jamais décharger sous 11,8V', outils: 'Écran onduleur' },
      { operation: 'Contrôle visuel boîtier', intervalle: 'Mensuel', responsable: 'Technicien', travaux: 'Vérifier absence gonflement, fuite gel. Gonflée = remplacement immédiat', outils: 'Visuel' },
      { operation: 'Inspection câbles et bornes', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Nettoyer, resserrer bornes. Pas de charge rapide (dégrade gel)', outils: 'Clé, chiffon, multimètre' },
      { operation: 'Test capacité résiduelle', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Mesurer capacité réelle. Si < 80% nominal, planifier remplacement', outils: 'Testeur batterie, multimètre' },
    ],
  },
  {
    section: 'Onduleur / Régulateur',
    rows: [
      { operation: 'Lecture alarmes', intervalle: 'Hebdomadaire', responsable: 'À expliquer au propriétaire', travaux: "Vérifier absence alarme écran. Noter code et contacter technicien", outils: 'Écran onduleur' },
      { operation: 'Nettoyage grilles ventilation', intervalle: 'Mensuel', responsable: 'Technicien', travaux: "Souffler poussière grilles. Ne pas obstruer ventilations. Vérifier ventilateur interne", outils: "Souffleur d'air" },
      { operation: 'Test basculement réseau/batterie', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Simuler coupure SBEE, vérifier commutation < 20ms', outils: 'Chronomètre, multimètre' },
      { operation: 'Mise à jour firmware + rapport', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Consulter site fabricant, sauvegarder config avant MAJ, rédiger rapport maintenance', outils: 'PC, connexion internet' },
    ],
  },
  {
    section: 'Câbles et protections',
    rows: [
      { operation: 'Inspection visuelle câbles', intervalle: 'Semestriel', responsable: 'Technicien', travaux: 'Rechercher brûlures, fissures, rongeurs. Remplacer câble endommagé', outils: 'Visuel, multimètre' },
      { operation: 'Test disjoncteurs et fusibles', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Déclencher manuellement. Vérifier réarmement. Remplacer fusibles grillés', outils: 'Tournevis, multimètre' },
      { operation: 'Contrôle parafoudre DC', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Vérifier voyant état. Rouge ou absent = remplacement immédiat', outils: 'Visuel, multimètre' },
      { operation: 'Mesure résistance de terre', intervalle: 'Annuel', responsable: 'Technicien', travaux: 'Mesurer résistance terre. Max admissible 5 Ω. Reprendre terre si dépassé', outils: 'Telluromètre' },
    ],
  },
]

const maintRows = MAINTENANCE_DATA.flatMap((sec) => [
  { type: 'header', section: sec.section },
  ...sec.rows.map((r) => ({ type: 'row', ...r })),
])

export default function Rapport() {
  const navigate = useNavigate()

  const techStore = JSON.parse(localStorage.getItem('heliobenin_technicien') || '{}')
  const user      = JSON.parse(localStorage.getItem('helio_user') || '{}')
  const loc       = techStore.localisation || {}
  const appareils = techStore.appareils || []
  const etude     = techStore.etude || {}
  const devis     = techStore.devis || {}
  const etape1    = etude.etape1 || {}
  const etape2    = etude.etape2 || {}
  const etape3    = etude.etape3 || {}
  const params    = etude.parametres || {}
  const equip     = etude.equipements || {}
  const client    = devis.client || {}

  const today   = new Date()
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  const techName = [user.prenom, user.nom].filter(Boolean).join(' ') || null

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
  const cs = params.cs || 1

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
  if (etape3.porte_fusibles?.length) {
    etape3.porte_fusibles.forEach((pf) =>
      protections.push({ designation: pf.designation, calibre: '—', tension: '—', modele: '—', qty: pf.quantite })
    )
  }
  if (etape3.parafoudres?.length) {
    etape3.parafoudres.forEach((pf) =>
      protections.push({ designation: `Parafoudre ${pf.designation}`, calibre: '—', tension: '—', modele: '—', qty: pf.quantite })
    )
  }
  if (etape3.differentiel) {
    const d = etape3.differentiel
    protections.push({ designation: `${d.type} ${d.calibre}A`, calibre: d.calibre, tension: '—', modele: '—', qty: d.quantite })
  }

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
                  : <div className={s.enteteText}>{techName || 'HélioBénin'}</div>
              }
            </div>

            <div className={s.titreZone}>
              <div className={s.titrePrincipal}>RAPPORT TECHNIQUE</div>
              <div className={s.titreSous}>DIMENSIONNEMENT SOLAIRE</div>
              <div className={s.titreTrait} />
              <div className={s.titreRef}>Réf. {devis.numero || '—'} &bull; {dateStr}</div>
            </div>

            <div className={s.infoGrid}>
              <div className={s.infoBlock}>
                <div className={s.infoBlockTitle}>Client</div>
                <div className={s.infoRow}><span className={s.infoLabel}>Nom</span><span className={s.infoVal}>{client.nom || <NA />}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Téléphone</span><span className={s.infoVal}>{client.telephone || <NA />}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Email</span><span className={s.infoVal}>{client.email || <NA />}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Adresse</span><span className={s.infoVal}>{client.localisation || <NA />}</span></div>
              </div>
              <div className={s.infoBlock}>
                <div className={s.infoBlockTitle}>Localisation &amp; Projet</div>
                <div className={s.infoRow}><span className={s.infoLabel}>Latitude</span><span className={s.infoVal}>{loc.latitude != null ? `${fmtF(loc.latitude, 4)}°` : '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Longitude</span><span className={s.infoVal}>{loc.longitude != null ? `${fmtF(loc.longitude, 4)}°` : '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Irradiation</span><span className={s.infoVal}>{loc.irradiation != null ? `${loc.irradiation} kWh/m²/j` : '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Mois min.</span><span className={s.infoVal}>{loc.moisMin || '—'}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Technicien</span><span className={s.infoVal}>{techName || <NA />}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Date rapport</span><span className={s.infoVal}>{dateStr}</span></div>
              </div>
            </div>

            <div className={s.piedPage}>
               &bull; 
              <span className={s.pageNum}>Page 1</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 2 — BILAN ÉNERGÉTIQUE ══════════════════ */}
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
                    <td>{r.nom || <NA />}</td>
                    <td className={s.tdRight}>{fmt(r.puissance)}</td>
                    <td className={s.tdCenter}>{r.quantite}</td>
                    <td className={s.tdCenter}>{fmtF(r.heures, 1)}</td>
                    <td className={s.tdRight}>{fmt(r.energie)}</td>
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

            <div className={s.bilanSummary}>
              <div className={s.bilanRow}>
                <span>Énergie journalière totale</span>
                <span className={s.bilanVal}>{fmtF(totalBrutWh / 1000, 2)} kWh/j</span>
              </div>
              <div className={s.bilanRow}>
                <span>Coefficient de simultanéité Cs</span>
                <span className={s.bilanVal}>{params.cs ?? '—'}</span>
              </div>
              <div className={s.bilanRow}>
                <span></span>
                <span className={s.bilanVal}>{fmtF((totalBrutWh / 1000) * cs, 2)} kWh/j</span>
              </div>
              {etape1.ej != null && (
                <div className={`${s.bilanRow} ${s.bilanRowHL}`}>
                  <span>Énergie de dimensionnement calculée (API)</span>
                  <span className={s.bilanVal}>{fmtF(etape1.ej / 1000, 2)} kWh/j</span>
                </div>
              )}
            </div>

            <div className={s.piedPage}>
             &bull;
              <span className={s.pageNum}>Page 2</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 3 — RÉSULTATS ══════════════════ */}
          <div className={s.a4Page}>
            <div className={s.secTitle}>Résultats du dimensionnement</div>

            <div className={s.secSubA}>Section A — Valeurs intermédiaires</div>
            <table className={s.table}>
              <thead><tr><th>Paramètre</th><th>Valeur</th></tr></thead>
              <tbody>
                <tr><td>Tension système Usys</td><td>{etape1.usys != null ? `${etape1.usys} V` : '—'}</td></tr>
                <tr><td>Puissance onduleur Pond</td><td>{etape1.pond != null ? `${fmt(etape1.pond)} W` : '—'}</td></tr>
                <tr><td>Irradiation site Ir</td><td>{loc.irradiation != null ? `${loc.irradiation} kWh/m²/j` : '—'}</td></tr>
                <tr><td>Performance Ratio PR</td><td>{params.pr != null ? params.pr : '—'}</td></tr>
                <tr><td>Puissance crête Pc</td><td>{etape1.pc != null ? `${fmt(etape1.pc)} Wc` : '—'}</td></tr>
                <tr><td>Autonomie N</td><td>{params.nJours != null ? `${params.nJours} jour(s)` : '—'}</td></tr>
                <tr><td>Profondeur de décharge DoD</td><td>{params.dod != null ? `${params.dod} %` : '—'}</td></tr>
              </tbody>
            </table>

            <div className={s.secSubA} style={{ marginTop: '1.25rem' }}>Section B — Équipements sélectionnés</div>
            <div className={s.equipGrid}>
              <div className={`${s.equipCard} ${s.equipBlue}`}>
                <div className={s.equipCardTitle}>☀ PANNEAUX</div>
                <div className={s.equipCardMain}>
                  {etape2.panneaux?.np_final != null && equip.panneau
                    ? `${etape2.panneaux.np_final} × ${equip.panneau.puissance ?? '—'} Wc`
                    : <NA />}
                </div>
                <div className={s.equipCardSub}>
                  Total : {etape2.panneaux?.pc_reel != null ? `${fmt(etape2.panneaux.pc_reel)} Wc` : '—'}
                  {etape2.panneaux?.np_final != null && <> &bull; {etape2.panneaux.ns}S/{etape2.panneaux.n_parallele}P</>}
                </div>
              </div>

              <div className={`${s.equipCard} ${s.equipGreen}`}>
                <div className={s.equipCardTitle}>BATTERIES</div>
                <div className={s.equipCardMain}>
                  {etape2.batteries?.nb_batteries != null && equip.batterie
                    ? `${etape2.batteries.nb_batteries} × ${equip.batterie.capacite ?? '—'}Ah / ${equip.batterie.tension ?? '—'}V`
                    : <NA />}
                </div>
                <div className={s.equipCardSub}>
                  {equip.batterie?.technologie && `${equip.batterie.technologie} — `}
                  Énergie : {etape2.batteries?.energie_totale != null ? `${etape2.batteries.energie_totale} kWh` : '—'}
                </div>
              </div>

              <div className={`${s.equipCard} ${s.equipOrange}`}>
                <div className={s.equipCardTitle}>ONDULEUR</div>
                <div className={s.equipCardMain}>
                  {equip.onduleur
                    ? ([equip.onduleur.marque, equip.onduleur.modele].filter(Boolean).join(' ') ||
                        `${((equip.onduleur.puissance || 0) / 1000).toFixed(1)} kW`)
                    : <NA />}
                </div>
                <div className={s.equipCardSub}>
                  Puissance : {equip.onduleur?.puissance != null ? `${fmt(equip.onduleur.puissance)} W` : '—'}
                  {etape1.nb_onduleurs > 1 && ` × ${etape1.nb_onduleurs} (${etape1.phase})`}
                </div>
              </div>

              <div className={`${s.equipCard} ${s.equipPurple}`}>
                <div className={s.equipCardTitle}>RÉGULATEUR</div>
                <div className={s.equipCardMain}>
                  {params.typeReg === 'AIO'
                    ? "Intégré à l'onduleur (AIO)"
                    : (params.typeReg || <NA />)}
                </div>
                <div className={s.equipCardSub}>
                  Courant : {etape2.courant_regulateur != null ? `${etape2.courant_regulateur} A` : '—'}
                </div>
              </div>
            </div>

            <div className={s.piedPage}>
             &bull;
              <span className={s.pageNum}>Page 3</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 4 — CÂBLES ET PROTECTIONS ══════════════════ */}
          <div className={s.a4Page}>
            <div className={s.secTitle}>Câbles et protections</div>

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

            <div className={s.secSubA} style={{ marginTop: '1.25rem' }}>Protections électriques</div>
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
                        <td>{p.designation}</td>
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
              <span className={s.pageNum}>Page 4</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 5 — ENTRETIEN ══════════════════ */}
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
                      <td>{item.operation}</td>
                      <td className={s.tdCenter}>{item.intervalle}</td>
                      <td>{item.responsable}</td>
                      <td>{item.travaux}</td>
                      <td>{item.outils}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            <div className={s.piedPage}>
               &bull;
              <span className={s.pageNum}>Page 5</span>
            </div>
          </div>

          {/* ══════════════════ PAGE 6 — SIGNATURES ══════════════════ */}
          <div className={`${s.a4Page} ${s.lastPage}`}>
            <div className={s.secTitle}>Validation et signatures</div>

            <div className={s.sigGrid}>
              <div className={s.sigBlock}>
                <div className={s.sigRole}>Le Technicien</div>
                <p className={s.sigText}>
                  Je soussigné(e), <strong>{techName || '____________________________'}</strong>,
                  certifie avoir réalisé cette étude conformément aux règles de l'art.
                </p>
                <div className={s.sigLine}><span>Signature</span></div>
                <div className={s.sigLine}><span>Date : ___________________</span></div>
                <div className={s.cachet}><div className={s.cachetInner}>Cachet</div></div>
              </div>

              <div className={s.sigBlock}>
                <div className={s.sigRole}>Le Client</div>
                <p className={s.sigText}>
                  Je soussigné(e), <strong>{client.nom || '____________________________'}</strong>,
                  déclare avoir pris connaissance de ce rapport technique.
                </p>
                <div className={s.sigLine}><span>Signature</span></div>
                <div className={s.sigLine}><span>Date : ___________________</span></div>
              </div>
            </div>

            <div className={s.piedPage}>
               &bull; 
              <span className={s.pageNum}>Page 6</span>
            </div>
          </div>

        </div>

        {/* ═══ Boutons ═══ */}
        <div className={s.btnActions}>
          <button onClick={() => navigate('/devis-tech')} className={s.btnRetour}>
            <ArrowLeft size={18} /> Retour au Devis
          </button>
          <button onClick={() => window.print()} className={s.btnPrint}>
            <Printer size={18} /> Imprimer le rapport
          </button>
        </div>
      </div>
    </div>
  )
}
