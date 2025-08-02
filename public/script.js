const socket = io();
let name = localStorage.getItem("name");
let roomId = localStorage.getItem("roomId");

if (!name || !roomId) {
  roomId = prompt("Enter Room ID:");
  name = prompt("Enter Your Name:");
  localStorage.setItem("name", name);
  localStorage.setItem("roomId", roomId);
}

document.getElementById("roomDisplay").textContent = roomId;
socket.emit("join-room", { roomId, name });

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const chatForm = document.getElementById("chat-form");

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text) {
    const time = new Date().toISOString();
    const message = { name, text, time };
    lastSentTime = time;
    socket.emit("chat-message", message);
    appendMessage(message, true);
    messageInput.value = "";
  }
});

let lastSentTime = null;
function recentlySent(message) {
  return lastSentTime && message.time === lastSentTime;
}

socket.on("chat-message", (msg) => {
  const justSent = msg.name === name && recentlySent(msg);
  if (!justSent) appendMessage(msg, msg.name === name);
});

function appendMessage({ name: sender, text, time }, isSelf) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper");
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", isSelf ? "sent" : "received");
  const timestamp = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `<strong>${sender}</strong><br>${text}<div class="timestamp">${timestamp}</div>`;
  wrapper.appendChild(msgDiv);
  chatArea.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// MetaMask
async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];
      document.getElementById("walletDisplay").textContent = walletAddress;
      localStorage.setItem("wallet", walletAddress);
    } catch (err) {
      console.error("Wallet connection failed", err);
    }
  } else {
    alert("MetaMask not detected");
  }
}

// File Upload
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit("file-message", {
      name,
      time: new Date().toISOString(),
      filename: file.name,
      data: reader.result,
      type: file.type
    });
  };
  reader.readAsDataURL(file);
});

socket.on("file-message", (msg) => {
  const isSelf = msg.name === name;
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper");
  const fileLink = `<a href="${msg.data}" download="${msg.filename}" target="_blank">${msg.filename}</a>`;
  wrapper.innerHTML = `<div class="message ${isSelf ? "sent" : "received"}"><strong>${msg.name}</strong><br>${fileLink}<div class="timestamp">${new Date(msg.time).toLocaleTimeString()}</div></div>`;
  chatArea.appendChild(wrapper);
});

// Voice Recording
let mediaRecorder;
let audioChunks = [];
document.getElementById("startRecording").onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("voice-message", {
        name,
        time: new Date().toISOString(),
        data: reader.result
      });
    };
    reader.readAsDataURL(blob);
    audioChunks = [];
  };
  setTimeout(() => mediaRecorder.stop(), 5000);
};

socket.on("voice-message", (msg) => {
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = msg.data;
  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper");
  wrapper.innerHTML = `<div class="message ${msg.name === name ? "sent" : "received"}"><strong>${msg.name}</strong><br/></div>`;
  wrapper.querySelector(".message").appendChild(audio);
  chatArea.appendChild(wrapper);
});

