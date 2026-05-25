import math
from .tables import get_equipements
from .utils import (
    RHO,
    section_h1z2z2k,
    section_souple_dc,
    section_ac_mono,
    calibre_disj_dc,
    calibre_gpv,
    calibre_diff_2p,
    arrondi_sup,
    arrondi_math,
    get_fusible_nh,
    calculer_section_dc,
    calculer_section_ac_mono,
)

# ════════════════════════════
# PANNEAUX PAR USYS
# ════════════════════════════
PANNEAUX_PAR_USYS = {
    12: {
        "puissance": 200,
        "voc": 22.0,
        "vmp": 18.0,
        "isc": 11.5,
        "tension_nominale": 12,
    },
    24: {
        "puissance": 415,
        "voc": 37.5,
        "vmp": 31.5,
        "isc": 13.98,
        "tension_nominale": 24,
    },
    48: {
        "puissance": 415,
        "voc": 37.5,
        "vmp": 31.5,
        "isc": 13.98,
        "tension_nominale": 24,
    },
}

# ════════════════════════════
# COEFFICIENTS
# ════════════════════════════
def get_cs(appareils: list) -> float:
    n = sum(a["quantite"] for a in appareils)
    if n <= 3:  return 0.95
    if n <= 6:  return 0.88
    if n <= 12: return 0.80
    return 0.75


def get_pr(latitude: float) -> float:
    if latitude < 8.0:  return 0.75   # Sud
    if latitude < 10.0: return 0.73   # Centre
    return 0.70                        # Nord


def get_usys(pc: float, pond: float) -> int:
    usys_pc   = 12 if pc   <= 750  else (24 if pc   <= 2000 else 48)
    usys_pond = 12 if pond <= 1500 else (24 if pond <= 3000 else 48)
    return max(usys_pc, usys_pond)


# ════════════════════════════
# MODE SOLAIRE PRINCIPALE
# ════════════════════════════
def calculer_solaire_principale(
    appareils: list,
    irradiation: float,
    latitude: float,
) -> dict:
    cs      = get_cs(appareils)
    pr      = get_pr(latitude)
    eta     = 0.80
    dod     = 0.90
    eta_bat = 0.95
    n_jours = 1.2

    ej = sum(
        a["puissance"] * a["quantite"] * (a["h_jour"] + a["h_nuit"])
        for a in appareils
    ) * cs / eta

    pond = sum(
        a["puissance"] * a["quantite"]
        for a in appareils
    ) * 1.25

    pc   = ej * (1 / irradiation) * pr
    usys = get_usys(pc, pond)

    c_calculee = (ej * n_jours) / (dod * usys * eta_bat)

    return {
        "mode":        "solaire_principale",
        "cs":          cs,
        "pr":          pr,
        "ej":          round(ej, 2),
        "pond":        round(pond, 2),
        "pc":          round(pc, 2),
        "usys":        usys,
        "c_calculee":  round(c_calculee, 2),
        "n_jours":     n_jours,
        "dod":         dod,
        "eta_bat":     eta_bat,
        "irradiation": irradiation,
        "latitude":    latitude,
    }


# ════════════════════════════
# MODE SBEE PRINCIPALE
# ════════════════════════════
def calculer_sbee_principale(
    appareils: list,
    appareils_prioritaires: list,
    t_matin: float,
    t_midi: float,
    t_soir: float,
    irradiation: float,
    latitude: float,
) -> dict:
    pr      = get_pr(latitude)
    eta     = 0.80
    k       = 1.20
    dod     = 0.90
    eta_bat = 0.95
    n_jours = 1.0

    t_total = t_matin + t_midi + t_soir

    pond = sum(
        a["puissance"] * a["quantite"]
        for a in appareils
    ) * 1.25

    ej = sum(
        a["puissance"] * a["quantite"]
        for a in appareils_prioritaires
    ) * t_total * k / eta

    pc   = ej * (1 / irradiation) * pr
    usys = get_usys(pc, pond)

    c_calculee = (ej * n_jours) / (dod * usys * eta_bat)

    return {
        "mode":        "sbee_principale",
        "pr":          pr,
        "t_total":     t_total,
        "ej":          round(ej, 2),
        "pond":        round(pond, 2),
        "pc":          round(pc, 2),
        "usys":        usys,
        "c_calculee":  round(c_calculee, 2),
        "n_jours":     n_jours,
        "dod":         dod,
        "eta_bat":     eta_bat,
        "irradiation": irradiation,
        "latitude":    latitude,
    }


