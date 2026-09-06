from fastapi import APIRouter
router=APIRouter()
@router.get("/{country_code}/dashboard")
def dashboard(country_code:str): return {"country":country_code,"indicators":[],"gis":[],"quality":"validated-data-required"}
@router.get("/{country_code}/indicators")
def indicators(country_code:str): return {"country":country_code,"indicators":[]}
@router.get("/{country_code}/alerts")
def alerts(country_code:str): return {"country":country_code,"alerts":[]}
