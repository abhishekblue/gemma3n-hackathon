from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, AsyncIterable
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import logging
import io
import httpx
import json
from faster_whisper import WhisperModel
from TTS.api import TTS

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
model = WhisperModel("base.en", device="cpu", compute_type="int8")

# Initialize Coqui TTS model globally
tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)

medicines_storage: List[Dict[str, Any]] = []
in_progress_medicine: Dict[str, Any] = {}

class MedicineLog(BaseModel):
    medicine_name: str
    dosage: str

OLLAMA_API_URL = "https://symmetrical-invention-vg4pvpjvrvxcprw9-11434.app.github.dev/api/generate"

async def generate_ollama_response(prompt: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OLLAMA_API_URL,
                json={
                    "model": "gemma3n:e2b-it-q4_K_M",
                    "prompt": prompt,
                    "stream": False
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "Sorry, I couldn't generate a response.")
        except httpx.RequestError as e:
            logging.error(f"Error calling Ollama: {e}")
            raise HTTPException(status_code=503, detail="Error communicating with Ollama service")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Awaaz Engine"}

@app.post("/awaaz-command")
async def awaaz_command(audio_file: UploadFile = File(...)):
    global in_progress_medicine
    try:
        audio_bytes = io.BytesIO(await audio_file.read())
        segments, _ = model.transcribe(audio_bytes, beam_size=5)
        transcribed_text = "".join(segment.text for segment in segments)
        logging.info(f"Transcribed audio: {transcribed_text}")
        print (transcribed_text)

        # If the user says "clear" or "cancel", reset the in-progress medicine
        if transcribed_text.strip().lower() in ["clear", "cancel"]:
            in_progress_medicine = {}
            return {"response": "Okay, I've cancelled the current medicine entry."}

        extraction_prompt = f"""You are a data extraction tool. From the following text, extract and return only the medicine name, strength, and frequency as a JSON object with the keys "name", "strength", and "frequency". If any of these details are not mentioned in the text, set their value to null. Respond only with the JSON, with no extra explanation or commentary.

Example:
Text: add Paracetamol 500mg twice a day
Your response: {{"name": "Paracetamol", "strength": "500mg", "frequency": "twice a day"}}

Now process this input:
{transcribed_text}"""
        
        extraction_response_text = await generate_ollama_response(extraction_prompt)
        
        try:
            extracted_details = json.loads(extraction_response_text)
            # Merge extracted details into the in-progress medicine, filtering out nulls
            for key, value in extracted_details.items():
                if value is not None:
                    in_progress_medicine[key] = value
            
            logging.info(f"In-progress medicine: {in_progress_medicine}")

            # Check if all required slots are filled
            required_slots = ["name", "strength", "frequency"]
            missing_slots = [slot for slot in required_slots if not in_progress_medicine.get(slot)]

            if not missing_slots:
                # All slots filled, complete the process
                medicines_storage.append(in_progress_medicine.copy())
                logging.info(f"SUCCESS: Stored complete medicine: {in_progress_medicine}")
                
                confirmation_prompt = f"You are Awaaz, a caring health companion. The user has successfully added the medicine '{in_progress_medicine.get('name', 'N/A')}' with strength '{in_progress_medicine.get('strength', 'N/A')}' and frequency '{in_progress_medicine.get('frequency', 'N/A')}'. Generate a warm, reassuring confirmation message of one or two sentences. Do not ask any questions."
                response_text = await generate_ollama_response(confirmation_prompt)
                
                # Clear the in-progress medicine for the next conversation
                in_progress_medicine = {}
                return {"response": response_text}
            else:
                # Slots are missing, generate a follow-up question
                missing_slot = missing_slots[0]
                question_map = {
                    "name": "Ask the user for the name of the medicine.",
                    "strength": "Ask the user for the strength of the medicine (e.g., 500mg).",
                    "frequency": "Ask the user how many times a day they need to take this medicine."
                }
                
                follow_up_prompt = f"You are Awaaz, a caring health companion. The user is adding a medicine but some details are missing. {question_map.get(missing_slot, 'Ask for the missing information.')} Keep the question concise and friendly."
                response_text = await generate_ollama_response(follow_up_prompt)
                return {"response": response_text}

        except json.JSONDecodeError as e:
            logging.error(f"Error parsing JSON from Ollama extraction: {e}")
            # If JSON parsing fails, ask a generic clarifying question
            prompt = f"You are Awaaz, a caring health companion. The user said: '{transcribed_text}'. You couldn't understand the details. Ask the user to please repeat the medicine information."
            response_text = await generate_ollama_response(prompt)
            return {"response": response_text}

    except Exception as e:
        logging.error(f"Error during processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/text-to-speech")
async def text_to_speech(request: Dict[str, str]) -> StreamingResponse:
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for speech generation.")

    async def generate_audio_chunks() -> AsyncIterable[bytes]:
        audio_stream = tts_model.tts_stream(text)
        buffer = io.BytesIO()
        for chunk in audio_stream:
            buffer.write(chunk)
            buffer.seek(0)
            yield buffer.read()
            buffer.seek(0)
            buffer.truncate(0)

    return StreamingResponse(generate_audio_chunks(), media_type="audio/wav")

@app.get("/medicines")
def get_medicines():
    return {"medicines": medicines_storage}
