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

async function getDetails() {
  const appRes = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
    headers: { Authorization: `Key ${cleanApiKey}` },
  });
  const appData = await appRes.json();
  console.log("App Name:", appData.name);
  console.log("Site URL:", appData.chrome_web_origin);
  console.log("Chrome Web Default Notification Icon:", appData.chrome_web_default_notification_icon);
  console.log("Safari Web ID:", appData.safari_site_origin);
  console.log("Chrome sub domain:", appData.chrome_web_sub_domain);
}

getDetails().catch(console.error);
