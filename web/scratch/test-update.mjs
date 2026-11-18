import fs from "fs";
import path from "path";

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
const cleanApiKey = apiKey.trim().replace(/^Basic\s+/i, "").replace(/^Key\s+/i, "");

async function checkUpdate() {
  const res = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${cleanApiKey}`,
    },
    body: JSON.stringify({}),
  });
  console.log("Update check status:", res.status);
  const data = await res.json();
  console.log("Data:", data);
}

checkUpdate().catch(console.error);
