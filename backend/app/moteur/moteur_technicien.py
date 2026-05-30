import math
from .tables import get_equipements
from .utils import (
    RHO,
    section_h1z2z2k,
    section_souple_dc,
    section_ac_mono,
    section_ac_tri,
    calibre_disj_dc,
    calibre_gpv,
    calibre_diff_2p,
    calibre_diff_4p,
    get_fusible_nh,
    arrondi_math,
    arrondi_sup,
    calculer_section_dc,
    calculer_section_ac_mono,
    calculer_section_ac_tri,
)

# ════════════════════════════
# ÉTAPE 1 — BILAN ÉNERGÉTIQUE
# ════════════════════════════

def calculer_ej(
    appareils: list,
    cs: float,
    eta: float = 0.80
) -> float:
    """Ej = Σ(Pi × qi × ti) × Cs / η"""
    sigma = sum(
        a["puissance"] * a["quantite"]
        * (a["h_jour"] + a["h_nuit"])
        for a in appareils
    )
    return round(sigma * cs / eta, 2)


def calculer_pond(
    appareils: list,
    k: float = 1.25
) -> float:
    """Pond = Σ(Pi × qi) × k"""
    sigma = sum(
        a["puissance"] * a["quantite"]
        for a in appareils
    )
    return round(sigma * k, 2)


# ════════════════════════════
# ÉTAPE 2 — CHAMP SOLAIRE
# ════════════════════════════

def get_pr(latitude: float) -> float:
    """PR selon zone géographique Bénin"""
    if latitude < 8.0:
        return 0.75
    elif latitude < 10.0:
        return 0.73
    else:
        return 0.70


def calculer_pc(
    ej: float,
    irradiation: float,
    pr: float
) -> float:
    """Pc = Ej / (Ir × PR)"""
    return round(ej / (irradiation * pr), 2)


def get_usys(pc: float, pond: float) -> int:
    """
    Tension système selon Pc et Pond.
    Prend le max pour être conservateur.
    """
    usys_pc = (
        12 if pc <= 750
        else 24 if pc <= 2000
        else 48
    )
    usys_pond = (
        12 if pond <= 1500
        else 24 if pond <= 3000
        else 48
    )
    return max(usys_pc, usys_pond)


# ════════════════════════════
# ÉTAPE 3 — ONDULEUR AIO
# ════════════════════════════

def choisir_onduleur_aio(
    pond: float,
    usys: int
) -> dict:
    """
    Choisit le plus petit AIO ≥ pond.
    Si pond > 12kW → 3 onduleurs monophasés.
    Filtre par usys.
    """
    onduleurs = sorted(
        [o for o in
         get_equipements().get("onduleurs_aio", [])
         if o.get("usys") == usys],
        key=lambda o: o["puissance"],
    )
    if not onduleurs:
        return None

    if pond <= 12000:
        for o in onduleurs:
            if o["puissance"] >= pond:
                return {
                    "nb_onduleurs": 1,
                    "phase": "monophasé",
                    "onduleur": o,
                    "pond_unitaire": pond,
                }
        return {
            "nb_onduleurs": 1,
            "phase": "monophasé",
            "onduleur": onduleurs[-1],
            "pond_unitaire": pond,
        }
    else:
        pond_unit = pond / 3
        for o in onduleurs:
            if o["puissance"] >= pond_unit:
                return {
                    "nb_onduleurs": 3,
                    "phase": "triphasé",
                    "onduleur": o,
                    "pond_unitaire": pond_unit,
                }
        return {
            "nb_onduleurs": 3,
            "phase": "triphasé",
            "onduleur": onduleurs[-1],
            "pond_unitaire": pond_unit,
        }


# ════════════════════════════
# ÉTAPE 4 — PANNEAUX SOLAIRES
# ════════════════════════════

