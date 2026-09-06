from fastapi import APIRouter
router=APIRouter()
@router.get("/products/{country_code}")
def products(country_code:str): return {"country":country_code,"products":[]}
@router.get("/api-catalog")
def api_catalog(): return {"apis":["food","composition","recipes","consumption","production","health","gis","evidence"]}
