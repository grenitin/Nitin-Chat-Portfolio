import os
import requests
import json
from dotenv import load_dotenv

# Load API key
load_dotenv('.env')
api_key = os.environ.get('OPENAI_API_KEY')

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

def generate_tts(text, filename):
    print(f"Generating audio for: '{text}' -> {filename}")
    data = {
        "model": "tts-1",
        "voice": "onyx",
        "input": text,
        "speed": 1.15,
        "response_format": "mp3"
    }
    
    response = requests.post('https://api.openai.com/v1/audio/speech', headers=headers, json=data)
    
    if response.status_code == 200:
        with open(filename, 'wb') as f:
            f.write(response.content)
        print(f"Successfully saved {filename}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

generate_tts("Here is Nitin's latest resume for your reference:", "assets/audio/resume_v2.mp3")
generate_tts("Here is a glimpse of Nitin's UI Design", "assets/audio/ui_design.mp3")
