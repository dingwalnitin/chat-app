import os
import base64
import requests
from flask import Flask, request, jsonify, render_template
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
apio = os.getenv("API_KEY")

# Set up OpenAI client
openai_client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=apio  # Retrieve OpenAI API key from environment variable
)

# NVIDIA API details
nvidia_invoke_url = "https://ai.api.nvidia.com/v1/vlm/nvidia/neva-22b"
nvidia_api_key = apio  # Retrieve NVIDIA API key from environment variable
nvidia_stream = False
nvidia_headers = {
    "Authorization": f"Bearer {nvidia_api_key}",
    "Accept": "application/json"
}

# Initialize conversation history
conversation_history = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    selected_model = request.json.get('model', None)
    user_message = request.json.get('message')
    role = request.json.get('role', 'user')
    name = request.json.get('name', None)
    image_data = request.json.get('image_data', None)

    # Add the user message to the conversation history
    conversation_history.append({
        "role": role,
        "name": name,
        "content": user_message
    })

    # If an image is provided, add it to the conversation
    if image_data:
        image_b64 = image_data.split(",")[1]
        conversation_history[-1]["content"] += f' <img src="data:image/png;base64,{image_b64}" />'

    assistant_response = ''

    # Choose the appropriate model based on user selection
    if selected_model == 'nvidia':
        payload = {
            "messages": conversation_history,
            "max_tokens": 1024,
            "temperature": 0.20,
            "top_p": 0.70,
            "seed": 0,
            "stream": nvidia_stream
        }
        response = requests.post(nvidia_invoke_url, headers=nvidia_headers, json=payload)
        if nvidia_stream:
            response_content = ""
            for line in response.iter_lines():
                if line:
                    response_content += line.decode("utf-8")
            assistant_response = response_content
        else:
            assistant_response = response.json().get('choices')[0].get('message', {}).get('content', '')
    elif selected_model == 'openai':
        completion = openai_client.chat.completions.create(
            model="mistralai/mistral-large",
            messages=[{"role": "user", "content": user_message}],
            temperature=0.5,
            top_p=1,
            max_tokens=1024,
            stream=True
        )
        for chunk in completion:
            if chunk.choices[0].delta.content is not None:
                assistant_response += chunk.choices[0].delta.content
    else:
        return jsonify({'error': 'Invalid model selection'})

    # Add the assistant response to the conversation history
    conversation_history.append({
        "role": "assistant",
        "content": assistant_response
    })

    return jsonify({"response": assistant_response})

if __name__ == '__main__':
    app.run(debug=True)
