from fastapi import APIRouter
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])


@router.get("/stats")
def get_stats():
    supabase = get_supabase()
    nb_etudes = 0
    nb_utilisateurs = 0
    try:
        res = supabase.table("etudes_particulier").select("id", count="exact").execute()
        nb_etudes = res.count or 0
    except Exception:
        pass
    try:
        res = supabase.table("profiles").select("id", count="exact").execute()
        nb_utilisateurs = res.count or 0
    except Exception:
        pass
    return {"nb_utilisateurs": nb_utilisateurs, "nb_etudes": nb_etudes}


@router.get("/etudes")
def get_etudes():
    supabase = get_supabase()
    try:
        res = (
            supabase.table("etudes_particulier")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


@router.get("/utilisateurs")
def get_utilisateurs():
    supabase = get_supabase()
    try:
        res = (
            supabase.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []
