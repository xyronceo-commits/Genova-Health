import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit increased to support base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Groq safely
  const getGroqClient = () => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error("GROQ_API_KEY environment variable is required on the server");
    }
    return new Groq({ apiKey: key });
  };

  // 1. Health & Config endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      groqConfigured: !!process.env.GROQ_API_KEY 
    });
  });

  // 2. Chat Streaming endpoint (SSE) using Groq
  app.post("/api/chat/stream", async (req, res) => {
    const { systemInstruction, history, userMessage, model } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const groqClient = getGroqClient();
      const messages: any[] = [
        { role: "system", content: systemInstruction },
        ...history.map((h: any) => ({
          role: h.role === "model" ? "assistant" : "user",
          content: h.text,
        })),
        { role: "user", content: userMessage },
      ];

      const completion = await groqClient.chat.completions.create({
        messages,
        model: model || "llama-3.3-70b-versatile",
        stream: true,
      });

      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Groq SSE Streaming Error on Backend:", error);
      res.write(`data: ${JSON.stringify({ error: error?.message || "Internal streaming error" })}\n\n`);
      res.end();
    }
  });

  // 3. Food Analysis endpoint using Groq Vision model
  app.post("/api/analyze-food", async (req, res) => {
    const { base64Image, userContext } = req.body;
    try {
      const groqClient = getGroqClient();
      const response = await groqClient.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Identify the food in this image and provide nutritional data for a user with profile: ${userContext}. 
                Provide estimates for calories, protein, carbs, and fat.
                Return a JSON object in this exact format:
                {
                  "foodName": "Dish Name",
                  "calories": 450,
                  "protein": "20g",
                  "carbs": "55g",
                  "fat": "15g",
                  "insight": "Health advice."
                }`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Food Analysis Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal food analysis error" });
    }
  });

  // 4. Biometric signal PPG analysis endpoint using Groq
  app.post("/api/analyze-biometrics", async (req, res) => {
    const { ppgSignal, userContext } = req.body;
    try {
      const groqClient = getGroqClient();
      const response = await groqClient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `Analyze this PPG (Photoplethysmogram) signal data. 
                User Profile: ${userContext}. 
                Signal Data: ${ppgSignal.slice(0, 50).join(', ')}.
                Return a JSON object with heartRate, bloodPressure, stressLevel, and insight. 
                Return ONLY JSON in this exact format:
                {
                  "heartRate": 72,
                  "bloodPressure": "120/80",
                  "stressLevel": "Normal",
                  "insight": "Your vitals appear stable."
                }`
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Biometrics Analysis Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal biometrics error" });
    }
  });

  // Vite integration for assets serving & hot reload proxying
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Genova Server] Backend & Frontend online on http://localhost:${PORT}`);
  });
}

startServer();
