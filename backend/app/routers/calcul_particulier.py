from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
import traceback

from app.moteur.moteur_particulier_sans_budget import calculer_sans_budget
from app.moteur.moteur_particulier_avec_budget import calculer_avec_budget
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/calcul/particulier", tags=["calcul-particulier"])


class Appareil(BaseModel):
    nom: str
    puissance: float
    quantite: int
    h_jour: float = 0
    h_nuit: float = 0
    prioritaire: bool = False
    facteur_pointe: float = 1.0


class ParamsSansBudget(BaseModel):
    mode: str
    appareils: List[Appareil]
    irradiation: float
    latitude: float
    t_matin: float = 0
    t_midi: float = 0
    t_soir: float = 0


class ParamsAvecBudget(BaseModel):
    mode: str
    appareils: List[Appareil]
    budget: float
    irradiation: float
    latitude: float
    t_matin: float = 0
    t_midi: float = 0
    t_soir: float = 0


def _save_etude(mode_budget: str, mode: str, appareils: list, resultat: dict,
                irradiation: float, latitude: float, budget: float = None):
    try:
        supabase = get_supabase()
        row = {
            "mode_budget": mode_budget,
            "mode": mode,
            "appareils": appareils,
            "resultat": resultat,
            "irradiation": irradiation,
            "latitude": latitude,
        }
        if budget is not None:
            row["budget"] = budget
        supabase.table("etudes_particulier").insert(row).execute()
    except Exception:
        pass


@router.post("/sans-budget")
async def calcul_sans_budget(params: ParamsSansBudget, background_tasks: BackgroundTasks):
    try:
        appareils = [a.model_dump() for a in params.appareils]
        appareils_prioritaires = [a for a in appareils if a.get("prioritaire")]
        result = calculer_sans_budget(
            mode=params.mode,
            appareils=appareils,
            irradiation=params.irradiation,
            latitude=params.latitude,
            appareils_prioritaires=appareils_prioritaires,
            t_matin=params.t_matin,
            t_midi=params.t_midi,
            t_soir=params.t_soir,
        )
        background_tasks.add_task(
            _save_etude, "sans_budget", params.mode, appareils, result,
            params.irradiation, params.latitude,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/avec-budget")
async def calcul_avec_budget_route(params: ParamsAvecBudget, background_tasks: BackgroundTasks):
    try:
        appareils = [a.model_dump() for a in params.appareils]
        appareils_prioritaires = [a for a in appareils if a.get("prioritaire")]
        result = calculer_avec_budget(
            mode=params.mode,
            appareils=appareils,
            budget=params.budget,
            irradiation=params.irradiation,
            latitude=params.latitude,
            appareils_prioritaires=(
                appareils_prioritaires if params.mode == "sbee" else None
            ),
            t_matin=params.t_matin,
            t_midi=params.t_midi,
            t_soir=params.t_soir,
        )
        background_tasks.add_task(
            _save_etude, "avec_budget", params.mode, appareils, result,
            params.irradiation, params.latitude, params.budget,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
