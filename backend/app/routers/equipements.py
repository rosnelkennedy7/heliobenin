from fastapi import APIRouter
from ..moteur.loader import load_all_equipements

router = APIRouter(tags=["equipements"])


@router.get("/api/equipements")
def get_equipements():
    return load_all_equipements()


@router.get("/api/debug/equipements")
def debug_equipements():
    data = load_all_equipements()
    batteries = data.get("batteries", [])
    return {
        "nb_batteries": len(batteries),
        "premieres_cles": list(batteries[0].keys()) if batteries else [],
        "premieres_batteries": batteries[:3],
        "technologies": list(set(
            b.get("Technologie", "") or b.get("technologie", "")
            for b in batteries
        )),
        "tensions": list(set(
            b.get("Tension (V)", "") or b.get("tension", "")
            for b in batteries
        )),
    }