def calculer_panneaux_aio(
    pc: float,
    onduleur: dict,
    panneau: dict,
    nb_onduleurs: int = 1,
) -> dict:
    mppt_max = onduleur["mppt_max"]
    voc_lim  = mppt_max * 0.95

    ns = int(voc_lim / panneau["voc"])
    if ns < 1:
        ns = 1

    warning = None
    if panneau["voc"] > voc_lim:
        warning = (
            f"Panneau incompatible : Voc={panneau['voc']}V "
            f"> Vmax MPPT={voc_lim:.1f}V. "
            "Choisissez un panneau avec Voc plus petit "
            "ou un onduleur avec Vmax plus grand."
        )

    pc_unit = pc / nb_onduleurs if nb_onduleurs > 1 else pc
    n_par = math.ceil(pc_unit / (ns * panneau["puissance"]))
    if n_par < 1:
        n_par = 1

    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "np_final_total": np_final * nb_onduleurs,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
        "pc_reel_total": round(np_final * nb_onduleurs * panneau["puissance"], 2),
        "warning": warning,
    }


def calculer_panneaux_mppt(
    pc: float,
    usys: int,
    vmax_mppt: float,
    panneau: dict,
    regulateur: dict = None,
) -> dict:
    voc_lim = vmax_mppt * 0.95

    ns = int(voc_lim / panneau["voc"])
    if ns < 1:
        ns = 1

    warning = None
    if panneau["voc"] > voc_lim:
        warning = (
            f"Panneau incompatible : Voc={panneau['voc']}V "
            f"> Vmax MPPT={voc_lim:.1f}V."
        )

    if regulateur:
        p_max_reg = regulateur.get("courant_max", float("inf")) * vmax_mppt
        while ns > 1 and ns * panneau["vmp"] * panneau["isc"] > p_max_reg:
            ns -= 1
        if ns * panneau["vmp"] * panneau["isc"] > p_max_reg:
            warning = (
                f"Régulateur insuffisant : "
                f"P_champ={ns * panneau['vmp'] * panneau['isc']:.0f}W "
                f"> P_max_reg={p_max_reg:.0f}W. "
                "Choisissez un régulateur plus puissant."
            )

    n_par = math.ceil(pc / (ns * panneau["puissance"]))
    if n_par < 1:
        n_par = 1

    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "np_final_total": np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
        "pc_reel_total": round(np_final * panneau["puissance"], 2),
        "warning": warning,
    }


def calculer_panneaux_pwm(
    pc: float,
    usys: int,
    panneau: dict,
    regulateur: dict = None,
) -> dict:
    ns = math.ceil(usys / panneau["tension_nominale"])
    if ns < 1:
        ns = 1

    n_par = math.ceil(pc / (ns * panneau["puissance"]))
    if n_par < 1:
        n_par = 1

    warning = None
    if regulateur:
        imax_reg = regulateur.get("courant_max", float("inf"))
        while panneau["isc"] * n_par > imax_reg:
            ns += 1
            n_par = math.ceil(pc / (ns * panneau["puissance"]))
            if n_par < 1:
                n_par = 1
        if panneau["isc"] * n_par > imax_reg:
            warning = (
                f"Régulateur insuffisant : "
                f"Isc×N//={panneau['isc'] * n_par:.1f}A "
                f"> Imax={imax_reg}A. "
                "Choisissez un régulateur avec Imax plus grand."
            )

    np_final = ns * n_par
    return {
        "ns": ns,
        "n_parallele": n_par,
        "np_final": np_final,
        "np_final_total": np_final,
        "vmp_string": round(ns * panneau["vmp"], 2),
        "voc_string": round(ns * panneau["voc"], 2),
        "pc_reel": round(np_final * panneau["puissance"], 2),
        "pc_reel_total": round(np_final * panneau["puissance"], 2),
        "warning": warning,
    }


# ════════════════════════════
# ÉTAPE 5 — BATTERIES
# ════════════════════════════

def calculer_batteries(
    ej: float,
    n_jours: float,
    usys: int,
    batterie: dict,
    type_reg: str = "AIO",
) -> dict:
    """
    C = (Ej × N) / (DoD × Usys × η_bat)
    Nbs = Usys / Ubat
    """
    dod        = batterie.get("dod", 90) / 100
    eta_bat    = batterie.get("rendement", 95) / 100
    c_unitaire = batterie.get("capacite", 200)
    ubat       = batterie.get("tension", usys)

    c_calculee = (ej * n_jours) / (dod * usys * eta_bat)

    nbs = usys // ubat
    if nbs < 1:
        nbs = 1

    nbp = arrondi_sup(c_calculee / c_unitaire)
    if nbp < 1:
        nbp = 1
    nb = nbs * nbp

    return {
        "c_calculee": round(c_calculee, 2),
        "c_unitaire": c_unitaire,
        "nb_batteries": nb,
        "nb_serie": nbs,
        "nb_parallele": nbp,
        "energie_totale": round(nb * c_unitaire * ubat / 1000, 2),
    }


