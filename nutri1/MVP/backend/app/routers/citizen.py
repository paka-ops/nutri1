from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()
class Anthropometry(BaseModel):
    sex:str|None=None
    age_years:float|None=None
    weight_kg:float|None=None
    height_cm:float|None=None
    waist_cm:float|None=None
    hip_cm:float|None=None

@router.post("/anthropometry")
def anthropometry(x:Anthropometry):
    bmi=None; whr=None; whtr=None
    if x.weight_kg and x.height_cm and x.height_cm>0:
        bmi=round(x.weight_kg/(x.height_cm/100)**2,2)
    if x.waist_cm and x.hip_cm and x.hip_cm>0:
        whr=round(x.waist_cm/x.hip_cm,3)
    if x.waist_cm and x.height_cm and x.height_cm>0:
        whtr=round(x.waist_cm/x.height_cm,3)
    return {"inputs":x.model_dump(),"derived":{"bmi":bmi,"waist_hip_ratio":whr,"waist_height_ratio":whtr}}

@router.get("/{user_id}/dashboard")
def dashboard(user_id:str):
    return {"user_id":user_id,"anthropometry":[],"metabolic":[],"nutrition":[],"recommendations":[]}
