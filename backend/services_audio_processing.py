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

        # Intent classification using Ollama
        intent_prompt = f"""Analyze the following user command and determine the primary intent.
If the user wants to see, list, or inquire about their existing medicines, respond with "list_medicines".
Otherwise, respond with "add_medicine".
Respond only with the intent keyword, no other text or punctuation.

User command: {transcribed_text}"""
        
        intent_response = await generate_ollama_response(intent_prompt)
        
        if intent_response.strip().lower() == "list_medicines":
            in_progress_medicine.clear()
            return {"action": "list_medicines"}

        # Check for clear/cancel commands (moved after list_medicines intent)
        if re.search(r'\b(clear|cancel)\b', processed_text):
            in_progress_medicine.clear()
            return {"response_text": "Okay, I've cancelled the current medicine entry.", "is_final": True}

        # Extract medicine details
        extraction_prompt = f"""You are a data extraction tool. From the following text, extract and return ONLY the medicine name, strength, and an array of specific times mentioned by the user. If any of these details are not mentioned in the text, set their value to null.
        These extracted times should be converted to a standardized 24-hour "HH:MM" string format.
        DO NOT include any other text, explanation, or commentary. Respond ONLY with the JSON object.

Example:
Text: Please remind me to take Paracetamol 500mg at 8 AM and 10 at night
Your response: {{"name": "Paracetamol", "strength": "500mg", "times": ["08:00", "22:00"]}}

Text: amoxicillin
Your response: {{"name": "amoxicillin", "strength": null, "times": []}}
Now process this input:
{transcribed_text}"""
        
        extraction_response_text = await generate_ollama_response(extraction_prompt)
        
        try:
            # Strip whitespace and parse JSON
            extracted_details = json.loads(extraction_response_text.strip())
            
            # Ensure the parsed result is a dictionary
            if not isinstance(extracted_details, dict):
                raise ValueError("Ollama response is not a valid JSON object.")

            for key, value in extracted_details.items():
                if value is not None:
                    in_progress_medicine[key] = value
            logging.info(f"In-progress medicine: {in_progress_medicine}")

            required_slots = ["name", "strength", "times"]
            missing_slots = [slot for slot in required_slots if not in_progress_medicine.get(slot)]

            if not missing_slots:
                logging.info(f"SUCCESS: Processed complete medicine: {in_progress_medicine}")
                print(f"Final extracted medicine object: {in_progress_medicine}") # Added for user feedback
                
                confirmation_prompt = f"You are Awaaz, a caring health companion. The user has successfully added the medicine '{in_progress_medicine.get('name', 'N/A')}' with strength '{in_progress_medicine.get('strength', 'N/A')}' and times '{', '.join(in_progress_medicine.get('times', []))}'. Generate a warm, reassuring confirmation message of one or two sentences. Do not ask any questions."
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
                    "times": "Ask the user for the specific times they need to take this medicine. (e.g., 8 AM, 10 PM)."
                }
                
                follow_up_prompt = f"You are Awaaz, a caring health companion. The user is adding a medicine but some details are missing. {question_map.get(missing_slot, 'Ask for the missing information.')} Keep the question concise and friendly and ask question(s) like you are already in the middle of the conversation and not like you are starting the conversation."
                response_text = await generate_ollama_response(follow_up_prompt)
                return {"response_text": response_text, "is_final": False}

        except json.JSONDecodeError as e:
            logging.error(f"Error parsing JSON from Ollama extraction: {e}")
            
            # Re-evaluate missing slots to provide context-aware follow-up
            required_slots = ["name", "strength", "times"]
            missing_slots = [slot for slot in required_slots if not in_progress_medicine.get(slot)]

            if missing_slots:
                missing_slot = missing_slots[0]
                question_map = {
                    "name": "Ask the user for the name of the medicine.",
                    "strength": "Ask the user for the strength of the medicine (e.g., 500mg).",
                    "times": "Ask the user for the specific times they need to take this medicine. (e.g., 8 AM, 10 PM)."
                }
                follow_up_prompt = f"You are Awaaz, a caring health companion. The user is adding a medicine but some details are missing. {question_map.get(missing_slot, 'Ask for the missing information.')} Keep the question concise and friendly and ask question(s) like you are already in the middle of the conversation and not like you are starting the conversation."
            else:
                # Fallback if no specific missing slot can be identified (e.g., malformed JSON but all slots are technically present)
                follow_up_prompt = f"You are Awaaz, a caring health companion. The user said: '{transcribed_text}'. I couldn't understand the details. Could you please repeat the medicine information? Keep the question concise and friendly and ask question(s) like you are already in the middle of the conversation and not like you are starting the conversation."
            
            response_text = await generate_ollama_response(follow_up_prompt)
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
