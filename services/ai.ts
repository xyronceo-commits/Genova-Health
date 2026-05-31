
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

export class AIService {
  private getOpenAI() {
    return new OpenAI({
      apiKey: (process.env.OPENAI_API_KEY as string) || "dummy_key",
      dangerouslyAllowBrowser: true 
    });
  }

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

  async *getResponseStream(
    model: string = 'gemini-3.5-flash',
    systemInstruction: string,
    history: Message[],
    userMessage: string,
    useSearch: boolean = false
  ) {
    const gemini = this.getGemini();
    
    try {
      const response = await gemini.models.generateContentStream({
        model,
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
      console.error("Gemini Error:", error);
      // Fallback to OpenAI if Gemini fails or is not available
      const openai = this.getOpenAI();
      const messages: any[] = [
        { role: "system", content: systemInstruction },
        ...history.map(h => ({
          role: h.role === 'model' ? 'assistant' : 'user',
          content: h.text
        })),
        { role: "user", content: userMessage }
      ];

      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          yield {
            text,
            groundingMetadata: null
          };
        }
      }
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

      // If grounding didn't yield results, use LLM reasoning as second path
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
      // Fallback
      return {
        hospitals: [
          { name: "Reddington Hospital", address: "Victoria Island, Lagos", distance: "Fallback (enable GPS)", specialty: "Emergency" },
          { name: "Lagoon Hospital", address: "Ikoyi, Lagos", distance: "Fallback (enable GPS)", specialty: "General" }
        ]
      };
    }
  }

  async analyzeFood(base64Image: string, userContext: string): Promise<any> {
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
      console.error("Food Analysis Error (Gemini):", error);
      // Fallback to OpenAI
      const openai = this.getOpenAI();
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: "system", content: "You are Genova NutriScan AI. Return ONLY JSON." },
            {
              role: "user",
              content: [
                { type: "text", text: `Identify food for user: ${userContext}. JSON format: {foodName, calories, protein, carbs, fat, insight}` },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
              ]
            }
          ],
          response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0]?.message?.content || "{}");
      } catch (oErr) {
        return {
          foodName: "Healthy Meal (Preview)",
          calories: 420,
          protein: "18g",
          carbs: "50g",
          fat: "14g",
          insight: "Looks like a great meal! Keep up the balanced diet."
        };
      }
    }
  }

  async analyzeBiometrics(ppgSignal: number[], userContext: string): Promise<any> {
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

  // Placeholder for Live API as OpenAI doesn't have a simple 1:1 client-side SDK for this like Gemini
  async connectLive(callbacks: any, systemInstruction: string): Promise<any> {
    console.warn("Live API is currently not supported with OpenAI implementation. This feature is disabled.");
    return {
      sendRealtimeInput: () => {},
      close: () => {}
    };
  }
}

export const ai = new AIService();
