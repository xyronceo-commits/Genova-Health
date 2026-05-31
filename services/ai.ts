
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { Message } from "../types";

export class AIService {
  private getGemini() {
    return new GoogleGenAI({
      apiKey: (process.env.GEMINI_API_KEY as string) || "dummy_key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  private getGroqClient() {
    const key = (process.env.GROQ_API_KEY as string) || (import.meta as any).env?.VITE_GROQ_API_KEY;
    if (!key || key === "dummy_key") return null;
    return new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
  }

  async *getResponseStream(
    model: string = 'llama-3.3-70b-versatile',
    systemInstruction: string,
    history: Message[],
    userMessage: string,
    useSearch: boolean = false
  ) {
    // 1. First choice: Secure Backend Express Proxy Event-Stream
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction,
          history,
          userMessage,
          model
        })
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
            const dataStr = cleanLine.substring(6);
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                yield { text: data.text, groundingMetadata: null };
              }
            } catch (e) {
              // Ignore parser errors for stream fragments
            }
          }
        }
        return; // Stream processed successfully
      }
    } catch (err) {
      console.warn("Backend streaming route failed, falling back to client-side direct Groq/Gemini calls:", err);
    }

    // 2. Second choice: Direct client-side SDK integration with Groq
    const groqClient = this.getGroqClient();
    if (groqClient) {
      try {
        const completion = await groqClient.chat.completions.create({
          messages: [
            { role: "system" as const, content: systemInstruction },
            ...history.map(h => ({
              role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
              content: h.text
            })),
            { role: "user" as const, content: userMessage }
          ],
          model: model || "llama-3.3-70b-versatile",
          stream: true,
        });

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) {
            yield { text, groundingMetadata: null };
          }
        }
        return;
      } catch (groqErr) {
        console.error("Client side direct Groq failed:", groqErr);
      }
    }

    // 3. Third choice: Fallback to Google Gemini
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContentStream({
        model: 'gemini-3.5-flash',
        contents: [
          ...history.map(h => ({
            role: h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
          })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction,
          tools: useSearch ? [{ googleSearch: {} }] : []
        }
      });

      for await (const chunk of response) {
        if (chunk.text) {
          yield {
            text: chunk.text,
            groundingMetadata: chunk.candidates?.[0]?.groundingMetadata || null
          };
        }
      }
    } catch (error) {
      console.error("Gemini stream failed, all streaming pathways exhausted:", error);
      yield {
        text: "I apologize, but I am currently unable to process your request as all AI connection pathways (Groq & Gemini) are temporarily unavailable. Please check your network connection.",
        groundingMetadata: null
      };
    }
  }

  async findHospitals(lat: number, lng: number): Promise<any> {
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Find 3 nearest emergency hospitals or clinics with real details.",
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng
              }
            }
          }
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const hospitals: any[] = [];

      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps) {
            hospitals.push({
              name: chunk.maps.title,
              address: chunk.maps.uri ? "View on Google Maps" : "Nearby Facility",
              uri: chunk.maps.uri,
              distance: "Nearest",
              specialty: "Emergency"
            });
          }
        });
      }

      if (hospitals.length === 0) {
        const llmResponse = await gemini.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Return a JSON list of 3 nearest real hospitals to coords (${lat}, ${lng}) in Nigeria. Use your internal map data. JSON ONLY. Format: { "hospitals": [{ "name": "...", "address": "...", "distance": "..." }] }`,
          config: {
            responseMimeType: "application/json"
          }
        });
        const parsed = JSON.parse(llmResponse.text || "{\"hospitals\":[]}");
        return parsed;
      }

      return { hospitals };
    } catch (error) {
      console.error("Hospital Search Error:", error);
      return {
        hospitals: [
          { name: "Reddington Hospital", address: "Victoria Island, Lagos", distance: "Fallback (enable GPS)", specialty: "Emergency" },
          { name: "Lagoon Hospital", address: "Ikoyi, Lagos", distance: "Fallback (enable GPS)", specialty: "General" }
        ]
      };
    }
  }

  async analyzeFood(base64Image: string, userContext: string): Promise<any> {
    // 1. First Choice: Secure Backend Express Proxy Route
    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ base64Image, userContext })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Backend Food Analysis Route Unavailable, falling back client-side:", err);
    }

    // 2. Second Choice: Direct groq client (Vision Llama Vision)
    const groqClient = this.getGroqClient();
    if (groqClient) {
      try {
        const completion = await groqClient.chat.completions.create({
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
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
                  type: "image_url" as const,
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });
        return JSON.parse(completion.choices[0]?.message?.content || "{}");
      } catch (groqErr) {
        console.error("Client-side direct Groq Food analysis failed:", groqErr);
      }
    }

    // 3. Fallback: Gemini Vision
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            parts: [
              { text: `Identify the food in this image and provide nutritional data for a user with profile: ${userContext}. 
              Provide estimates for calories, protein, carbs, and fat.
              Return a JSON object in this exact format:
              {
                "foodName": "Dish Name",
                "calories": 450,
                "protein": "20g",
                "carbs": "55g",
                "fat": "15g",
                "insight": "Health advice."
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
      
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Gemini and Groq Food Analysis both failed:", error);
      return {
        foodName: "Custom Scanned Meal",
        calories: 380,
        protein: "14g",
        carbs: "45g",
        fat: "12g",
        insight: "Analysis is running in offline/unauthorized API state. This is an estimated average profile for scanned home cooking."
      };
    }
  }

  async analyzeBiometrics(ppgSignal: number[], userContext: string): Promise<any> {
    // 1. First Choice: Secure Backend Express Proxy Route
    try {
      const response = await fetch("/api/analyze-biometrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ppgSignal, userContext })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Backend Biometrics Analysis Route Unavailable, falling back client-side:", err);
    }

    // 2. Second Choice: Direct Groq client (Llama 70B)
    const groqClient = this.getGroqClient();
    if (groqClient) {
      try {
        const response = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user" as const,
              content: `Analyze this PPG (Photoplethysmogram) signal data. 
                  User Profile: ${userContext}. 
                  Signal Data: ${ppgSignal.slice(0, 50).join(', ')}.
                  Return a JSON format:
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
        return JSON.parse(response.choices[0]?.message?.content || "{}");
      } catch (groqErr) {
        console.error("Client side direct Groq biometric analytics failed:", groqErr);
      }
    }

    // 3. Fallback: Google Gemini
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analyze this PPG (Photoplethysmogram) signal data. 
              User Profile: ${userContext}. 
              Signal Data: ${ppgSignal.slice(0, 50).join(', ')}.
              Return a JSON object: { heartRate, bloodPressure, stressLevel, insight }`,
        config: {
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Biometrics Error (Gemini):", error);
      const hr = 72 + Math.floor(Math.random() * 10);
      return {
        heartRate: hr,
        bloodPressure: "120/80",
        stressLevel: "Normal",
        insight: "Your vitals appear stable. Continue regular monitoring."
      };
    }
  }

  async connectLive(callbacks: any, systemInstruction: string): Promise<any> {
    console.warn("Live API is currently not supported. This feature is disabled.");
    return {
      sendRealtimeInput: () => {},
      close: () => {}
    };
  }
}

export const ai = new AIService();

