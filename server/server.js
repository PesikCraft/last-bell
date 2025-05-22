const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Пути
const wishesFilePath = path.join(__dirname, 'data', 'wishes.json');
const messagesFile = path.join(__dirname, 'data', 'messages.json');

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// === ПОЖЕЛАНИЯ ===

// Получить все пожелания
app.get('/api/wishes', (req, res) => {
  fs.readFile(wishesFilePath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Ошибка чтения пожеланий' });
    let wishes = [];
    try {
      wishes = JSON.parse(data);
    } catch {
      wishes = [];
    }
    res.status(200).json(wishes);
  });
});

// Добавить пожелание
app.post('/api/wishes', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Данные отсутствуют' });

  const wish = { name, message, date: new Date().toISOString() };

  fs.readFile(wishesFilePath, 'utf8', (err, data) => {
    let wishes = [];
    if (!err && data) {
      wishes = JSON.parse(data);
    }
    wishes.push(wish);
    fs.writeFile(wishesFilePath, JSON.stringify(wishes, null, 2), (err) => {
      if (err) return res.status(500).json({ error: 'Ошибка записи файла' });
      res.status(200).json({ success: true });
    });
  });
});

// === ЧАТ (если ты используешь chat.html) ===
let messages = [];
if (fs.existsSync(messagesFile)) {
  messages = JSON.parse(fs.readFileSync(messagesFile, 'utf-8'));
}

io.on('connection', (socket) => {
  let username = '';

  socket.on('setUsername', (name) => {
    username = name;
    socket.broadcast.emit('userConnected', username);
    socket.emit('loadMessages', messages);
  });

  socket.on('chatMessage', (msg) => {
    const message = { user: username, text: msg, time: new Date().toISOString() };
    messages.push(message);
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    io.emit('chatMessage', message);
  });

  socket.on('typing', () => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('disconnect', () => {
    if (username) {
      socket.broadcast.emit('userDisconnected', username);
    }
  });
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});
