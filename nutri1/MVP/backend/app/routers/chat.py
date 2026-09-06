from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()

class Message(BaseModel):
    thread_id:str
    message:str

@router.post("/threads")
def thread(user_id:str,nutritionist_id:str):
    return {"thread_id":"pending","user_id":user_id,"nutritionist_id":nutritionist_id,"status":"open"}

@router.post("/messages")
def message(x:Message):
    return {"thread_id":x.thread_id,"status":"queued","message":x.message}

@router.get("/threads/{user_id}")
def threads(user_id:str):
    return {"user_id":user_id,"threads":[]}
