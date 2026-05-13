import math
from .tables import get_equipements
from .utils import (
    RHO,
    section_normalisee_dc,
    section_normalisee_ac,
    calibre_normalise_dc,
    calibre_normalise_ac,
    arrondi_math,
    arrondi_sup,
    get_fusible_nh,
    calculer_section,
)


# ════════════════════════════════
# ÉTAPE 1 — BILAN ÉNERGÉTIQUE
# ════════════════════════════════

def calculer_ej(appareils: list, cs: float, eta: float = 0.80) -> float:
    sigma = sum(
        a["puissance"] * a["quantite"] * (a["h_jour"] + a["h_nuit"])
        for a in appareils
    )
    return round(sigma * cs / eta, 2)


def calculer_pond(appareils: list) -> float:
    sigma = sum(a["puissance"] * a["quantite"] for a in appareils)
    return round(sigma * 1.25, 2)


def calculer_puissance_pointe(appareils: list) -> float:
    return round(sum(
        a["puissance"] * a["quantite"] * a.get("facteur_pointe", 1.0)
        for a in appareils
    ), 2)


# ════════════════════════════════
# ÉTAPE 2 — CHAMP SOLAIRE
# ════════════════════════════════

def get_pr(latitude: float) -> float:
    if latitude < 8.0:
        return 0.70
    elif latitude < 10.0:
        return 0.73
    else:
        return 0.70


def calculer_pc(ej: float, irradiation: float, pr: float) -> float:
    return round(ej * (1 / irradiation) * pr, 2)


def get_usys(pc: float, pond: float) -> int:
    if pc <= 800 and pond <= 1500:
        return 12
    if 800 < pc <= 1600 and 1500 < pond <= 3000:
        return 24
    if pc > 1600 and pond > 3000:
        return 48
    # Désaccord → priorité Pond
    if pond <= 1500:
        return 12
    if pond <= 3000:
        return 24
    return 48


# ════════════════════════════════
# ÉTAPE 3 — ONDULEUR
# ════════════════════════════════

def choisir_onduleur_aio(pond: float) -> dict:
    onduleurs = sorted(
        get_equipements().get("onduleurs_aio", []),
        key=lambda o: o["puissance"],
    )
    if pond <= 12000:
        for ond in onduleurs:
            if ond["puissance"] >= pond:
                return {
                    "nb_onduleurs": 1,
                    "phase": "monophasé",
                    "onduleur": ond,
                    "pond_unitaire": pond,
                }
    else:
        pond_unit = pond / 3
        for ond in onduleurs:
            if ond["puissance"] >= pond_unit:
                return {
                    "nb_onduleurs": 3,
                    "phase": "triphasé",
                    "onduleur": ond,
                    "pond_unitaire": pond_unit,
                }
    return None


# ════════════════════════════════
# ÉTAPE 4 — PANNEAUX SOLAIRES
# ════════════════════════════════

def calculer_panneaux_aio(pc: float, onduleur: dict, panneau: dict) -> dict:
    usys = onduleur["usys"]
    mppt_max = onduleur["mppt_max"]

    if usys in [12, 24]:
        ns = 1
        n_par = arrondi_math(pc / panneau["puissance"])
        if n_par < 1:
            n_par = 1
    else:
        vmp_cible = mppt_max * 0.70
        ns = arrondi_sup(vmp_cible / panneau["vmp"])
        voc_string = ns * panneau["voc"]
        while voc_string >= mppt_max and ns > 1:
            ns -= 1
            voc_string = ns * panneau["voc"]
        n_par = arrondi_math(pc / (ns * panneau["puissance"]))
        if n_par < 1:
            n_par = 1

    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
    }


def calculer_panneaux_mppt(pc: float, usys: int, vmax_mppt: float, panneau: dict) -> dict:
    if usys in [12, 24]:
        vmp_cible = usys * 2
        ns = arrondi_sup(vmp_cible / panneau["vmp"])
    else:
        vmp_cible = vmax_mppt * 0.70
        ns = arrondi_sup(vmp_cible / panneau["vmp"])

    voc_string = ns * panneau["voc"]
    while voc_string >= vmax_mppt and ns > 1:
        ns -= 1
        voc_string = ns * panneau["voc"]

    n_par = arrondi_math(pc / (ns * panneau["puissance"]))
    if n_par < 1:
        n_par = 1

    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
    }