# ════════════════════════════
# ÉTAPE 6 — CÂBLES ET PROTECTIONS
# ════════════════════════════

def troncon_panneau_regulateur(
    panneau: dict,
    n_par: int,
    vmp_string: float,
    longueur: float,
) -> dict:
    """
    T1 — Panneau → Onduleur/Régulateur
    Câble : H1Z2Z2K
    I = 1.25 × Isc × N//
    ΔU = 3%
    Fusible gPV + parafoudre DC systématiques (même N//=1)
    """
    I = 1.25 * panneau["isc"] * n_par
    S_calc = calculer_section_dc(longueur, I, 0.03, vmp_string)
    S_norm = section_h1z2z2k(S_calc)

    Ip         = 1.25 * panneau["isc"]
    cal_gpv    = calibre_gpv(Ip)
    protection = f"Fusible gPV {cal_gpv}A"
    calibre    = cal_gpv
    fusible_gpv = True
    qt_fusible  = n_par * 2  # positif + négatif par string

    return {
        "troncon": "Panneau → Onduleur",
        "type_cable": "H1Z2Z2K",
        "longueur": longueur,
        "courant": round(I, 2),
        "section_calculee": round(S_calc, 3),
        "section": S_norm,
        "protection": protection,
        "calibre": calibre,
        "fusible_gpv": fusible_gpv,
        "qt_fusible_gpv": qt_fusible,
        "parafoudre_dc": "Type 2 DC 1000V",
        "qt_parafoudre_dc": n_par,
    }


def troncon_dc(
    nom: str,
    courant_base: float,
    usys: int,
    longueur: float,
) -> dict:
    """
    Tronçon DC générique (Rég→Bat ou Bat→Ond)
    Câble : Souple rouge/noir (min 10mm²)
    I = courant_base × 1.10
    ΔU = 3%
    Fusible NH si I > 63A
    """
    I      = courant_base * 1.10
    S_calc = calculer_section_dc(longueur, I, 0.03, usys)
    S_norm = section_souple_dc(S_calc)
    Ip_min = I * 1.25

    if I <= 63:
        protection = "Disjoncteur DC 2P"
        calibre    = calibre_disj_dc(Ip_min)
        fusible_nh = None
        quantite   = 1
    else:
        nh         = get_fusible_nh(Ip_min)
        protection = f"Fusible {nh['type']}"
        calibre    = nh["calibre"]
        fusible_nh = nh
        quantite   = 2  # positif + négatif

    return {
        "troncon": nom,
        "type_cable": "Souple rouge/noir",
        "longueur": longueur,
        "courant": round(I, 2),
        "section_calculee": round(S_calc, 3),
        "section": S_norm,
        "protection": protection,
        "calibre": calibre,
        "quantite": quantite,
        "fusible_nh": fusible_nh,
    }


