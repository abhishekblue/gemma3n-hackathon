from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class Medicine(BaseModel):
    medicine: str

medicines_db: List[str] = []

@app.get("/")
def read_root():
    return {"message": "Welcome to the medicine API"}

@app.post("/add")
def add_medicine(medicine: Medicine):
    medicines_db.append(medicine.medicine)
    return {"message": "Medicine added successfully"}

@app.get("/medicines")
def get_medicines():
    return {"medicines": medicines_db}
