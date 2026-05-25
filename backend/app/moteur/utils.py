import math
from .tables import (
    SECTIONS_H1Z2Z2K,
    SECTIONS_SOUPLE_DC,
    SECTIONS_AC_MONO,
    SECTIONS_AC_TRI,
    CALIBRES_DC,
    CALIBRES_GPV,
    CALIBRES_DIFF_2P,
    CALIBRES_DIFF_4P,
    FUSIBLES_NH,
)

RHO = 0.02150  # résistivité cuivre

# ════════════════════════════
# SECTIONS CÂBLES
# ════════════════════════════

def section_h1z2z2k(s_calc: float) -> float:
    for s in SECTIONS_H1Z2Z2K:
        if s >= s_calc:
            return s
    return SECTIONS_H1Z2Z2K[-1]

def section_souple_dc(s_calc: float) -> float:
    for s in SECTIONS_SOUPLE_DC:
        if s >= s_calc:
            return s
    return SECTIONS_SOUPLE_DC[-1]

def section_ac_mono(s_calc: float) -> float:
    for s in SECTIONS_AC_MONO:
        if s >= s_calc:
            return s
    return SECTIONS_AC_MONO[-1]

def section_ac_tri(s_calc: float) -> float:
    for s in SECTIONS_AC_TRI:
        if s >= s_calc:
            return s
    return SECTIONS_AC_TRI[-1]

# ════════════════════════════
# CALIBRES PROTECTIONS
# ════════════════════════════

def calibre_disj_dc(ip_min: float) -> int:
    for c in CALIBRES_DC:
        if c >= ip_min:
            return c
    return CALIBRES_DC[-1]

def calibre_gpv(ip_min: float) -> int:
    for c in CALIBRES_GPV:
        if c >= ip_min:
            return c
    return CALIBRES_GPV[-1]

def calibre_diff_2p(ip_min: float) -> int:
    for c in CALIBRES_DIFF_2P:
        if c >= ip_min:
            return c
    return CALIBRES_DIFF_2P[-1]

def calibre_diff_4p(ip_min: float) -> int:
    for c in CALIBRES_DIFF_4P:
        if c >= ip_min:
            return c
    return CALIBRES_DIFF_4P[-1]

def get_fusible_nh(ip_min: float) -> dict:
    """
    ip_min = courant déjà majoré (× 1.25)
    NE PAS multiplier ici !
    """
    for f in FUSIBLES_NH:
        if f["calibre"] >= ip_min:
            return {
                "type": f["type"],
                "calibre": f["calibre"],
                "porte_fusible": f["porte_fusible"],
            }
    return {
        "type": "NH3",
        "calibre": 630,
        "porte_fusible": "Porte-fusible NH3"
    }

# ════════════════════════════
# FORMULES SECTIONS
# ════════════════════════════

def calculer_section_dc(
    L: float, I: float,
    delta_u: float, U: float
) -> float:
    """S = 2 × ρ × L × I / (ΔU × U)"""
    return (2 * RHO * L * I) / (delta_u * U)

def calculer_section_ac_mono(
    L: float, I: float,
    delta_u: float, U: float
) -> float:
    """S = 2 × ρ × L × I / (ΔU × U) — Monophasé"""
    return (2 * RHO * L * I) / (delta_u * U)

def calculer_section_ac_tri(
    L: float, I: float,
    delta_u: float, U: float
) -> float:
    """S = √3 × ρ × L × I / (ΔU × U) — Triphasé"""
    return (math.sqrt(3) * RHO * L * I) / (delta_u * U)

# ════════════════════════════
# ARRONDIS
# ════════════════════════════

def arrondi_math(x: float) -> int:
    return math.floor(x + 0.5)

def arrondi_sup(x: float) -> int:
    return math.ceil(x)
