import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Printer, Save, Trash2, Plus } from 'lucide-react'
import Navbar from '../../components/Navbar'
import AvatarTech from '../../components/AvatarTech'
import vitreImg from '../../assets/images/vitre.webp'
import { supabase } from '../../utils/supabaseClient'
import { getTechnicien, saveTechnicien, getUserTechnicien } from '../../utils/storage'
import s from './Devis.module.css'

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

const fmt = (n) =>
  Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function genNum() {
  return `HB-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
}

function buildLignes(etude) {
  if (!etude) {
    return Array(5).fill(null).map((_, i) => ({ id: `e${i}`, designation: '', qty: 1, pu: 0 }))
  }
  const { etape1, etape2, etape3, equipements } = etude
  const rows = []
  let c = 0
  const nid = () => `init_${c++}`

  // Panneaux
  if (equipements?.panneau && etape2?.panneaux?.np_final) {
    const p = equipements.panneau
    rows.push({
      id: nid(),
      designation: ['Panneau', p.marque, p.modele, p.puissance ? `${p.puissance}Wc` : '']
        .filter(Boolean).join(' '),
      qty: etape2.panneaux.np_final,
      pu: 0,
    })
  }

  // Onduleur
  if (equipements?.onduleur) {
    const o = equipements.onduleur
    rows.push({
      id: nid(),
      designation: ['Onduleur', o.marque, o.modele, o.puissance ? `${(o.puissance / 1000).toFixed(1)}kW` : '']
        .filter(Boolean).join(' '),
      qty: etape1?.nb_onduleurs || 1,
      pu: 0,
    })
  }

  // Batteries
  if (equipements?.batterie && etape2?.batteries?.nb_batteries) {
    const b = equipements.batterie
    rows.push({
      id: nid(),
      designation: ['Batterie', b.technologie, b.marque,
        b.capacite ? `${b.capacite}Ah` : '', b.tension ? `${b.tension}V` : '']
        .filter(Boolean).join(' '),
      qty: etape2.batteries.nb_batteries,
      pu: 0,
    })
  }

  // Câbles (un par tronçon)
  if (etape3?.troncons?.length) {
    etape3.troncons.forEach(t => {
      rows.push({
        id: nid(),
        designation: t.type_cable.includes('mm²')
          ? `${t.troncon} : ${t.type_cable}`
          : `${t.troncon} : ${t.type_cable} ${t.section}mm²`,
        qty: t.longueur || 1,
        pu: 0,
      })
    })

    // Protections
    etape3.troncons.forEach(t => {
      if (t.protection) {
        rows.push({ id: nid(), designation: t.protection, qty: t.quantite ?? 1, pu: 0 })
      }
    })
  }

  // Porte-fusibles
  if (etape3?.porte_fusibles?.length) {
    etape3.porte_fusibles.forEach(pf => {
      rows.push({ id: nid(), designation: pf.designation, qty: pf.quantite, pu: 0 })
    })
  }

  // Parafoudres
  if (etape3?.parafoudres?.length) {
    etape3.parafoudres.forEach(pf => {
      rows.push({ id: nid(), designation: `Parafoudre ${pf.designation}`, qty: pf.quantite, pu: 0 })
    })
  }

  // Différentiel
  if (etape3?.differentiel) {
    const d = etape3.differentiel
    rows.push({ id: nid(), designation: `${d.type} ${d.calibre}A`, qty: d.quantite, pu: 0 })
  }

  return rows.length > 0
    ? rows
    : Array(5).fill(null).map((_, i) => ({ id: `e${i}`, designation: '', qty: 1, pu: 0 }))
}

export default function Devis() {
  const navigate = useNavigate()

  const techStorage = getTechnicien()
  const user        = getUserTechnicien()
  const etude       = techStorage.etude
  const sv          = techStorage.devis   // valeurs sauvegardées

  const fileLogoRef   = useRef(null)
  const fileEnteteRef = useRef(null)

  const [typeEntete,    setTypeEntete]    = useState(sv?.type_entete   || 'logo')
  const [logoDataUrl,   setLogoDataUrl]   = useState(sv?.logoDataUrl   || null)
  const [enteteDataUrl, setEnteteDataUrl] = useState(sv?.enteteDataUrl || null)
  const [numDevis,      setNumDevis]      = useState(sv?.numero        || genNum())

  const today   = new Date()
  const dateStr = `${String(today.getDate()).padStart(2,'0')} / ${String(today.getMonth()+1).padStart(2,'0')} / ${today.getFullYear()}`

  const [client,       setClient]       = useState(sv?.client || { civilite: 'Mr', nom: '', telephone: '', email: '', localisation: '' })
  const [tech,         setTech]         = useState(sv?.tech   || { civilite: 'Mr', nom: '', entreprise: '', specialite: '', ifu: '', rccm: '', whatsapp: '', email: '', localisation: '' })
  const [clientErrors, setClientErrors] = useState({})
  const [lignes,       setLignes]       = useState(() => sv?.lignes || buildLignes(etude))
  const [tva,          setTva]          = useState(sv?.tva    || false)
  const [lignesExtras, setLignesExtras] = useState(
    sv?.lignesExtras ??
    (sv?.ligneExtra?.label || sv?.ligneExtra?.montant
      ? [{ id: 'extra_0', label: sv.ligneExtra.label || '', montant: sv.ligneExtra.montant || 0 }]
      : [])
  )
  const [notes,        setNotes]        = useState(sv?.notes  || '')
  const [toast,        setToast]        = useState(null)

  const sousTotal    = lignes.reduce((a, l) => a + (l.qty || 0) * (l.pu || 0), 0)
  const montantTva   = tva ? sousTotal * 0.18 : 0
  const totalExtras  = lignesExtras.reduce((a, e) => a + (e.montant || 0), 0)
  const totalGeneral = sousTotal + totalExtras + montantTva

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200) }

  const uploadToSupabase = (file, type) => {
    if (!supabase || !user.id) return
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${type}.${ext}`
    supabase.storage.from('logos-techniciens').upload(path, file, { upsert: true }).catch(() => {})
  }

  const handleFileLogo = (file) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { showToast('❌ Fichier trop lourd (max 2 MB)'); return }
    const r = new FileReader()
    r.onload = e => setLogoDataUrl(e.target.result)
    r.readAsDataURL(file)
    uploadToSupabase(file, 'logo')
  }

  const handleFileEntete = (file) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('❌ Fichier trop lourd (max 5 MB)'); return }
    const r = new FileReader()
    r.onload = e => setEnteteDataUrl(e.target.result)
    r.readAsDataURL(file)
    uploadToSupabase(file, 'entete')
  }

  const updateLigne = (id, field, val) =>
    setLignes(p => p.map(l => l.id === id ? { ...l, [field]: val } : l))
  const deleteLigne = (id) => setLignes(p => p.filter(l => l.id !== id))
  const addLigne    = ()   =>
    setLignes(p => [...p, { id: `cust_${Date.now()}`, designation: '', qty: 1, pu: 0 }])

  const persist = () => {
    const data = {
      numero: numDevis, client, tech, lignes, lignesExtras, tva, notes,
      type_entete: typeEntete, logoDataUrl, enteteDataUrl,
      sous_total: sousTotal, montant_tva: montantTva, total: totalGeneral,
    }
    saveTechnicien({ devis: data })
    return data
  }

  const handleSave = () => {
    const data = persist()
    showToast('✅ Devis enregistré')
    if (supabase && user.id) {
      supabase.from('devis').insert([{
        user_id:    user.id,
        numero:     data.numero,
        date:       today.toISOString().split('T')[0],
        client:     data.client,
        lignes:     data.lignes,
        sous_total: data.sous_total,
        tva:        data.tva,
        total:      data.total,
        notes:      data.notes,
        type_entete: data.type_entete,
      }]).catch(() => {})
    }
  }

  const handlePrint = () => {
    const errs = {}
    if (!tech.nom?.trim())
      errs.techNom = 'Requis'
    if (!tech.whatsapp?.trim() && !tech.email?.trim())
      errs.techContact = 'WhatsApp ou Email requis'
    if (!client.nom?.trim())
      errs.clientNom = 'Requis'
    if (!client.telephone?.trim())
      errs.clientTel = 'Requis'
    if (Object.keys(errs).length > 0) {
      setClientErrors(errs)
      showToast('❌ Remplissez les champs obligatoires')
      return
    }
    persist()
    showToast('💡 Conseil : Dans les options d\'impression, décochez "En-têtes et pieds de page" pour un rendu optimal')
    setTimeout(() => window.print(), 3400)
  }

  const handleSuivant = () => { persist(); navigate('/rapport-tech') }

  return (
    <div className={s.fondPage} style={{ backgroundImage: `url(${vitreImg})` }}>
      <div className={s.overlay} />

      <div className={s.header}>
        <Navbar stepper={<Stepper active={3} />} avatar={<AvatarTech />} />
      </div>

      {toast && <div className={s.toast}>{toast}</div>}

      <div className={s.inner}>
        <div className={s.carteDevis}>

          {/* ════ Section 1 — En-tête ════ */}

          {/* Contrôles d'import — écran uniquement (masqués à l'impression via toggleBtns) */}
          <div className={`${s.enteteControls} ${s.toggleBtns}`}>
            <div className={s.toggleEntete}>
              <button
                type="button"
                className={`${s.toggleBtn} ${typeEntete === 'logo' ? s.toggleBtnActive : ''}`}
                onClick={() => setTypeEntete('logo')}
              >
                Logo
              </button>
              <button
                type="button"
                className={`${s.toggleBtn} ${typeEntete === 'entete_complete' ? s.toggleBtnActive : ''}`}
                onClick={() => setTypeEntete('entete_complete')}
              >
                En-tête
              </button>
            </div>
            <button
              type="button"
              className={s.importBtn}
              onClick={() => (typeEntete === 'logo' ? fileLogoRef : fileEnteteRef).current?.click()}
            >
              {typeEntete === 'logo'
                ? (logoDataUrl ? 'Changer le logo' : '+ Importer un logo')
                : (enteteDataUrl ? "Changer l'en-tête" : "+ Importer un en-tête")}
            </button>
            <input type="file" accept="image/*" ref={fileLogoRef} style={{ display: 'none' }}
              onChange={e => handleFileLogo(e.target.files[0])} />
            <input type="file" accept="image/*" ref={fileEnteteRef} style={{ display: 'none' }}
              onChange={e => handleFileEntete(e.target.files[0])} />
          </div>

          {/* Bande bleue — seulement si image chargée */}
          {typeEntete === 'logo' && logoDataUrl && (
            <div className={s.enteteDevis}>
              <div className={s.logoZoneWrap}>
                <img src={logoDataUrl} className={s.logoImg} alt="logo" />
              </div>
            </div>
          )}
          {typeEntete === 'entete_complete' && enteteDataUrl && (
            <div className={s.enteteDevis} style={{ padding: 0 }}>
              <img src={enteteDataUrl} className={s.enteteImg} alt="en-tête" />
            </div>
          )}

          <div className={s.enteteBottom}>
            <div className={s.devisTitle}>
              Devis N°&nbsp;<input
                className={s.numInput}
                value={numDevis}
                onChange={e => setNumDevis(e.target.value)}
              />
            </div>
          </div>

          {/* ════ Section 2 — Technicien / Client ════ */}
          <div className={s.techClient}>
            <div className={s.partyCol}>
              <div className={s.partyLabel}>Technicien</div>
              <div className={!tech.nom?.trim() ? s.hidePrint : ''} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select className={s.civiliteSelect} value={tech.civilite}
                  onChange={e => setTech(t => ({ ...t, civilite: e.target.value }))}>
                  <option value="Mr">Mr</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
                <span className={s.civilitePrint}>{tech.civilite}</span>
                <input className={`${s.clientInput}${clientErrors.techNom ? ' ' + s.clientInputErr : ''}`}
                  placeholder="Nom Prénom *" value={tech.nom} required
                  onChange={e => { setTech(t => ({ ...t, nom: e.target.value })); setClientErrors(x => ({ ...x, techNom: undefined })) }} />
              </div>
              <input className={`${s.clientInput}${!tech.entreprise?.trim()  ? ' ' + s.hidePrint : ''}`} placeholder="Entreprise"
                value={tech.entreprise}  onChange={e => setTech(t => ({ ...t, entreprise: e.target.value }))} />
              <input className={`${s.clientInput}${!tech.specialite?.trim()  ? ' ' + s.hidePrint : ''}`} placeholder="Spécialité"
                value={tech.specialite}  onChange={e => setTech(t => ({ ...t, specialite: e.target.value }))} />
              <input className={`${s.clientInput}${!tech.ifu?.trim()         ? ' ' + s.hidePrint : ''}`} placeholder="IFU"
                value={tech.ifu}         onChange={e => setTech(t => ({ ...t, ifu: e.target.value }))} />
              <input className={`${s.clientInput}${!tech.rccm?.trim()        ? ' ' + s.hidePrint : ''}`} placeholder="RCCM"
                value={tech.rccm}        onChange={e => setTech(t => ({ ...t, rccm: e.target.value }))} />
              <input className={`${s.clientInput}${clientErrors.techContact ? ' ' + s.clientInputErr : ''}${!tech.whatsapp?.trim() ? ' ' + s.hidePrint : ''}`}
                placeholder="WhatsApp (+229) *" value={tech.whatsapp}
                onChange={e => { setTech(t => ({ ...t, whatsapp: e.target.value })); setClientErrors(x => ({ ...x, techContact: undefined })) }} />
              <input className={`${s.clientInput}${clientErrors.techContact ? ' ' + s.clientInputErr : ''}${!tech.email?.trim() ? ' ' + s.hidePrint : ''}`}
                placeholder="Email *" value={tech.email}
                onChange={e => { setTech(t => ({ ...t, email: e.target.value })); setClientErrors(x => ({ ...x, techContact: undefined })) }} />
              <input className={`${s.clientInput}${!tech.localisation?.trim() ? ' ' + s.hidePrint : ''}`} placeholder="Localisation"
                value={tech.localisation} onChange={e => setTech(t => ({ ...t, localisation: e.target.value }))} />
            </div>

            <div className={s.partyCol}>
              <div className={s.partyLabel}>Client</div>
              <div className={!client.nom?.trim() ? s.hidePrint : ''} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <select className={s.civiliteSelect} value={client.civilite}
                  onChange={e => setClient(c => ({ ...c, civilite: e.target.value }))}>
                  <option value="Mr">Mr</option>
                  <option value="Mme">Mme</option>
                  <option value="Mlle">Mlle</option>
                </select>
                <span className={s.civilitePrint}>{client.civilite}</span>
                <input className={`${s.clientInput}${clientErrors.clientNom ? ' ' + s.clientInputErr : ''}`}
                  placeholder="Nom Prénom *" value={client.nom} required
                  onChange={e => { setClient(c => ({ ...c, nom: e.target.value })); setClientErrors(x => ({ ...x, clientNom: undefined })) }} />
              </div>
              <input
                className={`${s.clientInput}${clientErrors.clientTel ? ' ' + s.clientInputErr : ''}${!client.telephone?.trim() ? ' ' + s.hidePrint : ''}`}
                placeholder="Téléphone *" type="tel" value={client.telephone}
                onChange={e => { setClient(c => ({ ...c, telephone: e.target.value })); setClientErrors(x => ({ ...x, clientTel: undefined })) }}
              />
              <input
                className={`${s.clientInput}${!client.email?.trim() ? ' ' + s.hidePrint : ''}`}
                placeholder="Email" type="email" value={client.email}
                onChange={e => setClient(c => ({ ...c, email: e.target.value }))}
              />
              <input
                className={`${s.clientInput}${!client.localisation?.trim() ? ' ' + s.hidePrint : ''}`}
                placeholder="Localisation" value={client.localisation}
                onChange={e => setClient(c => ({ ...c, localisation: e.target.value }))}
              />
            </div>
          </div>

          {/* ════ Section 3 — Tableau ════ */}
          <div className={s.sec3}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={`${s.th} ${s.thDes}`}>Désignation</th>
                  <th className={`${s.th} ${s.thQty}`}>Qté</th>
                  <th className={`${s.th} ${s.thPu}`}>Prix unit. FCFA</th>
                  <th className={`${s.th} ${s.thTot}`}>Total FCFA</th>
                  <th className={`${s.th} ${s.thAct}`}>✕</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={l.id} className={`${i % 2 === 0 ? s.trOdd : s.trEven}${!l.designation.trim() ? ' ' + s.ligneVide : ''}`}>
                    <td className={s.td}>
                      <input
                        className={s.tdDes}
                        value={l.designation}
                        placeholder="Désignation"
                        onChange={e => updateLigne(l.id, 'designation', e.target.value)}
                      />
                    </td>
                    <td className={s.td}>
                      <input
                        className={s.tdQty}
                        type="number" min={0}
                        value={l.qty}
                        onChange={e => updateLigne(l.id, 'qty', +e.target.value)}
                      />
                    </td>
                    <td className={s.td}>
                      <input
                        className={s.tdPu}
                        type="number" min={0}
                        value={l.pu}
                        placeholder="0"
                        onChange={e => updateLigne(l.id, 'pu', +e.target.value)}
                      />
                    </td>
                    <td className={`${s.td} ${s.tdTot}`}>
                      {fmt((l.qty || 0) * (l.pu || 0))}
                    </td>
                    <td className={s.tdActCell}>
                      <button
                        className={s.trashBtn}
                        onClick={() => deleteLigne(l.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={s.addBtn} onClick={addLigne}>
              <Plus size={13} /> Ajouter une ligne
            </button>
          </div>

          {/* ════ Section 4 — Totaux ════ */}
          <div className={s.totaux}>
            <table className={s.totTable}>
              <tbody>
                <tr>
                  <td className={s.totLabel}>Sous-total</td>
                  <td className={s.totVal}>{fmt(sousTotal)} FCFA</td>
                </tr>
                {lignesExtras.map((le, idx) => (
                  <tr key={le.id} className={!le.label?.trim() && !le.montant ? s.hidePrint : ''}>
                    <td className={s.totLabel}>
                      <input
                        className={s.extraLabelInput}
                        placeholder="Main d'œuvre, déplacement..."
                        value={le.label}
                        onChange={e => setLignesExtras(p => p.map((x, j) => j === idx ? { ...x, label: e.target.value } : x))}
                      />
                    </td>
                    <td className={s.totVal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <input
                        className={s.extraMontantInput}
                        type="number" min={0}
                        placeholder="0"
                        value={le.montant}
                        onChange={e => setLignesExtras(p => p.map((x, j) => j === idx ? { ...x, montant: +e.target.value } : x))}
                      />
                      <span>FCFA</span>
                      <button className={`${s.trashBtn} ${s.hidePrint}`} onClick={() => setLignesExtras(p => p.filter((_, j) => j !== idx))}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className={s.hidePrint}>
                  <td colSpan={2}>
                    <button
                      className={s.addExtraBtn}
                      onClick={() => setLignesExtras(p => [...p, { id: `extra_${Date.now()}`, label: '', montant: 0 }])}
                    >
                      <Plus size={11} /> Ajouter une ligne
                    </button>
                  </td>
                </tr>
                <tr className={!tva ? s.hidePrint : ''}>
                  <td className={s.totLabel}>
                    <button
                      type="button"
                      className={`${s.tvaToggle} ${tva ? s.tvaToggleOn : ''}`}
                      onClick={() => setTva(v => !v)}
                    >
                      TVA 18%
                    </button>
                  </td>
                  <td className={s.totVal}>
                    {tva ? `${fmt(montantTva)} FCFA` : ''}
                  </td>
                </tr>
                <tr className={s.totTotalRow}>
                  <td className={s.totLabel}>Total général</td>
                  <td className={`${s.totVal} ${s.totValOrange}`}>
                    {fmt(totalGeneral)} FCFA
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ════ Section 5 — Notes ════ */}
          <div className={`${s.sec5}${!notes.trim() ? ' ' + s.hidePrint : ''}`}>
            <textarea
              className={s.notes}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Acompte de 50% à la commande. Pose non incluse..."
            />
          </div>

          {/* ════ Section 6 — Signatures ════ */}
          <div className={s.signatures}>
            <div className={s.signatureCol}>
              <div className={s.signLabel}>Signature du technicien</div>
              <div className={s.signZone} />
              <div className={s.signSub}>Nom : {tech.nom ? `${tech.civilite} ${tech.nom}` : '_______________'}</div>
              <div className={s.signSub}>Date : {dateStr}</div>
            </div>
            <div className={s.signatureCol}>
              <div className={s.signLabel}>Signature du client</div>
              <div className={s.signZone} />
              <div className={s.signSub}>Nom : {client.nom ? `${client.civilite} ${client.nom}` : '_______________'}</div>
              <div className={s.signSub}>Date : {dateStr}</div>
            </div>
          </div>

          {/* ════ Section 7 — Pied de page ════ */}
          <div className={`${s.piedPage} ${s.btnActions}`}>
            <em className={s.brand}></em>
            <div className={s.footerBtns}>
              <button className={s.btnSave} onClick={handleSave}>
                <Save size={13} /> Enregistrer
              </button>
              <button className={s.btnPrint} onClick={handlePrint}>
                <Printer size={13} /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className={s.pageNum}>Page 1/1</div>
        </div>

        {/* Navigation */}
        <div className={`${s.bottomNav} ${s.navigation}`}>
          <button className={s.btnRetour}  onClick={() => navigate('/etude-tech')}>‹ Retour</button>
          <button className={s.btnSuivant} onClick={handleSuivant}>Suivant ›</button>
        </div>
      </div>
    </div>
  )
}