def calculer_panneaux_pwm(pc: float, usys: int, panneau: dict) -> dict:
    vmp_min = usys * 1.20
    ns = arrondi_sup(vmp_min / panneau["vmp"])
    n_par = arrondi_math(pc / (ns * panneau["puissance"]))
    if n_par < 1:
        n_par = 1
    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
    }


# ════════════════════════════════
# VÉRIFICATIONS PLAGES
# ════════════════════════════════

def verifier_aio(
    onduleur: dict,
    vmp_string: float,
    voc_string: float,
    pc_reel: float,
    i_string: float,
) -> list:
    warnings = []
    mppt_min = onduleur["mppt_min"]
    mppt_max = onduleur["mppt_max"]
    pv_max   = onduleur["pv_max"]
    i_mppt   = onduleur.get("courant_mppt_max", 999)

    if voc_string >= mppt_max:
        warnings.append(
            f"Voc string ({voc_string}V) dépasse Vmax MPPT ({mppt_max}V) !"
        )
    if vmp_string < mppt_min:
        warnings.append(
            f"Vmp string ({vmp_string}V) sous Vmin MPPT ({mppt_min}V) !"
        )
    if pc_reel > pv_max:
        warnings.append(
            f"Puissance champ ({pc_reel}Wc) dépasse PV max onduleur ({pv_max}W) !"
        )
    if i_string > i_mppt:
        warnings.append(
            f"Courant string ({i_string}A) dépasse courant MPPT max ({i_mppt}A) !"
        )
    return warnings


def verifier_mppt(
    regulateur: dict,
    voc_string: float,
    vmp_string: float,
    ireg: float,
) -> list:
    warnings = []
    plage = str(regulateur.get("plage_pv", "0-999"))
    try:
        vmax_pv = float(plage.split('-')[-1].replace('V', ''))
    except Exception:
        vmax_pv = 999

    courant_max = regulateur.get("courant_max", 999)

    if voc_string >= vmax_pv:
        warnings.append(
            f"Voc string ({voc_string}V) dépasse Vmax PV régulateur ({vmax_pv}V) !"
        )
    if ireg > courant_max:
        warnings.append(
            f"Courant régulateur ({ireg}A) dépasse courant max ({courant_max}A) !"
        )
    return warnings


# ════════════════════════════════
# ÉTAPE 5 — BATTERIES
# ════════════════════════════════

def calculer_batteries(
    ej: float,
    n_jours: float,
    usys: int,
    dod: float,
    eta_bat: float,
    c_unitaire: float,
) -> dict:
    c_calculee = (ej * n_jours) / (dod * usys * eta_bat)

    nb_batteries = arrondi_math(c_calculee / c_unitaire)
    if nb_batteries < 1:
        nb_batteries = 1

    return {
        "c_calculee": round(c_calculee, 2),
        "c_unitaire": c_unitaire,
        "nb_batteries": nb_batteries,
        "nb_serie": 1,
        "nb_parallele": nb_batteries,
        "energie_totale": round(nb_batteries * c_unitaire * usys / 1000, 2),
    }


def calculer_courant_regulateur(pc: float, usys: int) -> float:
    return round((pc / usys) * 1.25, 2)


# ════════════════════════════════
# ÉTAPE 6 — CÂBLES ET PROTECTIONS
# ════════════════════════════════

def calculer_troncon_panneau_onduleur(
    isc: float,
    n_parallele: int,
    vmp_string: float,
    longueur: float,
) -> dict:
    I = 1.25 * isc * n_parallele
    S_calc = calculer_section(RHO, longueur, I, 0.03, vmp_string)
    S_norm = section_normalisee_dc(S_calc)
    Ip_min = I * 1.25

    if n_parallele == 1:
        protection = "Disjoncteur DC"
        calibre = calibre_normalise_dc(Ip_min)
        fusible_gpv = False
    else:
        protection = "Fusible gPV + Disjoncteur DC"
        calibre = calibre_normalise_dc(Ip_min)
        fusible_gpv = True

    return {
        "troncon": "Panneau → Onduleur/Régulateur",
        "type_cable": "H1Z2Z2K",
        "longueur": longueur,
        "courant": round(I, 2),
        "section_calculee": round(S_calc, 3),
        "section": S_norm,
        "protection": protection,
        "calibre": calibre,
        "fusible_gpv": fusible_gpv,
        "qt_fusible_gpv": n_parallele if fusible_gpv else 0,
        "parafoudre_dc": "Type 2 DC 1000V",
        "qt_parafoudre_dc": n_parallele,
    }