# ════════════════════════════
# ONDULEUR AUTO
# ════════════════════════════
def choisir_onduleur(pond: float, usys: int) -> dict:
    equip     = get_equipements()
    onduleurs = sorted(
        [o for o in equip.get("onduleurs_aio", [])
         if o.get("usys") == usys],
        key=lambda o: o["puissance"],
    )
    for o in onduleurs:
        if o["puissance"] >= pond:
            return o
    return onduleurs[-1] if onduleurs else None


# ════════════════════════════
# PANNEAUX AUTO
# ════════════════════════════
def calculer_panneaux(pc: float, usys: int, onduleur: dict) -> dict:
    panneau  = PANNEAUX_PAR_USYS[usys]
    mppt_max = onduleur.get("mppt_max", 500)

    if usys in [12, 24]:
        ns    = 1
        n_par = arrondi_sup(pc / panneau["puissance"])
        if n_par < 1:
            n_par = 1
    else:
        vmp_cible = mppt_max * 0.70
        ns = arrondi_sup(vmp_cible / panneau["vmp"])
        while ns * panneau["voc"] >= mppt_max and ns > 1:
            ns -= 1
        n_par = arrondi_sup(pc / (ns * panneau["puissance"]))
        if n_par < 1:
            n_par = 1

    np_final = ns * n_par
    return {
        "panneau":    panneau,
        "ns":         ns,
        "n_parallele": n_par,
        "np_final":   np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel":    round(np_final * panneau["puissance"], 2),
    }


# ════════════════════════════
# BATTERIES AUTO
# ════════════════════════════
def choisir_batteries(
    c_calculee: float,
    usys: int,
    dod: float,
    eta_bat: float,
) -> dict:
    equip     = get_equipements()
    batteries = sorted(
        [b for b in equip.get("batteries", [])
         if b.get("tension") == usys and b.get("capacite")],
        key=lambda b: b["capacite"],
    )

    if not batteries:
        c_unitaire = 200
        nbp = arrondi_sup(c_calculee / c_unitaire)
        if nbp < 1: nbp = 1
        return {
            "c_calculee":    round(c_calculee, 2),
            "c_unitaire":    c_unitaire,
            "nb_batteries":  nbp,
            "nb_serie":      1,
            "nb_parallele":  nbp,
            "energie_totale": round(nbp * c_unitaire * usys / 1000, 2),
        }

    bat = next(
        (b for b in batteries if b["capacite"] >= c_calculee),
        batteries[-1],
    )
    c_unitaire = bat["capacite"]
    nbp = arrondi_sup(c_calculee / c_unitaire)
    if nbp < 1: nbp = 1

    return {
        "c_calculee":    round(c_calculee, 2),
        "c_unitaire":    c_unitaire,
        "nb_batteries":  nbp,
        "nb_serie":      1,
        "nb_parallele":  nbp,
        "energie_totale": round(nbp * c_unitaire * usys / 1000, 2),
    }


