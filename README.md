# BugHunt Battle

Real-time 1v1 code duels built with Next.js, Monaco, Express, and Socket.io.

## Local development

1. Start the game server:

   ```powershell
   cd server
   npm install
   Copy-Item .env.example .env
   npm run dev
   ```

2. Start the client in a second terminal:

   ```powershell
   cd client
   npm install
   Copy-Item .env.example .env.local
   npm run dev
   ```

Open `http://localhost:3000`, create a room, then use the copied room link in a second browser tab.

## Deployment

### 1. Deploy the backend to Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository. Render will read `render.yaml` and create the `bughunt-battle-server` web service.
3. Wait for the service to deploy and copy its public HTTPS URL, for example `https://bughunt-battle-server.onrender.com`.
4. In the Render service environment variables, set `CLIENT_URL` to the final Vercel URL you will use. You can list multiple comma-separated HTTPS origins if needed.

Render's `/health` check confirms the Node server is reachable. Socket.io uses the same HTTPS origin with WebSocket upgrade automatically; no separate WebSocket service is needed.

### 2. Deploy the frontend to Vercel

1. In Vercel, choose **Add New > Project**, import the repository, and set the project root to `client`.
2. Add the environment variable `NEXT_PUBLIC_SERVER_URL` with the Render HTTPS URL.
3. Deploy. Vercel provides an HTTPS URL such as `https://bughunt-battle.vercel.app`.
4. Copy that exact URL into Render's `CLIENT_URL` variable and redeploy the backend.

The final public setup is:

```text
Vercel HTTPS frontend  ->  NEXT_PUBLIC_SERVER_URL  ->  Render HTTPS Socket.io backend
```

Both players open the Vercel URL from any city or network. The room state is held in the Render process, so both browsers connect to the same public Socket.io server. The current room store is in-memory; for multi-instance scaling, add Redis adapter and persistent room storage later.

The judge is intentionally a mock validator for this prototype: it checks that the starter bug is changed and is ready to be replaced by an isolated execution service before accepting untrusted code in production.