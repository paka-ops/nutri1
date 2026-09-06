from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

class PaymentRequest(BaseModel):
    user_id:str
    provider_code:str
    amount:float
    currency:str="XOF"
    product_code:str

@router.get("/methods/{country_code}")
def methods(country_code:str):
    methods=[{"code":"CARD","name":"Bank Card","type":"card"}]
    if country_code.upper()=="TG":
        methods += [
            {"code":"MIXX_BY_YAS","name":"Mixx by Yas","type":"mobile_money"},
            {"code":"FLOOZ","name":"Flooz","type":"mobile_money"}
        ]
    return {"country":country_code,"methods":methods}

@router.post("/checkout")
def checkout(x:PaymentRequest):
    return {"status":"initiated","provider":x.provider_code,
            "amount":x.amount,"currency":x.currency,
            "next_action":"redirect_or_provider_confirmation",
            "transaction_reference":"PENDING_PROVIDER_REFERENCE"}

@router.get("/transactions/{user_id}")
def transactions(user_id:str):
    return {"user_id":user_id,"transactions":[]}
