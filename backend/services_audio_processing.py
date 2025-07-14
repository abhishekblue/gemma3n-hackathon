import subprocess
import logging
import re
import os
import json
import wave
from vosk import Model, KaldiRecognizer
from fastapi import UploadFile, HTTPException
from services_ollama_service import generate_ollama_response

VOSK_MODEL_PATH = "./stt-models/vosk-model-en-us-0.22-lgraph"
vosk_model = Model(VOSK_MODEL_PATH)

async def process_audio_command(audio_file: UploadFile, in_progress_medicine: dict):
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

        # Transcribe audio using Vosk
        wf = wave.open(converted_audio_path, "rb")
        if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
            raise HTTPException(status_code=400, detail="Audio file must be WAV format, mono, 16kHz, 16-bit PCM.")
        
        rec = KaldiRecognizer(vosk_model, wf.getframerate())
        rec.SetWords(True)
        
        transcribed_text = ""
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                transcribed_text += result.get("text", "") + " "
        transcribed_text += json.loads(rec.FinalResult()).get("text", "")
        wf.close()

        logging.info(f"Transcribed audio: {transcribed_text}")
        processed_text = transcribed_text.strip().lower()
        print(f"Processed text: {processed_text}")

        # Check for clear/cancel commands
        if re.search(r'\b(clear|cancel)\b', processed_text):
            in_progress_medicine.clear()
            return {"response_text": "Okay, I've cancelled the current medicine entry.", "is_final": True}

        # Extract medicine details
        extraction_prompt = f"""You are a data extraction and intent recognition tool. From the following text, determine the user's intent. The possible intents are "add_medicine" and "list_medicines".

If the intent is "add_medicine", extract the medicine name, strength, and frequency.
If the intent is "list_medicines", you do not need to extract any other details.

Respond with a JSON object containing the "action" and, if applicable, the "data".

Examples:
Text: "add Paracetamol 500mg twice a day"
Your response: {{"action": "add_medicine", "data": {{"name": "Paracetamol", "strength": "500mg", "frequency": "twice a day"}}}}

Text: "list my medicines"
Your response: {{"action": "list_medicines"}}

Text: "what are my medications"
Your response: {{"action": "list_medicines"}}

Now process this input:
{transcribed_text}"""
        
        extraction_response_text = await generate_ollama_response(extraction_prompt)
        
        try:
            extracted_details = json.loads(extraction_response_text)

            if extracted_details.get("action") == "list_medicines":
                return extracted_details

            if "data" in extracted_details:
                for key, value in extracted_details["data"].items():
                    if value is not None:
                        in_progress_medicine[key] = value
            
            logging.info(f"In-progress medicine: {in_progress_medicine}")

            required_slots = ["name", "strength", "frequency"]
            missing_slots = [slot for slot in required_slots if not in_progress_medicine.get(slot)]

            if not missing_slots:
                logging.info(f"SUCCESS: Processed complete medicine: {in_progress_medicine}")
                
                confirmation_prompt = f"You are Awaaz, a caring health companion. The user has successfully added the medicine '{in_progress_medicine.get('name', 'N/A')}' with strength '{in_progress_medicine.get('strength', 'N/A')}' and frequency '{in_progress_medicine.get('frequency', 'N/A')}'. Generate a warm, reassuring confirmation message of one or two sentences. Do not ask any questions."
                response_text = await generate_ollama_response(confirmation_prompt)
                
                # Prepare the final response with medicine details in 'data'
                final_response = {
                    "action": "add_medicine",
                    "data": in_progress_medicine.copy(), # Include the medicine details here
                    "response_text": response_text,
                    "is_final": True
                }
                in_progress_medicine.clear()
                return final_response
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
