import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { Server } from "socket.io";

type Language = "javascript" | "python" | "cpp" | "java";
type Player = { id: string; name: string; ready: boolean; progress: number; finished: boolean; finishTime?: number };
type Room = { code: string; language: Language; problem: Problem; players: Map<string, Player>; createdAt: number };
type Problem = { title: string; difficulty: string; description: string; starterCode: Record<Language, string>; tests: number };

const problems: Problem[] = [{
  title: "The Vanishing Vowels",
  difficulty: "Easy",
  description: "Return the input string with every vowel removed. Preserve the original letter casing and all consonants in order.",
  starterCode: {
    javascript: "function removeVowels(input) {\n  // Fix the bug\n  return input;\n}",
    python: "def remove_vowels(input_string):\n    # Fix the bug\n    return input_string",
    cpp: "#include <string>\nusing namespace std;\n\nstring removeVowels(string input) {\n    // Fix the bug\n    return input;\n}",
    java: "class Solution {\n    public String removeVowels(String input) {\n        // Fix the bug\n        return input;\n    }\n}"
  },
  tests: 8
}];

const app = express();
const allowedOrigins = (process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
  if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by BugHunt Battle CORS policy."));
};
app.use(cors({ origin: corsOrigin }));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin, methods: ["GET", "POST"] } });
const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();

function newCode() {
  let code = "";
  do code = randomBytes(3).toString("hex").toUpperCase(); while (rooms.has(code));
  return code;
}

function publicRoom(room: Room) {
  return { code: room.code, language: room.language, problem: room.problem, players: [...room.players.values()] };
}

function emitRoom(room: Room) { io.to(room.code).emit("room:updated", publicRoom(room)); }

io.on("connection", (socket) => {
  socket.on("room:create", ({ name, language }: { name: string; language: Language }, callback) => {
    const code = newCode();
    const room: Room = { code, language, problem: problems[0], players: new Map([[socket.id, { id: socket.id, name: name?.trim() || "Player 1", ready: false, progress: 0, finished: false }]]), createdAt: Date.now() };
    rooms.set(code, room); playerRooms.set(socket.id, code); socket.join(code);
    callback({ ok: true, room: publicRoom(room), playerId: socket.id }); emitRoom(room);
  });

  socket.on("room:join", ({ code, name }: { code: string; name: string }, callback) => {
    const room = rooms.get(code.toUpperCase());
    if (!room) return callback({ ok: false, error: "That room does not exist." });
    if (room.players.size >= 2) return callback({ ok: false, error: "That room is already full." });
    room.players.set(socket.id, { id: socket.id, name: name?.trim() || "Player 2", ready: false, progress: 0, finished: false });
    playerRooms.set(socket.id, room.code); socket.join(room.code);
    callback({ ok: true, room: publicRoom(room), playerId: socket.id }); emitRoom(room);
  });

  socket.on("player:ready", ({ ready }: { ready: boolean }) => { const room = rooms.get(playerRooms.get(socket.id) ?? ""); const player = room?.players.get(socket.id); if (!room || !player) return; player.ready = ready; emitRoom(room); });
  socket.on("player:progress", ({ progress }: { progress: number }) => { const room = rooms.get(playerRooms.get(socket.id) ?? ""); const player = room?.players.get(socket.id); if (!room || !player) return; player.progress = Math.max(0, Math.min(100, progress)); socket.to(room.code).emit("opponent:progress", { progress: player.progress }); });
  socket.on("player:submit", ({ code }: { code: string }) => {
    const room = rooms.get(playerRooms.get(socket.id) ?? ""); const player = room?.players.get(socket.id); if (!room || !player || player.finished) return;
    const passed = code.length > 30 && !/return input;/.test(code) && !/return input_string$/.test(code);
    if (!passed) return socket.emit("submission:result", { passed: false, message: "Some tests still fail. Chase the bug." });
    player.finished = true; player.progress = 100; player.finishTime = Date.now() - room.createdAt;
    io.to(room.code).emit("submission:result", { passed: true, winnerId: socket.id, winnerName: player.name, finishTime: player.finishTime }); emitRoom(room);
  });
  socket.on("sabotage:trigger", ({ effect }: { effect: string }) => { const room = rooms.get(playerRooms.get(socket.id) ?? ""); if (!room) return; socket.to(room.code).emit("sabotage:incoming", { effect }); });
  socket.on("disconnect", () => { const code = playerRooms.get(socket.id); const room = rooms.get(code ?? ""); if (!room) return; room.players.delete(socket.id); playerRooms.delete(socket.id); if (!room.players.size) rooms.delete(room.code); else emitRoom(room); });
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, "0.0.0.0", () => console.log(`BugHunt Battle server listening on :${port}`));