import httpx
import logging
from fastapi import HTTPException
from config import OLLAMA_API_URL

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