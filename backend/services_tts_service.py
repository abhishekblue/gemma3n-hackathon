import os
import uuid
import io
import subprocess
import logging
import wave
from piper.voice import PiperVoice
import anyio
from config import PIPER_MODEL_DIR, PIPER_MODEL_PATH, PIPER_MODEL_NAME, PIPER_CONFIG_PATH
from utils_helpers import remove_emojis

async def generate_piper_speech(text: str) -> str:
    if not os.path.exists(PIPER_MODEL_PATH) or not os.path.exists(PIPER_CONFIG_PATH):
        raise FileNotFoundError(
            f"Piper model files not found. Please download '{PIPER_MODEL_NAME}.onnx' and "
            f"'{PIPER_MODEL_NAME}.onnx.json' into the '{PIPER_MODEL_DIR}' directory."
        )
    
    output_filename = f"piper_output_{uuid.uuid4().hex}.mp3"
    output_directory = "backend/audio_outputs"
    output_filepath = os.path.join(output_directory, output_filename)

    def synthesize_and_save():
        os.makedirs(output_directory, exist_ok=True)
        voice = PiperVoice.load(PIPER_MODEL_PATH)
        
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(voice.config.sample_rate)
            for audio_bytes in voice.synthesize_stream_raw(remove_emojis(text)):
                wav_file.writeframes(audio_bytes)
        wav_buffer.seek(0)

        ffmpeg_command = [
            "ffmpeg", "-i", "pipe:0", "-codec:a", "libmp3lame",
            "-q:a", "2", output_filepath
        ]
        logging.info(f"Executing FFmpeg command for MP3 conversion to file: {' '.join(ffmpeg_command)}")
        
        process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(input=wav_buffer.getvalue())
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg conversion failed. Stderr: {stderr.decode()}")
        
        logging.info(f"FFmpeg WAV to MP3 conversion successful. Output saved to {output_filepath}")
        return output_filepath

    output_filepath_result = await anyio.to_thread.run_sync(synthesize_and_save)
    logging.info(f"Generated speech with Piper. Saved to {output_filepath_result}")
    return output_filepath_result