from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import logging # FIX #1: Added missing import

app = FastAPI()

origins = [
    "https://symmetrical-invention-vg4pvpjvrvxcprw9-8081.app.github.dev",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MedicineLog(BaseModel):
    medicine_name: str
    dosage: str

# This list is from your old code, keeping it for now.
medicines_db: List[str] = []

@app.get("/")
def read_root():
    return {"message": "Welcome to the Awaaz Engine"}

# FIX #2: Renamed endpoint from "/add" to "/add_medicine_log" to match the frontend call
@app.post("/add_medicine_log")
async def add_medicine_log(log: MedicineLog):
    # For now, we just print to the console to confirm we received it
    print(f"SUCCESS: Received medicine log: {log.dict()}")
    # The logging call will now work correctly
    logging.info(f"SUCCESS: Received medicine log: {log.dict()}")
    return {"status": "success", "data_received": log.dict()}

@app.get("/medicines")
def get_medicines():
    return {"medicines": medicines_db}