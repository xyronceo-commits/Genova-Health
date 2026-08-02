import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser limit increased to support base64 images
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize Groq safely
  const getGroqClient = () => {
    const key = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (!key) return null;
    return new Groq({ apiKey: key });
  };

  // Initialize Gemini safely
  const getGeminiClient = () => {
    const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  };

  // Helper for resilient JSON parsing
  const safeParseJSON = (rawText: string | undefined | null, fallback: any = {}) => {
    if (!rawText) return fallback;
    try {
      let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const firstBrace = cleaned.search(/[{\[]/);
      const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    } catch (e) {
      return fallback;
    }
  };

  // 1. Health & Config endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      groqConfigured: !!(process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY),
      geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
    });
  });

  // 2. Chat Streaming endpoint (SSE) using Groq with Gemini fallback
  app.post("/api/chat/stream", async (req, res) => {
    const { systemInstruction, history, userMessage, model } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const requestedModel = model || "openai/gpt-oss-120b";
    const candidateModels = Array.from(new Set([
      requestedModel,
      "openai/gpt-oss-120b",
      "qwen/qwen3.6-27b",
      "qwen-2.5-32b",
      "gemma2-9b-it"
    ]));

    // Attempt Groq first with candidate models
    const groqClient = getGroqClient();
    if (groqClient) {
      for (const targetModel of candidateModels) {
        // Skip gemini models when calling Groq
        if (targetModel.startsWith("gemini")) continue;
        try {
          const messages: any[] = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "assistant" : "user",
              content: h.text,
            })),
            { role: "user", content: userMessage },
          ];

          const completion = await groqClient.chat.completions.create({
            messages,
            model: targetModel,
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
          return;
        } catch (groqErr: any) {
          console.warn(`[Server] Groq model ${targetModel} failed: ${groqErr?.message}`);
        }
      }
    }

    // Fallback to Gemini if Groq failed or key is missing
    try {
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents: [
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: h.text }]
            })),
            { role: "user", parts: [{ text: userMessage }] }
          ],
          config: {
            systemInstruction: systemInstruction || undefined
          }
        });

        for await (const chunk of response) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
    } catch (geminiErr: any) {
      console.error("[Server] Gemini streaming failed:", geminiErr?.message);
    }

    res.write(`data: ${JSON.stringify({ error: "No working AI API key found (Groq/Gemini). Please configure GROQ_API_KEY or GEMINI_API_KEY in environment settings." })}\n\n`);
    res.end();
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

      const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
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
        model: "openai/gpt-oss-120b",
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

      const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Biometrics Analysis Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal biometrics error" });
    }
  });

  // 5. Landmark & Location extraction endpoint using Groq
  app.post("/api/extract-location", async (req, res) => {
    const { text } = req.body;
    try {
      const groqClient = getGroqClient();
      const response = await groqClient.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "user",
            content: `Extract the location details from this text into JSON format: '${text}'.
            Return a JSON object in this exact format:
            {
              "landmark": "Lekki Conservation Centre",
              "city": "Lagos",
              "country": "Nigeria",
              "latitude": 6.4281,
              "longitude": 3.4219
            }
            Use your general knowledge to estimate accurate coordinates (lat/lng) for the landmark or address described. Return ONLY the JSON object, do not explain the coordinates, do not write anything else.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const parsed = safeParseJSON(response.choices[0]?.message?.content, {});
      res.json(parsed);
    } catch (error: any) {
      console.error("Groq Location Extraction Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal location extraction error" });
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