def troncon_ac(
    pond: float,
    longueur: float,
    phase: str = "monophasé",
    nb_onduleurs: int = 1,
) -> dict:
    """
    T4 — Onduleur → Tableau AC
    Mono : I = Pond_unit / 230, H07RN-F 3×, diff 2P
    Tri  : I = Pond_unit / (√3 × 400 × 0.95), H07RN-F 5×, diff 4P
    ΔU = 5%
    """
    pond_unit = pond / nb_onduleurs

    if phase == "monophasé":
        I       = pond_unit / 230
        S_calc  = calculer_section_ac_mono(longueur, I, 0.05, 230)
        S_norm  = section_ac_mono(S_calc)
        type_cable  = f"H07RN-F 3×{S_norm}mm²"
        Ip_min      = I * 1.25
        calibre     = calibre_diff_2p(Ip_min)
        protection  = "Disjoncteur différentiel 2P 30mA"
        parafoudre  = "Type 2 AC 2P 230V"
    else:
        I       = pond_unit / (math.sqrt(3) * 400 * 0.95)
        S_calc  = calculer_section_ac_tri(longueur, I, 0.05, 400)
        S_norm  = section_ac_tri(S_calc)
        type_cable  = f"H07RN-F 5×{S_norm}mm²"
        Ip_min      = I * 1.25
        calibre     = calibre_diff_4p(Ip_min)
        protection  = "Disjoncteur différentiel 4P 30mA"
        parafoudre  = "Type 2 AC 4P 400V"

    troncons = []
    for i in range(nb_onduleurs):
        suffix = f" (Onduleur {i+1})" if nb_onduleurs > 1 else ""
        troncons.append({
            "troncon": f"Onduleur → Tableau AC{suffix}",
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
        "differentiel": {
            "type": protection,
            "calibre": calibre,
            "quantite": nb_onduleurs,
        },
        "parafoudre_ac": {
            "designation": parafoudre,
            "quantite": 1,
        },
    }


# ════════════════════════════
# FONCTIONS PRINCIPALES
# ════════════════════════════

def calculer_etape1(params: dict) -> dict:
    appareils   = params["appareils"]
    cs          = params["cs"]
    k           = params.get("k", 1.25)
    eta         = params.get("eta", 0.80)
    irradiation = params["irradiation"]
    latitude    = params["latitude"]
    pr          = params.get("pr") or get_pr(latitude)
    type_reg    = params.get("type_regulateur", "AIO")

    ej   = calculer_ej(appareils, cs, eta)
    pond = calculer_pond(appareils, k)
    pc   = calculer_pc(ej, irradiation, pr)
    usys = get_usys(pc, pond)

    nb_onduleurs = 1
    phase = "monophasé"
    if type_reg == "AIO" and pond > 12000:
        nb_onduleurs = 3
        phase = "triphasé"

    onduleur_info = None
    if type_reg == "AIO":
        onduleur_info = choisir_onduleur_aio(pond, usys)

    return {
        "ej": ej,
        "pond": pond,
        "pc": pc,
        "pr": pr,
        "usys": usys,
        "nb_onduleurs": nb_onduleurs,
        "phase": phase,
        "onduleur_suggere": onduleur_info,
        "courant_regulateur": round((pc / usys) * 1.25, 2),
    }


def calculer_etape2(
    etape1: dict,
    params: dict,
    equipements: dict,
) -> dict:
    panneau  = equipements["panneau"]
    type_reg = equipements.get("type_regulateur", "AIO")
    batterie = equipements.get("batterie") or {}

    pc      = etape1["pc"]
    ej      = etape1["ej"]
    usys    = etape1["usys"]
    n_jours = params.get("n_jours", 2)

    warnings = []

    if type_reg == "AIO":
        onduleur = equipements.get("onduleur")
        if not onduleur:
            raise ValueError(
                "Un onduleur AIO est requis pour type_regulateur='AIO'"
            )
        nb_onduleurs = etape1["nb_onduleurs"]
        phase        = etape1["phase"]

        if nb_onduleurs == 3:
            techno = (batterie.get("technologie") or "").lower()
            if batterie and not (
                "lifepo4" in techno or "lithium" in techno
            ):
                warnings.append(
                    "Installation triphasée : LiFePO4 uniquement !"
                )

        panneaux_calc = calculer_panneaux_aio(
            pc, onduleur, panneau, nb_onduleurs
        )

    elif type_reg == "MPPT":
        nb_onduleurs = 1
        phase        = "monophasé"
        vmax_mppt    = equipements.get("vmax_mppt", 150)
        panneaux_calc = calculer_panneaux_mppt(
            pc, usys, vmax_mppt, panneau, equipements.get("regulateur")
        )

    else:  # PWM
        nb_onduleurs = 1
        phase        = "monophasé"
        panneaux_calc = calculer_panneaux_pwm(
            pc, usys, panneau, equipements.get("regulateur")
        )

        techno = (batterie.get("technologie") or "").lower()
        if "lifepo4" in techno or "lithium" in techno:
            warnings.append("PWM incompatible avec LiFePO4 !")

    if panneaux_calc.get("warning"):
        warnings.append(panneaux_calc["warning"])

    batteries_calc = calculer_batteries(
        ej, n_jours, usys, batterie, type_reg
    )

    return {
        "usys": usys,
        "panneaux": panneaux_calc,
        "batteries": batteries_calc,
        "phase": phase,
        "nb_onduleurs": nb_onduleurs,
        "warnings": warnings,
    }


def calculer_etape3(
    etape1: dict,
    etape2: dict,
    params: dict,
    equipements: dict,
) -> dict:
    panneau      = equipements["panneau"]
    type_reg     = equipements.get("type_regulateur", "AIO")
    n_par        = etape2["panneaux"]["n_parallele"]
    vmp_string   = etape2["panneaux"]["vmp_string"]
    usys         = etape2["usys"]
    pond         = etape1["pond"]
    pc           = etape1["pc"]
    nb_onduleurs = etape2["nb_onduleurs"]
    phase        = etape2["phase"]

    L_pan = params["longueur_panneau_ond"]
    L_dc2 = params.get("longueur_reg_bat", 2)
    L_bat = params["longueur_bat_ond"]
    L_ac  = params["longueur_ond_tableau"]

    troncons       = []
    porte_fusibles = []
    parafoudres    = []

    # ── T1 : Panneau → Onduleur/Régulateur ──
    nom_t1 = (
        "Panneau → Onduleur"
        if type_reg == "AIO"
        else "Panneau → Régulateur"
    )
    t1_base = troncon_panneau_regulateur(
        panneau, n_par, vmp_string, L_pan
    )
    t1_base["troncon"] = nom_t1

    for i in range(nb_onduleurs):
        t1 = dict(t1_base)
        if nb_onduleurs > 1:
            t1["troncon"] = f"Panneau → Onduleur (Onduleur {i+1})"
        troncons.append(t1)

    if t1_base["fusible_gpv"]:
        porte_fusibles.append({
            "designation": "Porte-fusible gPV 10×38mm 1000V DC",
            "quantite": n_par * nb_onduleurs,
        })
    if t1_base["qt_parafoudre_dc"] > 0:
        parafoudres.append({
            "designation": t1_base["parafoudre_dc"],
            "quantite": t1_base["qt_parafoudre_dc"] * nb_onduleurs,
            "position": "Côté panneaux",
        })

    # ── T2 : Régulateur → Batterie (MPPT/PWM uniquement) ──
    fusible_nh_reg = None
    if type_reg in ["MPPT", "PWM"]:
        t2 = troncon_dc(
            "Régulateur → Batterie",
            pc / usys,
            usys,
            L_dc2,
        )
        troncons.append(t2)
        fusible_nh_reg = t2.get("fusible_nh")
        if fusible_nh_reg:
            porte_fusibles.append({
                "designation": fusible_nh_reg["porte_fusible"],
                "quantite": 1,
            })

    # ── T3 : Batterie → Onduleur ──
    pond_unit = pond / nb_onduleurs
    for i in range(nb_onduleurs):
        suffix = f" (Onduleur {i+1})" if nb_onduleurs > 1 else ""
        t3 = troncon_dc(
            f"Batterie → Onduleur{suffix}",
            pond_unit / usys,
            usys,
            L_bat,
        )
        troncons.append(t3)
        if i == 0 and t3.get("fusible_nh"):
            porte_fusibles.append({
                "designation": t3["fusible_nh"]["porte_fusible"],
                "quantite": nb_onduleurs,
            })

    # ── T4 : Onduleur → Tableau AC ──
    t4 = troncon_ac(pond, L_ac, phase, nb_onduleurs)
    troncons.extend(t4["troncons"])
    parafoudres.append({
        "designation": t4["parafoudre_ac"]["designation"],
        "quantite": 1,
        "position": "Côté tableau",
    })

    return {
        "troncons": troncons,
        "porte_fusibles": porte_fusibles,
        "parafoudres": parafoudres,
        "differentiel": t4["differentiel"],
    }
