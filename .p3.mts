import WebSocket from "ws";
const ws = new WebSocket("ws://127.0.0.1:3999/api/ws", { origin: "http://127.0.0.1:3999" });
ws.on("open", () => console.log("OPEN"));
ws.on("message", (d) => { console.log("MSG", d.toString().slice(0,100)); ws.close(); process.exit(0); });
ws.on("error", (e) => { console.log("ERR", e.message); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT"); process.exit(1); }, 4000);
