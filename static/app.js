const chatHistory = document.querySelector('.chat-history');
const userInput = document.querySelector('#user-input');
const sendButton = document.querySelector('#send-button');
const modelSelect = document.querySelector('#model-select');
const imageInput = document.querySelector('#image-input');
const imageButton = document.querySelector('#image-button');

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keyup', function(event) {
  if (event.keyCode === 13) {
    sendMessage();
  }
});

imageButton.addEventListener('click', function() {
  imageInput.click();
});

imageInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function() {
    const imageData = reader.result;
    userInput.value += `<img src="${imageData}" width="50" height="50" />`;
  }
  reader.readAsDataURL(file);
});

function sendMessage() {
  const userMessage = userInput.value.trim();
  if (userMessage) {
    const imgRegex = /<img\ssrc="([^"]+)"\s\/>/g;
    const images = userMessage.match(imgRegex);
    if (images) {
      images.forEach(img => {
        const base64Data = img.match(/data:image\/([^;]+);base64,(.+)/)[2];
        const binaryData = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: 'image/png' });
        const file = new File([blob], 'image.png', { type: 'image/png' });
        const reader = new FileReader();
        reader.onload = function() {
          const imageData = reader.result;
          addMessageToHistory('user', userMessage.replace(img, ''));
          userInput.value = '';
          const selectedModel = modelSelect.value;
          const data = { model: selectedModel, message: userMessage, image_data: imageData };
          sendMessageToServer(data);
        }
        reader.readAsDataURL(file);
      });
    } else {
      addMessageToHistory('user', userMessage);
      userInput.value = '';
      const selectedModel = modelSelect.value;
      const data = { model: selectedModel, message: userMessage };
      sendMessageToServer(data);
    }
  }
}

function sendMessageToServer(data) {
  fetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      addMessageToHistory('error', data.error);
    } else {
      addMessageToHistory('assistant', data.response);
    }
  })
  .catch(error => {
    addMessageToHistory('error', 'An error occurred while processing your request.');
    console.error('Error:', error);
  });
}

function addMessageToHistory(role, message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add(role === 'user' ? 'user-message' : 'assistant-message');
  if (role === 'assistant') {
    const html = marked.parse(message);
    messageElement.innerHTML = html;
  } else {
    messageElement.innerHTML = message;
  }
  chatHistory.appendChild(messageElement);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}