import os

# Whisper model configuration
WHISPER_MODEL = "small.en"
WHISPER_DEVICE = "cpu"
WHISPER_COMPUTE_TYPE = "int8"

# Piper model configuration
PIPER_MODEL_DIR = "tts_models"
PIPER_MODEL_NAME = "en_US-hfc_female-medium"
PIPER_MODEL_PATH = os.path.join(PIPER_MODEL_DIR, f"{PIPER_MODEL_NAME}.onnx")
PIPER_CONFIG_PATH = os.path.join(PIPER_MODEL_DIR, f"{PIPER_MODEL_NAME}.onnx.json")

# Ollama API configuration
OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"