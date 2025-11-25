// Import the HTTP and WebSocket modules
const http = require('http');
const { WebSocketServer } = require('ws');

// Create a basic HTTP server (so WebSocket can upgrade properly)
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  //prints console current status
  res.end('WebSocket server running...');
});

// passing in the HTTP server to make a new Web Socket Server, so that both ways will be connected
const wss = new WebSocketServer({ server });

// tells the server what to do when it gets new connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  // telling our server what we want it to do when it receives a new message
  ws.on('message', (data) => {
    console.log('Received:', data.toString());

    // looping through each client so that it can Broadcast it to all other connected clients if the socket is open 
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(data.toString());  // sending data back out
      }
    });
  });

  // When the client disconnects it prints this
  ws.on('close', () => console.log('Client disconnected'));
});

// what port to listen to
const PORT = 3001;
server.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
