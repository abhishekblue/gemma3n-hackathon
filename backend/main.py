import os
from contextlib import asynccontextmanager # Import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Dict
from services_audio_processing import process_audio_command
from services_tts_service import generate_piper_speech
from services_ollama_service import generate_ollama_response # Import Ollama service
import logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Cold start vroom...")  
    print("--------------------------------")
    try:
        # Send a dummy request to warm up the Ollama model
        await generate_ollama_response("hello") 
        logging.info("Ollama service warmed up successfully.")
    except Exception as e:
        logging.error(f"Failed to warm up Ollama service: {e}")
    yield # Application startup

app = FastAPI(lifespan=lifespan) # Pass lifespan to FastAPI

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

in_progress_medicine: dict[str, any] = {}

@app.get("/")
def read_root():
    return {"message": "Welcome to the Awaaz Engine"}

@app.post("/awaaz-command")
async def awaaz_command(audio_file: UploadFile = File(...)):
    global in_progress_medicine
    response = await process_audio_command(audio_file, in_progress_medicine)
    return response

@app.post("/text-to-speech")
async def text_to_speech(request: Dict[str, str], background_tasks: BackgroundTasks) -> FileResponse:
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for speech generation.")
    
    try:
        audio_filepath = await generate_piper_speech(text)
        background_tasks.add_task(os.remove, audio_filepath)
        return FileResponse(audio_filepath, media_type="audio/mpeg", filename=os.path.basename(audio_filepath))
    except FileNotFoundError as e:
        logging.error(f"Piper model file error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logging.error(f"Error during Piper TTS generation: {e}")
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {e}")

@app.get("/medicines")
def get_medicines():
    return {"medicines": []}
