from .moteur_particulier_sans_budget import calculer_sans_budget

BUDGET_MINIMUM = 500_000  # FCFA


def calculer_avec_budget(
    mode: str,
    appareils: list,
    budget: float,
    irradiation: float,
    latitude: float,
    appareils_prioritaires: list = None,
    t_matin: float = 0,
    t_midi: float = 0,
    t_soir: float = 0,
) -> dict:
    if budget < BUDGET_MINIMUM:
        raise ValueError(f"Budget minimum : {BUDGET_MINIMUM:,} FCFA")

    result = calculer_sans_budget(
        mode=mode,
        appareils=appareils,
        irradiation=irradiation,
        latitude=latitude,
        appareils_prioritaires=appareils_prioritaires,
        t_matin=t_matin,
        t_midi=t_midi,
        t_soir=t_soir,
    )

    return {**result, "budget": budget}
