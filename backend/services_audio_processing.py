from faster_whisper import WhisperModel
import subprocess
import io
import logging
import re
import os
from fastapi import UploadFile, HTTPException
from services_ollama_service import generate_ollama_response
from config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
import json

model = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)

async def process_audio_command(audio_file: UploadFile, in_progress_medicine: dict, medicines_storage: list):
    temp_audio_path = "temp_audio.webm"
    converted_audio_path = "converted_audio.wav"

    try:
        # Save uploaded audio
        with open(temp_audio_path, "wb") as f:
            f.write(await audio_file.read())

        # Convert audio using ffmpeg
        ffmpeg_command = [
            "ffmpeg", "-i", temp_audio_path, "-ar", "16000", "-ac", "1",
            "-acodec", "pcm_s16le", converted_audio_path
        ]
        logging.info(f"Executing FFmpeg command: {' '.join(ffmpeg_command)}")
        subprocess.run(ffmpeg_command, check=True, capture_output=True)
        logging.info("FFmpeg conversion successful.")

        # Transcribe audio
        with open(converted_audio_path, "rb") as f:
            audio_bytes = io.BytesIO(f.read())
        segments, _ = model.transcribe(audio_bytes, beam_size=5)
        transcribed_text = "".join(segment.text for segment in segments)
        logging.info(f"Transcribed audio: {transcribed_text}")
        processed_text = transcribed_text.strip().lower()

        # Check for clear/cancel commands
        if re.search(r'\b(clear|cancel)\b', processed_text):
            in_progress_medicine.clear()
            return {"response_text": "Okay, I've cancelled the current medicine entry.", "is_final": True}

        # Extract medicine details
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
            for key, value in extracted_details.items():
                if value is not None:
                    in_progress_medicine[key] = value
            logging.info(f"In-progress medicine: {in_progress_medicine}")

            required_slots = ["name", "strength", "frequency"]
            missing_slots = [slot for slot in required_slots if not in_progress_medicine.get(slot)]

            if not missing_slots:
                medicines_storage.append(in_progress_medicine.copy())
                logging.info(f"SUCCESS: Stored complete medicine: {in_progress_medicine}")
                
                confirmation_prompt = f"You are Awaaz, a caring health companion. The user has successfully added the medicine '{in_progress_medicine.get('name', 'N/A')}' with strength '{in_progress_medicine.get('strength', 'N/A')}' and frequency '{in_progress_medicine.get('frequency', 'N/A')}'. Generate a warm, reassuring confirmation message of one or two sentences. Do not ask any questions."
                response_text = await generate_ollama_response(confirmation_prompt)
                in_progress_medicine.clear()
                return {"response_text": response_text, "is_final": True}
            else:
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
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            logging.info(f"Cleaned up {temp_audio_path}")
        if os.path.exists(converted_audio_path):
            os.remove(converted_audio_path)
            logging.info(f"Cleaned up {converted_audio_path}")