def calculer_troncon_regulateur_batterie(pc: float, usys: int, longueur: float) -> dict:
    I = (pc / usys) * 1.10
    S_calc = calculer_section(RHO, longueur, I, 0.03, usys)
    S_norm = section_normalisee_dc(S_calc)
    if S_norm < 10:
        S_norm = 10
    Ip_min = I * 1.25

    if I <= 63:
        protection = "Disjoncteur DC"
        calibre = calibre_normalise_dc(Ip_min)
        fusible_nh = None
    else:
        nh = get_fusible_nh(I)
        protection = f"Fusible {nh['type']}"
        calibre = nh["calibre"]
        fusible_nh = nh

    return {
        "troncon": "Régulateur → Batterie",
        "type_cable": "Souple rouge/noir",
        "longueur": longueur,
        "courant": round(I, 2),
        "section_calculee": round(S_calc, 3),
        "section": S_norm,
        "protection": protection,
        "calibre": calibre,
        "fusible_nh": fusible_nh,
    }


def calculer_troncon_batterie_onduleur(
    pond: float,
    usys: int,
    longueur: float,
    nb_onduleurs: int = 1,
) -> list:
    troncons = []
    pond_unit = pond / nb_onduleurs
    I = (pond_unit / usys) * 1.10
    S_calc = calculer_section(RHO, longueur, I, 0.03, usys)
    S_norm = section_normalisee_dc(S_calc)
    if S_norm < 10:
        S_norm = 10
    Ip_min = I * 1.25

    if I <= 63:
        protection = "Disjoncteur DC"
        calibre = calibre_normalise_dc(Ip_min)
        fusible_nh = None
    else:
        nh = get_fusible_nh(I)
        protection = f"Fusible {nh['type']}"
        calibre = nh["calibre"]
        fusible_nh = nh

    for i in range(nb_onduleurs):
        suffix = f" (Onduleur {i + 1})" if nb_onduleurs > 1 else ""
        troncons.append({
            "troncon": f"Batterie → Onduleur{suffix}",
            "type_cable": "Souple rouge/noir",
            "longueur": longueur,
            "courant": round(I, 2),
            "section_calculee": round(S_calc, 3),
            "section": S_norm,
            "protection": protection,
            "calibre": calibre,
            "fusible_nh": fusible_nh,
        })

    return troncons


def calculer_troncon_onduleur_tableau(
    pond: float,
    longueur: float,
    nb_onduleurs: int = 1,
    phase: str = "monophasé",
) -> dict:
    pond_unit = pond / nb_onduleurs
    I = pond_unit / (230 * 0.8)
    S_calc = calculer_section(RHO, longueur, I, 0.05, 230)
    S_norm = section_normalisee_ac(S_calc)
    Ip_min = I * 1.25

    conducteurs = "3" if phase == "monophasé" else "5"
    type_cable = f"H07RN-F {conducteurs}×{S_norm}mm²"

    if phase == "monophasé":
        protection = "Disjoncteur différentiel 2P 30mA"
        parafoudre_ac = "Type 2 AC 2P 230V"
    else:
        protection = "Disjoncteur différentiel 4P 30mA"
        parafoudre_ac = "Type 2 AC 4P 400V"

    calibre = calibre_normalise_ac(Ip_min)

    troncons = []
    for i in range(nb_onduleurs):
        suffix = f" (Onduleur {i + 1})" if nb_onduleurs > 1 else ""
        troncons.append({
            "troncon": f"Onduleur → Tableau{suffix}",
            "type_cable": type_cable,
            "longueur": longueur,
            "courant": round(I, 2),
            "section_calculee": round(S_calc, 3),
            "section": S_norm,
            "protection": protection,
            "calibre": calibre,
        })

    return {
        "troncons": troncons,
        "differentiel": protection,
        "calibre_differentiel": calibre,
        "parafoudre_ac": parafoudre_ac,
        "qt_parafoudre_ac": 1,
    }


