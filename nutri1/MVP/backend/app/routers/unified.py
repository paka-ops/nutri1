from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

@router.get("/user/{user_id}/360")
def user_360(user_id:str):
    return {
      "user_id":user_id,
      "profile":{},
      "anthropometry":{},
      "metabolic":{},
      "clinical":{},
      "nutrition":{},
      "activity":{},
      "sleep":{},
      "goals":[],
      "alerts":[],
      "recommendations":[],
      "appointments":[],
      "subscription":{},
      "country_intelligence":{}
    }

@router.get("/country/{country_code}/intelligence")
def country_intelligence(country_code:str):
    return {
      "country":country_code,
      "languages":[],
      "foods":[],
      "recipes":[],
      "consumption":[],
      "production":[],
      "food_balance":[],
      "health_indicators":[],
      "gis_layers":[]
    }

@router.get("/platform/summary")
def platform_summary():
    return {
      "modules":["citizen","food_ai","prevention","nutritionists","payments",
                 "food_cloud","health_government","agriculture_government",
                 "research","marketplace"],
      "countries":"country-aware",
      "languages":"official + local",
      "version":"15.0.0"
    }
