from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

class DeviceConnect(BaseModel):
    user_id:str
    provider:str
    device_type:str
    device_id:str|None=None

@router.get("/catalog")
def catalog():
    return {"categories":[
      {"code":"health_platform","examples":["Apple Health","Health Connect"]},
      {"code":"wearable","examples":["smartwatch","fitness band"]},
      {"code":"glucose","examples":["glucometer","CGM"]},
      {"code":"blood_pressure","examples":["Bluetooth BP monitor"]},
      {"code":"body_composition","examples":["smart scale"]},
      {"code":"lab","examples":["lab result import"]}
    ]}

@router.post("/connect")
def connect(x:DeviceConnect):
    return {"status":"authorization_required","connection":x.model_dump(),
            "next":["provider_authorization","secure_token_storage","background_sync"]}

@router.post("/sync/{connection_id}")
def sync(connection_id:str):
    return {"connection_id":connection_id,"status":"sync_queued"}

@router.delete("/{connection_id}")
def disconnect(connection_id:str):
    return {"connection_id":connection_id,"status":"disconnected"}
