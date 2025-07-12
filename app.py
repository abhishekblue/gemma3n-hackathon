import wave
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import BackgroundTasks
import logging
import io
import httpx
import json
from faster_whisper import WhisperModel
import os
import subprocess
import re
from piper.voice import PiperVoice
import anyio
import uuid

app = FastAPI()

origins = ["*"]
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

# Define Piper model paths
# IMPORTANT: You need to download the Piper voice model (.onnx) and its config file (.onnx.json)
# and place them in a 'tts_models' directory within the 'backend' directory.
# Example: https://github.com/rhasspy/piper/releases/download/2023.11.14-2/en_US-amy-medium.onnx
# and https://github.com/rhasspy/piper/releases/download/2023.11.14-2/en_US-hfc_female.onnx.json
PIPER_MODEL_DIR = "tts_models"
PIPER_MODEL_NAME = "en_US-hfc_female-medium" # Placeholder, replace with the actual model name you download
PIPER_MODEL_PATH = os.path.join(PIPER_MODEL_DIR, f"{PIPER_MODEL_NAME}.onnx")
PIPER_CONFIG_PATH = os.path.join(PIPER_MODEL_DIR, f"{PIPER_MODEL_NAME}.onnx.json")

medicines_storage: List[Dict[str, Any]] = []
in_progress_medicine: Dict[str, Any] = {}

class MedicineLog(BaseModel):
    medicine_name: str
    dosage: str

OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"

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

def remove_emojis(text: str) -> str:
    """Removes emoji characters from a string."""
    # Unicode ranges for various emoji blocks
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE
    )
    return emoji_pattern.sub(r'', text)

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

async def generate_piper_speech(text: str) -> str:
    """Generates speech using Piper TTS and saves it to a file, returning the file path."""
    if not os.path.exists(PIPER_MODEL_PATH) or not os.path.exists(PIPER_CONFIG_PATH):
        raise FileNotFoundError(
            f"Piper model files not found. Please download '{PIPER_MODEL_NAME}.onnx' and "
            f"'{PIPER_MODEL_NAME}.onnx.json' into the '{PIPER_MODEL_DIR}' directory."
        )
    
    # Create a unique filename for the audio output
    output_filename = f"piper_output_{uuid.uuid4().hex}.mp3"
    output_directory = "backend/audio_outputs" # Define a specific directory for audio outputs
    output_filepath = os.path.join(output_directory, output_filename) # Save in the new directory

    def synthesize_and_save():
        # Ensure the output directory exists
        os.makedirs(output_directory, exist_ok=True)

        voice = PiperVoice.load(PIPER_MODEL_PATH)
        
        # Synthesize to a BytesIO object (in-memory WAV)
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2) # 16-bit audio
            wav_file.setframerate(voice.config.sample_rate)
            for audio_bytes in voice.synthesize_stream_raw(text):
                wav_file.writeframes(audio_bytes)
        wav_buffer.seek(0) # Rewind to the beginning for ffmpeg to read

        # Convert WAV (from BytesIO) to MP3 (to file) using ffmpeg
        ffmpeg_command = [
            "ffmpeg",
            "-i", "pipe:0",  # Read input from stdin
            "-codec:a", "libmp3lame",
            "-q:a", "2",     # VBR quality, 2 is good quality
            output_filepath  # Write output to the specified file
        ]
        logging.info(f"Executing FFmpeg command for MP3 conversion to file: {' '.join(ffmpeg_command)}")
        
        process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(input=wav_buffer.getvalue())
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg conversion failed. Stderr: {stderr.decode()}")
        
        logging.info(f"FFmpeg WAV to MP3 conversion successful. Output saved to {output_filepath}")
        return output_filepath # Return the path to the saved file

    output_filepath_result = await anyio.to_thread.run_sync(synthesize_and_save)
    logging.info(f"Generated speech with Piper. Saved to {output_filepath_result}")
    return output_filepath_result

@app.post("/text-to-speech")
async def text_to_speech(request: Dict[str, str], background_tasks: BackgroundTasks) -> FileResponse:
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for speech generation.")

    try:
        cleaned_text = remove_emojis(text) # Sanitize the text
        audio_filepath = await generate_piper_speech(cleaned_text)
        
        # Add a task to delete the file after it's sent
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
    return {"medicines": medicines_storage}
