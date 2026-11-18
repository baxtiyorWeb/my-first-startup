import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
    const [k, ...v] = trimmed.split("=");
    process.env[k.trim()] = v.join("=").replace(/^["']|["']$/g, "").trim();
  }
}

const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_REST_API_KEY;

console.log("AppId:", appId);
console.log("ApiKey prefix:", apiKey ? apiKey.slice(0, 15) + "..." : "missing");

async function checkApp() {
  const cleanApiKey = apiKey.trim().replace(/^Basic\s+/i, "").replace(/^Key\s+/i, "");
  
  // 1. Check App info
  const appRes = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
    headers: {
      Authorization: `Key ${cleanApiKey}`,
    },
  });
  console.log("App check status:", appRes.status);
  const appData = await appRes.json();
  console.log("App messageable players:", appData.messageable_players);
  console.log("App total players:", appData.players);

  // 2. Try sending test push to all subscribed users (or segments: ["Subscribed Users"])
  const sendRes = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${cleanApiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      included_segments: ["Subscribed Users"],
      headings: { en: "Test Push", uz: "Sinov Push" },
      contents: { en: "Hello from OneSignal test!", uz: "Salom OneSignal sinov!" },
    }),
  });
  console.log("Send to Subscribed Users status:", sendRes.status);
  const sendData = await sendRes.json();
  console.log("Send result:", sendData);
}

checkApp().catch(console.error);
