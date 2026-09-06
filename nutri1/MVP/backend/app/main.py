from fastapi import FastAPI
from .routers import citizen, scanner, health, agriculture, data, practitioners, marketplace, prevention
from .routers import profile, payments, appointments, chat, languages, unified, national_intelligence, devices

app=FastAPI(title="NUTRI.N°1 Unified Africa Platform",version="15.0.0")
app.include_router(citizen.router,prefix="/api/v1/citizen",tags=["Citizen"])
app.include_router(profile.router,prefix="/api/v1/profile",tags=["Profile & Dashboard"])
app.include_router(scanner.router,prefix="/api/v1/scanner",tags=["AI Scanners"])
app.include_router(prevention.router,prefix="/api/v1/prevention",tags=["Prevention"])
app.include_router(health.router,prefix="/api/v1/government/health",tags=["Ministry of Health"])
app.include_router(agriculture.router,prefix="/api/v1/government/agriculture",tags=["Ministry of Agriculture"])
app.include_router(data.router,prefix="/api/v1/data",tags=["African Data Cloud"])
app.include_router(practitioners.router,prefix="/api/v1/practitioners",tags=["Nutritionist Network"])
app.include_router(marketplace.router,prefix="/api/v1/marketplace",tags=["Marketplace"])
app.include_router(payments.router,prefix="/api/v1/payments",tags=["Payments"])
app.include_router(appointments.router,prefix="/api/v1/appointments",tags=["Appointments"])
app.include_router(chat.router,prefix="/api/v1/chat",tags=["Nutritionist Chat"])
app.include_router(languages.router,prefix="/api/v1/languages",tags=["Languages"])

@app.get("/health")
def health(): return {"status":"ok","version":"14.0.0","platform":"NUTRI.N°1 Unified Africa"}

app.include_router(unified.router,prefix="/api/v1/unified",tags=["Unified Platform"])\n
app.include_router(national_intelligence.router,prefix="/api/v1/national",tags=["National Intelligence"])
app.include_router(devices.router,prefix="/api/v1/devices",tags=["Connected Devices"])