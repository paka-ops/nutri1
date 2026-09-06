from fastapi import APIRouter
router=APIRouter()

@router.get("/{user_id}/plan")
def plan(user_id:str,country_code:str="TG"):
    return {"user_id":user_id,"country":country_code,
            "inputs":["diet","anthropometry","metabolic","clinical","activity","sleep","goals"],
            "recommendations":[],"risk_signals":[],"evidence":[],"model_version":"pending",
            "professional_review_available":True,"diagnosis":False}

@router.get("/{user_id}/malnutrition")
def malnutrition(user_id:str):
    return {"user_id":user_id,"screening":[],"referral_needed":False,
            "protocol":"country-specific validated protocol required"}

@router.get("/{user_id}/ncd")
def ncd(user_id:str):
    return {"user_id":user_id,"domains":["diabetes","hypertension","cardiovascular","cancer-related nutrition risk context"],
            "risk_signals":[],"not_diagnostic":True}
