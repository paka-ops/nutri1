from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

class Profile(BaseModel):
    country_code:str
    language_code:str
    goals:dict={}
    timezone:str="Africa/Lome"

class Anthropometry(BaseModel):
    measured_at:str
    sex:str|None=None
    age_years:float|None=None
    weight_kg:float|None=None
    height_cm:float|None=None
    waist_cm:float|None=None
    hip_cm:float|None=None
    body_fat_pct:float|None=None

@router.put("/{user_id}")
def update_profile(user_id:str,x:Profile):
    return {"user_id":user_id,"profile":x.model_dump(),"status":"saved"}

@router.post("/{user_id}/anthropometry")
def add_anthropometry(user_id:str,x:Anthropometry):
    bmi=None; whr=None; whtr=None
    if x.weight_kg and x.height_cm and x.height_cm>0:
        bmi=round(x.weight_kg/(x.height_cm/100)**2,2)
    if x.waist_cm and x.hip_cm and x.hip_cm>0:
        whr=round(x.waist_cm/x.hip_cm,3)
    if x.waist_cm and x.height_cm and x.height_cm>0:
        whtr=round(x.waist_cm/x.height_cm,3)
    return {"user_id":user_id,"derived":{"bmi":bmi,"waist_hip_ratio":whr,"waist_height_ratio":whtr},
            "status":"saved"}

@router.get("/{user_id}/dashboard")
def dashboard(user_id:str,days:int=90):
    return {"user_id":user_id,"days":days,
            "series":{"weight":[],"bmi":[],"waist":[],"glucose":[],"systolic":[],"diastolic":[]},
            "latest":{},"goals":[],"alerts":[]}