# ════════════════════════════════
# FONCTIONS PRINCIPALES
# ════════════════════════════════

def calculer_etape1(params: dict) -> dict:
    appareils = params["appareils"]
    cs = params["cs"]
    eta = params.get("eta", 0.80)
    irradiation = params["irradiation"]
    latitude = params["latitude"]
    pr = params.get("pr") or get_pr(latitude)

    ej = calculer_ej(appareils, cs, eta)
    pond = calculer_pond(appareils)
    puissance_pointe = calculer_puissance_pointe(appareils)
    pc = calculer_pc(ej, irradiation, pr)
    usys = get_usys(pc, pond)
    courant_reg = calculer_courant_regulateur(pc, usys)

    type_reg = params.get("type_regulateur", "AIO")
    if type_reg == "AIO" and pond > 12000:
        nb_onduleurs = 3
        phase = "triphasé"
    else:
        nb_onduleurs = 1
        phase = "monophasé"

    onduleur_info = None
    if type_reg == "AIO":
        onduleur_info = choisir_onduleur_aio(pond)

    return {
        "ej": ej,
        "pond": pond,
        "puissance_pointe": puissance_pointe,
        "pc": pc,
        "pr": pr,
        "usys": usys,
        "courant_regulateur": courant_reg,
        "onduleur_suggere": onduleur_info,
        "nb_onduleurs": nb_onduleurs,
        "phase": phase,
    }


def calculer_etape2(etape1: dict, params: dict, equipements: dict) -> dict:
    panneau  = equipements["panneau"]
    type_reg = equipements.get("type_regulateur", "AIO")
    batterie = equipements.get("batterie") or {}

    pc   = etape1["pc"]
    ej   = etape1["ej"]
    n_jours = params.get("n_jours", 2)

    # DoD et rendement depuis la batterie choisie
    dod     = batterie.get("dod", 90) / 100 if batterie else params.get("dod", 0.90)
    eta_bat = batterie.get("rendement", 95) / 100 if batterie else params.get("eta_bat", 0.95)
    c_unitaire = batterie.get("capacite", 200) if batterie else 200

    warnings = []

    if type_reg == "AIO":
        onduleur    = equipements["onduleur"]
        usys        = onduleur["usys"]
        nb_onduleurs = etape1.get("nb_onduleurs", 1)
        phase        = etape1.get("phase", "monophasé")

        # Vérif LiFePO4 pour triphasé
        if nb_onduleurs == 3:
            techno = (batterie.get("technologie") or "").lower()
            if batterie and not ("lifepo4" in techno or "lithium" in techno):
                warnings.append(
                    "Installation triphasée : uniquement LiFePO4 autorisé !"
                )

        # Calcul panneaux pour un onduleur, multiplié × nb_onduleurs
        pc_unit = pc / nb_onduleurs if nb_onduleurs > 1 else pc
        panneaux_calc = calculer_panneaux_aio(pc_unit, onduleur, panneau)
        panneaux_calc["np_final_total"] = panneaux_calc["np_final"] * nb_onduleurs
        panneaux_calc["pc_reel_total"]  = round(panneaux_calc["pc_reel"] * nb_onduleurs, 2)

        # Vérifications plages AIO
        i_string = panneau["isc"] * panneaux_calc["n_parallele"]
        warnings += verifier_aio(
            onduleur,
            panneaux_calc["vmp_string"],
            panneaux_calc["voc_string"],
            panneaux_calc["pc_reel"],
            i_string,
        )

    elif type_reg == "MPPT":
        usys       = equipements["usys"]
        vmax_mppt  = equipements["vmax_mppt"]
        panneaux_calc = calculer_panneaux_mppt(pc, usys, vmax_mppt, panneau)
        panneaux_calc["np_final_total"] = panneaux_calc["np_final"]
        panneaux_calc["pc_reel_total"]  = panneaux_calc["pc_reel"]
        nb_onduleurs = 1
        phase = "monophasé"

        reg = equipements.get("regulateur") or {}
        ireg = calculer_courant_regulateur(pc, usys)
        warnings += verifier_mppt(reg, panneaux_calc["voc_string"], panneaux_calc["vmp_string"], ireg)

    else:  # PWM
        usys = equipements["usys"]
        panneaux_calc = calculer_panneaux_pwm(pc, usys, panneau)
        panneaux_calc["np_final_total"] = panneaux_calc["np_final"]
        panneaux_calc["pc_reel_total"]  = panneaux_calc["pc_reel"]
        nb_onduleurs = 1
        phase = "monophasé"

    batteries_calc = calculer_batteries(ej, n_jours, usys, dod, eta_bat, c_unitaire)
    courant_reg = calculer_courant_regulateur(pc, usys)

    return {
        "usys": usys,
        "panneaux": panneaux_calc,
        "batteries": batteries_calc,
        "courant_regulateur": round(courant_reg, 2),
        "phase": phase,
        "nb_onduleurs": nb_onduleurs,
        "warnings": warnings,
    }


