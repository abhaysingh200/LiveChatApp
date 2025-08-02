const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

const PORT = process.env.PORT || 3000;
const rooms = {}; // { roomId: [ { name, text, time } ] }

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, name }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    if (!rooms[roomId]) rooms[roomId] = [];
    const now = Date.now();
    rooms[roomId] = rooms[roomId].filter(msg => now - new Date(msg.time).getTime() < 86400000);
    rooms[roomId].forEach(msg => socket.emit("chat-message", msg));
  });

  socket.on("chat-message", (msg) => {
    const { roomId, name } = socket.data;
    const message = { name, text: msg.text, time: msg.time || new Date().toISOString() };
    rooms[roomId].push(message);
    io.to(roomId).emit("chat-message", message);
  });

  socket.on("file-message", (msg) => {
    const { roomId } = socket.data;
    rooms[roomId].push(msg);
    io.to(roomId).emit("file-message", msg);
  });

  socket.on("voice-message", (msg) => {
    const { roomId } = socket.data;
    rooms[roomId].push(msg);
    io.to(roomId).emit("voice-message", msg);
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
