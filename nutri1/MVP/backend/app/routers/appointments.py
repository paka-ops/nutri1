from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

class AppointmentRequest(BaseModel):
    user_id:str
    nutritionist_id:str
    scheduled_start:str
    scheduled_end:str
    mode:str="video"
    topic:str=""
    notes:str=""

@router.get("/nutritionists/{country_code}")
def nutritionists(country_code:str,language:str|None=None,specialty:str|None=None):
    return {"country":country_code,"language":language,"specialty":specialty,
            "nutritionists":[]}

@router.get("/availability/{nutritionist_id}")
def availability(nutritionist_id:str,date:str):
    return {"nutritionist_id":nutritionist_id,"date":date,"slots":[]}

@router.post("/request")
def request(x:AppointmentRequest):
    return {"status":"requested","appointment":x.model_dump()}

@router.get("/user/{user_id}")
def user_appointments(user_id:str):
    return {"user_id":user_id,"appointments":[]}

@router.post("/{appointment_id}/cancel")
def cancel(appointment_id:str):
    return {"appointment_id":appointment_id,"status":"cancelled"}
