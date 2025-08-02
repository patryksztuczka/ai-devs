const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers dla testowania
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Endpoint webhook
    if (url.pathname === "/webhook" && req.method === "POST") {
      try {
        console.log("🚁 Otrzymano żądanie POST na /webhook");
        console.log("Headers:", Object.fromEntries(req.headers.entries()));

        const body = await req.text();
        console.log("Raw body:", body);

        const data = JSON.parse(body);
        console.log("Parsed JSON:", data);

        // Podstawowa walidacja
        if (!data.instruction) {
          console.log("❌ Brak pola 'instruction'");
          return new Response(
            JSON.stringify({ error: "Missing instruction field" }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        console.log(`📝 Instrukcja: "${data.instruction}"`);

        // Importy dynamiczne dla modułów nawigacji
        const { OpenAiService } = await import("./openai-service");
        const { getFieldDescription } = await import("./map");

        // Użyj LLM do interpretacji instrukcji
        const openaiService = new OpenAiService();
        const finalPosition = await openaiService.interpretMovement(
          data.instruction
        );
        const description = getFieldDescription(finalPosition);

        const response = {
          description: description,
          debug: {
            received_instruction: data.instruction,
            final_position: finalPosition,
            timestamp: new Date().toISOString(),
          },
        };

        console.log("📤 Wysyłam odpowiedź:", response);

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error("💥 Błąd przetwarzania żądania:", error);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Root endpoint
    if (url.pathname === "/" && req.method === "GET") {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Drone Navigation API</title>
        </head>
        <body>
          <h1>🚁 Drone Navigation API</h1>
          <p>Server is running!</p>
          <ul>
            <li><strong>POST /webhook</strong> - Drone navigation endpoint</li>
            <li><strong>GET /health</strong> - Health check</li>
          </ul>
          <h2>Test the webhook:</h2>
          <button onclick="testWebhook()">Test Webhook</button>
          <div id="result"></div>
          
          <script>
            async function testWebhook() {
              try {
                const response = await fetch('/webhook', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    instruction: 'poleciałem jedno pole w prawo'
                  })
                });
                const result = await response.json();
                document.getElementById('result').innerHTML = 
                  '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
              } catch (error) {
                document.getElementById('result').innerHTML = 
                  '<p style="color: red;">Error: ' + error.message + '</p>';
              }
            }
          </script>
        </body>
        </html>`,
        {
          status: 200,
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders,
          },
        }
      );
    }

    // 404 dla pozostałych ścieżek
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`🚀 Serwer uruchomiony na porcie ${server.port}`);
console.log(`🌐 URL: http://localhost:${server.port}`);
console.log(`🔗 Webhook endpoint: http://localhost:${server.port}/webhook`);
console.log(`💚 Health check: http://localhost:${server.port}/health`);
console.log("\n📋 Gotowy do testowania!");