def calculer_etape3(etape1: dict, etape2: dict, params: dict, equipements: dict) -> dict:
    panneau      = equipements["panneau"]
    type_reg     = equipements.get("type_regulateur", "AIO")
    n_par        = etape2["panneaux"]["n_parallele"]
    vmp_string   = etape2["panneaux"]["vmp_string"]
    usys         = etape2["usys"]
    pond         = etape1["pond"]
    pc           = etape1["pc"]
    nb_onduleurs = etape2["nb_onduleurs"]
    phase        = etape2["phase"]

    L_pan_ond = params["longueur_panneau_ond"]
    L_reg_bat = params["longueur_reg_bat"]
    L_bat_ond = params["longueur_bat_ond"]
    L_ond_tab = params["longueur_ond_tableau"]

    troncons = []

    # T1 : Panneau → Onduleur (× nb_onduleurs pour triphasé)
    t1_base = calculer_troncon_panneau_onduleur(panneau["isc"], n_par, vmp_string, L_pan_ond)
    for i in range(nb_onduleurs):
        t1 = dict(t1_base)
        if nb_onduleurs > 1:
            t1["troncon"] = f"Panneau → Onduleur (Onduleur {i + 1})"
        troncons.append(t1)

    fusible_nh_reg = None
    if type_reg in ["MPPT", "PWM"]:
        t2 = calculer_troncon_regulateur_batterie(pc, usys, L_reg_bat)
        troncons.append(t2)
        fusible_nh_reg = t2.get("fusible_nh")

    t3_list = calculer_troncon_batterie_onduleur(pond, usys, L_bat_ond, nb_onduleurs)
    troncons.extend(t3_list)
    fusible_nh_bat = t3_list[0].get("fusible_nh") if t3_list else None

    t4 = calculer_troncon_onduleur_tableau(pond, L_ond_tab, nb_onduleurs, phase)
    troncons.extend(t4["troncons"])

    porte_fusibles = []
    if t1_base["fusible_gpv"]:
        porte_fusibles.append({
            "designation": "Porte-fusible gPV 10×38mm 1000V DC",
            "quantite": n_par * nb_onduleurs,
        })
    if fusible_nh_reg:
        porte_fusibles.append({
            "designation": fusible_nh_reg["porte_fusible"],
            "quantite": 1,
        })
    if fusible_nh_bat:
        porte_fusibles.append({
            "designation": fusible_nh_bat["porte_fusible"],
            "quantite": nb_onduleurs,
        })

    parafoudres = [
        {
            "designation": t1_base["parafoudre_dc"],
            "quantite": t1_base["qt_parafoudre_dc"] * nb_onduleurs,
            "position": "Côté panneaux",
        },
        {
            "designation": t4["parafoudre_ac"],
            "quantite": 1,
            "position": "Côté tableau",
        },
    ]

    return {
        "troncons": troncons,
        "porte_fusibles": porte_fusibles,
        "parafoudres": parafoudres,
        "differentiel": {
            "type": t4["differentiel"],
            "calibre": t4["calibre_differentiel"],
            "quantite": 1,
        },
    }
