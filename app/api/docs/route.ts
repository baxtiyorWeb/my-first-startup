import { NextResponse } from "next/server";
import { openApiSpec } from "@/server/openapi/spec";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") {
    return NextResponse.json(openApiSpec);
  }

  const html = `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Fikr API — Swagger Hujjatlari</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="/favicon.ico" />
  <style>
    body {
      margin: 0;
      background: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .topbar {
      display: none !important;
    }
    .swagger-ui .info .title {
      color: #f8fafc !important;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: #94a3b8 !important;
    }
    .swagger-ui .scheme-container {
      background: #0f172a !important;
      box-shadow: none !important;
      border-bottom: 1px solid #1e293b !important;
    }
    .swagger-ui {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
