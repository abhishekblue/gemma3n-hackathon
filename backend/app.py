from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, AsyncIterable
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import logging
import io
import httpx
import json
import torch
import numpy as np
import soundfile as sf
from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
from faster_whisper import WhisperModel
import os
import subprocess
import re # Import the re module

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
model = WhisperModel("small.en", device="cpu", compute_type="int8")

# Initialize Hugging Face SpeechT5 models globally
processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
model_tts = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")
vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")

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
    temp_audio_path = "temp_audio.webm"
    converted_audio_path = "converted_audio.wav"

    try:
        # Save the uploaded audio file temporarily
        with open(temp_audio_path, "wb") as f:
            f.write(await audio_file.read())

        # Convert the audio file using ffmpeg
        # -i: input file
        # -ar 16000: set audio sampling rate to 16000 Hz
        # -ac 1: set number of audio channels to 1 (mono)
        # -acodec pcm_s16le: set audio codec to 16-bit signed little-endian PCM (WAV compatible)
        ffmpeg_command = [
            "ffmpeg",
            "-i", temp_audio_path,
            "-ar", "16000",
            "-ac", "1",
            "-acodec", "pcm_s16le",
            converted_audio_path
        ]
        
        logging.info(f"Executing FFmpeg command: {' '.join(ffmpeg_command)}")
        subprocess.run(ffmpeg_command, check=True, capture_output=True)
        logging.info("FFmpeg conversion successful.")

        # Read the converted audio file for transcription
        with open(converted_audio_path, "rb") as f:
            audio_bytes = io.BytesIO(f.read())

        segments, _ = model.transcribe(audio_bytes, beam_size=5)
        transcribed_text = "".join(segment.text for segment in segments)
        logging.info(f"Transcribed audio: {transcribed_text}")
        processed_text = transcribed_text.strip().lower()
        print(processed_text)

        # Use regex to check for "clear" or "cancel" as whole words, ignoring punctuation
        if re.search(r'\b(clear|cancel)\b', processed_text):
            in_progress_medicine = {}
            return {"response_text": "Okay, I've cancelled the current medicine entry.", "is_final": True}

        extraction_prompt = f"""You are a data extraction tool. From the following text, extract and return only the medicine name, strength, and frequency as a JSON object with the keys "name", "strength", and "frequency". If any of these details are not mentioned in the text, set their value to null. Respond only with the JSON, with no extra explanation or commentary.

Example:
Text: add Paracetamol 500mg twice a day
Your response: {{"name": "Paracetamol", "strength": "500mg", "frequency": "twice a day"}}
Few points to consider:
- "If the user says 'one', the frequency is 'once a day'."
- "If the user says 'three times', the frequency is 'three times a day'."
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
                return {"response_text": response_text, "is_final": True}
            else:
                # Slots are missing, generate a follow-up question
                missing_slot = missing_slots[0]
                question_map = {
                    "name": "Ask the user for the name of the medicine.",
                    "strength": "Ask the user for the strength of the medicine (e.g., 500mg).",
                    "frequency": "Ask the user how many times a day they need to take this medicine."
                }
                
                follow_up_prompt = f"You are Awaaz, a caring health companion. The user is adding a medicine but some details are missing. {question_map.get(missing_slot, 'Ask for the missing information.')} Keep the question concise and friendly and ask question(s) like you are already in the middle of the conversation and not like you are starting the conversation."
                response_text = await generate_ollama_response(follow_up_prompt)
                return {"response_text": response_text, "is_final": False}

        except json.JSONDecodeError as e:
            logging.error(f"Error parsing JSON from Ollama extraction: {e}")
            # If JSON parsing fails, ask a generic clarifying question
            prompt = f"You are Awaaz, a caring health companion. The user said: '{transcribed_text}'. You couldn't understand the details. Ask the user to please repeat the medicine information. And ask question(s) like you are already in the middle of the conversation and not like you are starting the conversation."
            response_text = await generate_ollama_response(prompt)
            return {"response_text": response_text, "is_final": False}

    except subprocess.CalledProcessError as e:
        logging.error(f"FFmpeg error: {e.stderr.decode()}")
        raise HTTPException(status_code=500, detail=f"Audio conversion failed: {e.stderr.decode()}")
    except Exception as e:
        logging.error(f"Error during processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary files
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            logging.info(f"Cleaned up {temp_audio_path}")
        if os.path.exists(converted_audio_path):
            os.remove(converted_audio_path)
            logging.info(f"Cleaned up {converted_audio_path}")

@app.post("/text-to-speech")
async def text_to_speech(request: Dict[str, str]) -> StreamingResponse:
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for speech generation.")

    inputs = processor(text=text, return_tensors="pt")
    # Use a default speaker embedding (e.g., a zero tensor or a pre-defined one if available)
    # For SpeechT5, a common approach for a default voice is to use a zero tensor or a specific pre-trained embedding.
    # Here, we'll create a dummy one for demonstration. In a real scenario, you'd use a proper default.
    # A common size for SpeechT5 speaker embeddings is 512.
    dummy_speaker_embeddings = torch.zeros((1, 512)) # Example: a zero tensor as a placeholder
    speech = model_tts.generate_speech(inputs["input_ids"], dummy_speaker_embeddings, vocoder=vocoder)

    # Convert the tensor to a numpy array and normalize to 16-bit PCM
    speech_np = speech.cpu().numpy()
    speech_np = (speech_np * 32767).astype(np.int16) # Normalize to 16-bit PCM

    buffer = io.BytesIO()
    sf.write(buffer, speech_np, samplerate=16000, format='WAV')
    buffer.seek(0)

    async def generate_audio_chunks() -> AsyncIterable[bytes]:
        yield buffer.read()

    return StreamingResponse(generate_audio_chunks(), media_type="audio/wav")

@app.get("/medicines")
def get_medicines():
    return {"medicines": medicines_storage}
