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
    const { systemInstruction, history, userMessage, model, attachedImage } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const hasImage = !!(attachedImage && attachedImage.base64);

    // If image is present, prioritize Groq vision models or fallback to Gemini
    const requestedModel = model || (hasImage ? "llama-3.2-11b-vision-preview" : "openai/gpt-oss-120b");
    const candidateModels = hasImage 
      ? ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
      : Array.from(new Set([
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
        if (targetModel.startsWith("gemini")) continue;
        try {
          let lastUserContent: any = userMessage || "Analyze this image and explain what you see in relation to my health query.";
          if (hasImage) {
            const mime = attachedImage.mimeType || "image/jpeg";
            const dataUri = attachedImage.base64.startsWith("data:")
              ? attachedImage.base64
              : `data:${mime};base64,${attachedImage.base64}`;
            lastUserContent = [
              { type: "text", text: userMessage || "Analyze this image and explain what you see in relation to my health and medical query." },
              { type: "image_url", image_url: { url: dataUri } }
            ];
          }

          const messages: any[] = [
            { role: "system", content: systemInstruction },
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "assistant" : "user",
              content: h.text,
            })),
            { role: "user", content: lastUserContent },
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
        const lastUserParts: any[] = [
          { text: userMessage || "Analyze this image and explain what you see in relation to my health and medical query." }
        ];

        if (hasImage) {
          const rawBase64 = attachedImage.base64.includes(",") 
            ? attachedImage.base64.split(",")[1] 
            : attachedImage.base64;
          const mimeType = attachedImage.mimeType || "image/jpeg";
          lastUserParts.push({
            inlineData: {
              mimeType: mimeType,
              data: rawBase64
            }
          });
        }

        const response = await gemini.models.generateContentStream({
          model: "gemini-3.6-flash",
          contents: [
            ...(history || []).map((h: any) => ({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: h.text }]
            })),
            { role: "user", parts: lastUserParts }
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
      if (groqClient) {
        const response = await groqClient.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Identify the food in this image and provide real-time nutritional data for a user with profile: ${userContext}. 
                  Provide accurate estimates for calories, protein, carbs, fat, fiber, and glycemic index. Also state genotype & blood group compatibility if relevant.
                  Return a JSON object in this exact format:
                  {
                    "foodName": "Identified Dish Name",
                    "calories": 450,
                    "protein": "20g",
                    "carbs": "55g",
                    "fat": "15g",
                    "fiber": "5g",
                    "glycemicIndex": "Low",
                    "genotypeCompatibility": "Highly Compatible",
                    "insight": "Personalized health advice tailored to user demographics."
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
        return res.json(parsed);
      }

      // Gemini Vision Fallback
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              parts: [
                { text: `Identify the food in this image and provide real-time nutritional data for a user with profile: ${userContext}. 
                Provide accurate estimates for calories, protein, carbs, fat, fiber, and glycemic index. Also state genotype & blood group compatibility.
                Return a JSON object in this exact format:
                {
                  "foodName": "Identified Dish Name",
                  "calories": 450,
                  "protein": "20g",
                  "carbs": "55g",
                  "fat": "15g",
                  "fiber": "5g",
                  "glycemicIndex": "Low",
                  "genotypeCompatibility": "Highly Compatible",
                  "insight": "Personalized health advice tailored to user demographics."
                }` },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });
        const parsed = safeParseJSON(response.text, {});
        return res.json(parsed);
      }

      res.status(500).json({ error: "No AI service available for food analysis" });
    } catch (error: any) {
      console.error("Food Analysis Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal food analysis error" });
    }
  });

  // 3b. Text Manual Food Query Analysis endpoint
  app.post("/api/analyze-food-text", async (req, res) => {
    const { query, userContext } = req.body;
    const prompt = `You are Genova AI Clinical Nutrition Engine analyzing a real-time manual food log input.
    User Query: "${query}".
    User Health Profile & Demographics: ${userContext || 'Standard Profile'}.

    Provide real-time nutritional analysis and calculate exact calories, protein, carbs, fat, dietary fiber, glycemic index, and genotype/blood group compatibility advice.
    Return ONLY a clean JSON object with this EXACT structure:
    {
      "foodName": "Formatted Meal Name",
      "calories": 520,
      "protein": "24g",
      "carbs": "62g",
      "fat": "18g",
      "fiber": "6g",
      "glycemicIndex": "Medium",
      "genotypeCompatibility": "Compatible with AA/AS & O+ Blood Group",
      "insight": "Clinical nutritional insight tailored specifically to the meal ingredients, portion, and user health profile."
    }`;

    try {
      const groqClient = getGroqClient();
      if (groqClient) {
        const candidateModels = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen-2.5-32b"];
        for (const modelName of candidateModels) {
          try {
            const response = await groqClient.chat.completions.create({
              model: modelName,
              messages: [{ role: "user", content: prompt }],
              response_format: { type: "json_object" }
            });
            const parsed = safeParseJSON(response.choices[0]?.message?.content, null);
            if (parsed && parsed.foodName) {
              return res.json(parsed);
            }
          } catch (e: any) {
            console.warn(`[Server] Food text model ${modelName} failed:`, e?.message);
          }
        }
      }

      // Gemini Fallback
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = safeParseJSON(response.text, null);
        if (parsed && parsed.foodName) {
          return res.json(parsed);
        }
      }

      res.status(500).json({ error: "Failed to process manual food analysis" });
    } catch (error: any) {
      console.error("Food Text Analysis Error on Backend:", error);
      res.status(500).json({ error: error?.message || "Internal food text analysis error" });
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

  // 6. Smartwatch Telemetry & Health Insights endpoint using openai/gpt-oss-120b & qwen/qwen3.6-27b
  app.post("/api/analyze-smartwatch-telemetry", async (req, res) => {
    const { telemetryData, userContext } = req.body;
    const prompt = `You are Genova AI Chief Clinical Intelligence Engine analyzing comprehensive live smartwatch telemetry.
    Telemetry Data:
    - Current Heart Rate: ${telemetryData.heartRate} BPM (Resting HR: ${telemetryData.restingHeartRate} BPM)
    - Sleep: ${telemetryData.sleepDurationHours} hours, Quality: ${telemetryData.sleepQualityPercent}% (Deep: ${telemetryData.sleepBreakdown?.deep}, REM: ${telemetryData.sleepBreakdown?.rem}, Light: ${telemetryData.sleepBreakdown?.light}, Awake: ${telemetryData.sleepBreakdown?.awake})
    - Activity: ${telemetryData.steps} steps, ${telemetryData.distanceKm} km, Active Cals: ${telemetryData.caloriesActive} kcal (Total: ${telemetryData.caloriesBurnedTotal} kcal)
    - Workouts: ${JSON.stringify(telemetryData.workouts)}
    - Blood Oxygen (SpO2): ${telemetryData.spo2Percent}%
    - Stress Level Score: ${telemetryData.stressLevelScore} / 100
    - Skin Temp Differential: ${telemetryData.skinTempDiffC > 0 ? '+' : ''}${telemetryData.skinTempDiffC}°C
    - Connection/Sync Latency: ${telemetryData.syncSpeedMs} ms
    - User Context: ${userContext || 'Standard Profile'}

    Analyze ALL collected metrics together to derive trends across activity, sleep, heart rate, stress, and sync stability.
    Calculate a Daily Health Score between 0 and 100.
    Explain specifically what affected the score (positive factors and negative drag factors).
    Provide the TOP THREE concrete actionable steps the user can take today to improve their score.

    Return ONLY a clean JSON object with this EXACT structure:
    {
      "healthScore": 86,
      "scoreExplanation": {
        "positiveFactors": [
          "Optimal SpO2 at 98.5% with healthy arterial oxygen saturation",
          "Solid REM sleep duration (2h 10m) supporting cognitive recovery",
          "Excellent step count exceeding 8,000 steps baseline"
        ],
        "negativeFactors": [
          "Resting Heart Rate slightly elevated (+3 BPM vs 7-day average)",
          "Mild autonomic stress detected post-workout (Stress 32/100)"
        ]
      },
      "topActions": [
        "Hydrate with 500ml of water with electrolytes before 8 PM to lower resting HR",
        "Perform 10 minutes of deep diaphragmatic breathing before bedtime to decrease stress",
        "Maintain current sleep schedule to preserve optimal REM sleep cycles"
      ],
      "trends": {
        "heartRateTrend": "Resting HR is stable at 61 BPM with fast 2-minute post-workout cardiac recovery.",
        "sleepQualityTrend": "Deep sleep accounts for 22% of total sleep, indicating strong physical tissue repair.",
        "activityNutritionTrend": "Caloric expenditure of 2,180 kcal aligns well with active movement and distance of 6.35 km.",
        "stressRecoveryTrend": "Sympathetic nervous system dominance spiked during midday but recovered during rest.",
        "connectionSyncSpeed": "Smartwatch sync speed is optimal at ${telemetryData.syncSpeedMs}ms over BLE GATT telemetry."
      },
      "summaryInsight": "Your physiological recovery is strong with balanced sleep architecture and active cardiovascular output. Focusing on pre-sleep hydration will further lower your overnight resting heart rate."
    }`;

    const groqClient = getGroqClient();
    if (groqClient) {
      const candidateModels = ["openai/gpt-oss-120b", "qwen/qwen3.6-27b", "qwen-2.5-32b"];
      for (const modelName of candidateModels) {
        try {
          const response = await groqClient.chat.completions.create({
            model: modelName,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          });
          const parsed = safeParseJSON(response.choices[0]?.message?.content, null);
          if (parsed && parsed.healthScore) {
            return res.json({ ...parsed, modelUsed: modelName });
          }
        } catch (err: any) {
          console.warn(`[Server] Smartwatch analysis model ${modelName} failed:`, err?.message);
        }
      }
    }

    // Gemini Fallback
    try {
      const gemini = getGeminiClient();
      if (gemini) {
        const response = await gemini.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = safeParseJSON(response.text, null);
        if (parsed && parsed.healthScore) {
          return res.json({ ...parsed, modelUsed: "gemini-3.6-flash" });
        }
      }
    } catch (err: any) {
      console.warn("[Server] Gemini smartwatch analysis failed:", err?.message);
    }

    res.status(500).json({ error: "Failed to generate AI smartwatch analysis" });
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
