from fastapi import APIRouter
router=APIRouter()
@router.get("/foods/{country_code}")
def foods(country_code:str,query:str|None=None): return {"country":country_code,"query":query,"foods":[]}
@router.get("/recipes/{country_code}")
def recipes(country_code:str,query:str|None=None): return {"country":country_code,"query":query,"recipes":[]}
@router.get("/languages/{country_code}")
def languages(country_code:str): return {"country":country_code,"languages":[]}
@router.get("/composition/{food_id}")
def composition(food_id:str): return {"food_id":food_id,"nutrients":[],"provenance":[]}
