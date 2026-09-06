from fastapi import APIRouter
router=APIRouter()
@router.get("/{country_code}")
def practitioners(country_code:str): return {"country":country_code,"practitioners":[]}
@router.post("/review/{recommendation_id}")
def review(recommendation_id:str,decision:str,comments:str=""):
    return {"recommendation_id":recommendation_id,"decision":decision,"comments":comments}
