from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

FOOD_GROUPS=["Cereals","Tubers & Roots","Fruits & Vegetables","Legumes","Oilseeds","Animal-source foods","Other"]

class FoodObservation(BaseModel):
    country_code:str
    food_name:str
    food_group:str
    quantity:float|None=None
    unit:str|None=None
    source:str="manual"
    scanned_code:str|None=None
    image_reference:str|None=None
    lab_result_reference:str|None=None

@router.get("/health/{country_code}")
def health_dashboard(country_code:str):
    return {
      "country":country_code,
      "children_double_burden":{
        "stunting":[],
        "wasting":[],
        "underweight":[],
        "overweight":[],
        "obesity":[]
      },
      "women":{
        "pregnant":[],
        "lactating":[]
      },
      "ncds":{
        "diabetes":[],
        "hypertension":[],
        "cardiovascular":[],
        "cancers":[],
        "kidney_disease":[],
        "other":[],
      },
      "gis":[],"periods":[]
    }

@router.get("/agriculture/{country_code}")
def agriculture_dashboard(country_code:str):
    return {"country":country_code,
            "groups":{g:{"production":[],"consumption":[],"needs":[],"gap":[]} for g in FOOD_GROUPS},
            "periods":[],"regions":[]}

@router.post("/food/observation")
def food_observation(x:FoodObservation):
    return {"status":"accepted","observation":x.model_dump(),
            "next":"validation_and_ontology_matching"}

@router.post("/food/scan")
def food_scan(country_code:str, scan_type:str="food"):
    return {"status":"queued","country":country_code,"scan_type":scan_type,
            "pipeline":["capture","OCR/barcode/vision","ontology_match",
                        "composition_lookup","confidence","human_confirmation"]}

@router.post("/food/lab-result")
def lab_result(country_code:str):
    return {"status":"queued","country":country_code,
            "pipeline":["ingest","method_metadata","quality_control",
                        "ontology_link","provenance","validation"]}

@router.get("/devices/{user_id}")
def connected_devices(user_id:str):
    return {"user_id":user_id,
            "providers":["Apple Health","Health Connect","Bluetooth LE",
                         "CGM/Glucose","Blood Pressure","Wearables"],
            "devices":[]}
