from fastapi import APIRouter, UploadFile, File
router=APIRouter()

@router.post("/food")
async def food_scan(image:UploadFile=File(...),country_code:str="TG",locale:str="fr"):
    return {"scanner":"food","country":country_code,"locale":locale,
            "filename":image.filename,"status":"queued",
            "pipeline":["quality","classification","ontology","portion","composition","confidence","confirmation"],
            "result":None}

@router.post("/meal")
async def meal_scan(image:UploadFile=File(...),country_code:str="TG",locale:str="fr"):
    return {"scanner":"meal","country":country_code,"locale":locale,
            "filename":image.filename,"status":"queued",
            "pipeline":["dish_detection","recipe_retrieval","ingredients","portion","nutrients","confidence","confirmation"],
            "result":None}

@router.post("/text-food")
async def text_food(name:str,country_code:str="TG",locale:str="fr"):
    return {"input":name,"country":country_code,"resolved_food":None,"candidates":[]}
