# Battle Quiz — Multiplayer Game

A real-time 2–8 player quiz game using React, Vite, Node.js, Express and Socket.IO.

## Rules
1. Create a room and share the six-character code.
2. At least two players are required to start.
3. Each round has one multiple-choice question and 15 seconds to answer.
4. Correct answers score points; faster correct answers score more.
5. Each player can answer once per round.
6. There are five rounds. Highest total score wins.
7. The server owns the authoritative game state and scores.

## Local run
Requirements: Node.js 18+

```bash
npm install
npm run dev
```

For a production server:

```bash
npm install
npm run build
npm start
```

The Node server serves the built React app and Socket.IO from the same origin. Set `PORT` on the host if needed. In development, Vite proxies Socket.IO WebSocket traffic to the server on port 3001.

