// Import the HTTP and WebSocket modules
const http = require('http');
const { WebSocketServer } = require('ws');

// Create a basic HTTP server (so WebSocket can upgrade properly)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server running...');
});

// Create a WebSocket server bound to our HTTP server
const wss = new WebSocketServer({ server });

// When a client connects
wss.on('connection', (ws) => {
  console.log('Client connected');

  // When we receive a message from a client
  ws.on('message', (data) => {
    console.log('Received:', data.toString());

    // Broadcast it to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(data.toString());
      }
    });
  });

  // When the client disconnects
  ws.on('close', () => console.log('Client disconnected'));
});

// Start the server
const PORT = 3001;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
