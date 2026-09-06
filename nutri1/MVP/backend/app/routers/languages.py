from fastapi import APIRouter
router=APIRouter()

PACKS={
"TG":[
 {"code":"fr","name":"Français","type":"official","coverage":100},
 {"code":"ee","name":"Eʋegbe / Ewe","type":"local","coverage":0},
 {"code":"kb","name":"Kabyè","type":"local","coverage":0},
 {"code":"tem","name":"Tem","type":"local","coverage":0},
 {"code":"mina","name":"Mina","type":"local","coverage":0},
 {"code":"kot","name":"Kotokoli","type":"local","coverage":0}],
"GH":[{"code":"en","name":"English","type":"official","coverage":100},{"code":"tw","name":"Twi","type":"local","coverage":0},{"code":"ee","name":"Ewe","type":"local","coverage":0}],
"NG":[{"code":"en","name":"English","type":"official","coverage":100},{"code":"ha","name":"Hausa","type":"local","coverage":0},{"code":"yo","name":"Yoruba","type":"local","coverage":0},{"code":"ig","name":"Igbo","type":"local","coverage":0}]
}

@router.get("/{country_code}")
def languages(country_code:str):
    return {"country":country_code.upper(),"languages":PACKS.get(country_code.upper(),[])}
