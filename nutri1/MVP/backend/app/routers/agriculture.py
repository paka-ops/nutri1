from fastapi import APIRouter
router=APIRouter()
@router.get("/{country_code}/food-balance")
def balance(country_code:str): return {"country":country_code,"records":[]}
@router.get("/{country_code}/production")
def production(country_code:str): return {"country":country_code,"records":[]}
@router.get("/{country_code}/consumption")
def consumption(country_code:str): return {"country":country_code,"records":[]}
@router.get("/{country_code}/needs")
def needs(country_code:str): return {"country":country_code,"records":[]}
