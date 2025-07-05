from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import logging
import io
from faster_whisper import WhisperModel

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

# Initialize Whisper model globally to load it once
# You can choose "tiny.en" or "base.en" based on your needs.
# "tiny.en" is faster but less accurate, "base.en" is slower but more accurate.
model = WhisperModel("tiny.en", device="cpu", compute_type="int8")

class MedicineLog(BaseModel):
    medicine_name: str
    dosage: str

class GenerateRequest(BaseModel):
    prompt: str

# This list is from your old code, keeping it for now.
medicines_db: List[str] = []

@app.get("/")
def read_root():
    return {"message": "Welcome to the Awaaz Engine"}

@app.post("/add_medicine_log")
async def add_medicine_log(log: MedicineLog):
    print(f"SUCCESS: Received medicine log: {log.dict()}")
    logging.info(f"SUCCESS: Received medicine log: {log.dict()}")
    return {"status": "success", "data_received": log.dict()}

@app.get("/medicines")
def get_medicines():
    return {"medicines": medicines_db}

@app.post("/generate-response")
async def generate_response():
    return {"response": "Medicine added. Please remember to take care of yourself. I'm here if you need anything."}

@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    try:
        # Read the audio file into a BytesIO object
        audio_bytes = io.BytesIO(await audio_file.read())

        # Transcribe the audio
        segments, info = model.transcribe(audio_bytes, beam_size=5)

        transcription = ""
        for segment in segments:
            transcription += segment.text

        return {"transcription": transcription}
    except Exception as e:
        logging.error(f"Error during transcription: {e}")
        return {"error": str(e)}, 500