# ════════════════════════════
# CÂBLES ET PROTECTIONS
# ════════════════════════════
def calculer_cables_protections(
    bilan: dict,
    panneaux: dict,
    onduleur: dict,
) -> dict:
    usys       = bilan["usys"]
    pond       = bilan["pond"]
    n_par      = panneaux["n_parallele"]
    vmp_string = panneaux["vmp_string"]
    isc        = panneaux["panneau"]["isc"]

    L_pan_ond = 10.0
    L_bat_ond = 2.0
    L_ond_tab = 10.0

    troncons       = []
    porte_fusibles = []
    parafoudres    = [
        {
            "designation": "Type 2 DC 1000V",
            "quantite":    n_par,
            "position":    "Côté panneaux",
        },
        {
            "designation": "Type 2 AC 2P 230V",
            "quantite":    1,
            "position":    "Côté tableau",
        },
    ]

    # T1 — Panneau → Onduleur
    # Fusible gPV toujours présent (protection string obligatoire)
    I1      = 1.25 * isc * n_par
    S1_calc = calculer_section_dc(L_pan_ond, I1, 0.03, vmp_string)
    S1      = section_h1z2z2k(S1_calc)
    Ip_gpv  = 1.25 * isc
    cal_gpv = calibre_gpv(Ip_gpv)

    troncons.append({
        "troncon":          "Panneau → Onduleur",
        "type_cable":       "H1Z2Z2K",
        "longueur":         L_pan_ond,
        "courant":          round(I1, 2),
        "section":          S1,
        "protection":       f"Fusible gPV {cal_gpv}A",
        "calibre":          cal_gpv,
        "fusible_gpv":      True,
        "qt_fusible_gpv":   n_par,
        "parafoudre_dc":    "Type 2 DC 1000V",
        "qt_parafoudre_dc": n_par,
    })
    porte_fusibles.append({
        "designation": "Porte-fusible gPV 10×38mm 1000V DC",
        "quantite":    n_par,
    })

    # T2 — Onduleur → Batterie
    I2      = (pond / usys) * 1.10
    S2_calc = calculer_section_dc(L_bat_ond, I2, 0.03, usys)
    S2      = section_souple_dc(S2_calc)   # garantit min 10mm²
    Ip2     = I2 * 1.25                    # majoration ici
    if I2 <= 63:
        protection2 = "Disjoncteur DC 2P"
        calibre2    = calibre_disj_dc(Ip2)
        fusible_nh2 = None
    else:
        nh          = get_fusible_nh(Ip2)  # Ip2 déjà majoré
        protection2 = f"Fusible {nh['type']}"
        calibre2    = nh["calibre"]
        fusible_nh2 = nh

    troncons.append({
        "troncon":    "Onduleur → Batterie",
        "type_cable": "Souple rouge/noir",
        "longueur":   L_bat_ond,
        "courant":    round(I2, 2),
        "section":    S2,
        "protection": protection2,
        "calibre":    calibre2,
        "fusible_nh": fusible_nh2,
    })
    if fusible_nh2:
        porte_fusibles.append({
            "designation": fusible_nh2["porte_fusible"],
            "quantite":    1,
        })

    # T3 — Onduleur → Tableau AC (monophasé, pas de cos φ)
    I3      = pond / 230
    S3_calc = calculer_section_ac_mono(L_ond_tab, I3, 0.05, 230)
    S3      = section_ac_mono(S3_calc)
    Ip3     = I3 * 1.25
    calibre3    = calibre_diff_2p(Ip3)
    protection3 = "Disjoncteur différentiel 2P 30mA"

    troncons.append({
        "troncon":    "Onduleur → Tableau AC",
        "type_cable": f"H07RN-F 3×{S3}mm²",
        "longueur":   L_ond_tab,
        "courant":    round(I3, 2),
        "section":    S3,
        "protection": protection3,
        "calibre":    calibre3,
    })

    return {
        "troncons":       troncons,
        "porte_fusibles": porte_fusibles,
        "parafoudres":    parafoudres,
        "differentiel": {
            "type":     protection3,
            "calibre":  calibre3,
            "quantite": 1,
        },
    }


# ════════════════════════════
# FONCTION PRINCIPALE
# ════════════════════════════
def calculer_sans_budget(
    mode: str,
    appareils: list,
    irradiation: float,
    latitude: float,
    appareils_prioritaires: list = None,
    t_matin: float = 0,
    t_midi: float = 0,
    t_soir: float = 0,
) -> dict:
    # Étape 1 — Bilan
    if mode == "solaire":
        bilan = calculer_solaire_principale(appareils, irradiation, latitude)
    else:
        bilan = calculer_sbee_principale(
            appareils,
            appareils_prioritaires or [],
            t_matin, t_midi, t_soir,
            irradiation, latitude,
        )

    usys = bilan["usys"]
    pc   = bilan["pc"]
    pond = bilan["pond"]

    # Étape 2 — Onduleur
    onduleur = choisir_onduleur(pond, usys)
    if not onduleur:
        raise ValueError(
            f"Aucun onduleur AIO trouvé pour Usys={usys}V et Pond={pond}W"
        )

    # Étape 3 — Panneaux
    panneaux = calculer_panneaux(pc, usys, onduleur)

    # Étape 4 — Batteries
    batteries = choisir_batteries(
        bilan["c_calculee"],
        usys,
        bilan["dod"],
        bilan["eta_bat"],
    )

    # Étape 5 — Câbles et protections
    cables = calculer_cables_protections(bilan, panneaux, onduleur)

    return {
        "mode":      mode,
        "bilan":     bilan,
        "onduleur":  onduleur,
        "panneaux":  panneaux,
        "batteries": batteries,
        "cables":    cables,
    }
