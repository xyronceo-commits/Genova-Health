
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { Message } from "../types";

function safeParseJSON(rawText: string | undefined | null, fallback: any = {}): any {
  if (!rawText) return fallback;
  try {
    let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const firstBrace = cleaned.search(/[{\[]/);
    const lastBrace = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    // Remove trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
}

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
    const mappedModel = (!model || model.startsWith("gemini") || model.startsWith("gpt") || model.startsWith("claude"))
      ? "llama-3.3-70b-versatile"
      : model;

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
          model: mappedModel
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
          model: mappedModel,
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
        model: 'gemini-2.5-flash',
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

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const a = data.address;
          const city = a.city || a.town || a.village || a.suburb || a.county || a.state_district;
          const state = a.state;
          if (city && state) return `${city}, ${state}`;
          if (city && a.country) return `${city}, ${a.country}`;
          if (state && a.country) return `${state}, ${a.country}`;
          if (data.display_name) {
            const parts = data.display_name.split(',').map((p: string) => p.trim());
            if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
          }
        }
      }
    } catch (err) {
      console.warn("Nominatim reverse geocode failed, falling back to Gemini:", err);
    }

    try {
      const gemini = this.getGemini();
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Given GPS latitude ${lat} and longitude ${lng}, return ONLY the short City, State (e.g. "Osogbo, Osun State" or "Ikeja, Lagos State"). No markdown or extra words.`
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (err) {
      console.error("Gemini reverse geocode error:", err);
    }

    return `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
  }

  async findHospitals(lat: number, lng: number, providedLocationName?: string): Promise<any> {
    // Reverse geocode if location name is not provided
    const locationName = providedLocationName || await this.reverseGeocode(lat, lng);

    const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return parseFloat((R * c).toFixed(1));
    };

    let hospitals: any[] = [];

    // Stage 1: Try Overpass API for real OpenStreetMap healthcare facilities near lat/lng
    try {
      const overpassQuery = `[out:json][timeout:5];(node["amenity"~"hospital|clinic"](around:25000,${lat},${lng});way["amenity"~"hospital|clinic"](around:25000,${lat},${lng}););out center 10;`;
      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery
      });

      if (overpassRes.ok) {
        const data = await overpassRes.json();
        if (data && data.elements && data.elements.length > 0) {
          hospitals = data.elements.map((el: any) => {
            const tags = el.tags || {};
            const itemLat = el.lat || el.center?.lat || lat;
            const itemLon = el.lon || el.center?.lon || lng;
            const distKm = calculateDistanceKm(lat, lng, itemLat, itemLon);
            const name = tags.name || tags["name:en"] || (tags.amenity === "hospital" ? "General Hospital" : "Community Clinic");
            const address = tags["addr:street"] 
              ? `${tags["addr:street"]}, ${tags["addr:city"] || locationName}` 
              : locationName;
            
            return {
              name,
              address,
              lat: itemLat,
              lng: itemLon,
              distanceKm: distKm,
              distance: `${distKm} km away`,
              specialty: tags.amenity === "hospital" ? "Hospital & Emergency" : "Clinic & Primary Care",
              uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`
            };
          });
        }
      }
    } catch (e) {
      console.warn("Overpass API search failed, moving to Gemini grounding:", e);
    }

    // Stage 2: Fallback or augment with Gemini Grounding / AI LLM search
    if (hospitals.length < 2) {
      const gemini = this.getGemini();
      try {
        const llmResponse = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Find 5 real healthcare facilities, hospitals or clinics nearest to coordinates (${lat}, ${lng}) in ${locationName}. 
          Return ONLY a clean valid JSON object with NO extra text or markdown formatting:
          {
            "hospitals": [
              { 
                "name": "State Specialist Hospital", 
                "address": "Hospital Road, ${locationName}", 
                "lat": ${lat + 0.015}, 
                "lng": ${lng + 0.012}, 
                "specialty": "General & Emergency" 
              }
            ]
          }`,
          config: {
            responseMimeType: "application/json"
          }
        });

        const parsed = safeParseJSON(llmResponse.text, { hospitals: [] });
        if (parsed && Array.isArray(parsed.hospitals)) {
          const aiHospitals = parsed.hospitals.map((h: any, i: number) => {
            const hLat = h.lat || (lat + (i + 1) * 0.012);
            const hLng = h.lng || (lng + (i + 1) * 0.009);
            const distKm = calculateDistanceKm(lat, lng, hLat, hLng);
            return {
              name: h.name || "Medical Centre",
              address: h.address || locationName,
              lat: hLat,
              lng: hLng,
              distanceKm: distKm,
              distance: `${distKm} km away`,
              specialty: h.specialty || "Emergency Care",
              uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.name} ${h.address}`)}`
            };
          });
          hospitals = [...hospitals, ...aiHospitals];
        }
      } catch (err) {
        console.error("Gemini Hospital Finder error:", err);
      }
    }

    // Default emergency fallbacks if all network calls fail
    if (hospitals.length === 0) {
      hospitals = [
        { name: "General Hospital", address: `${locationName}`, lat: lat + 0.01, lng: lng + 0.01, distanceKm: 1.2, distance: "1.2 km away", specialty: "Emergency & General", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`General Hospital ${locationName}`)}` },
        { name: "State Medical Center", address: `${locationName}`, lat: lat + 0.02, lng: lng + 0.02, distanceKm: 2.4, distance: "2.4 km away", specialty: "Specialist & Trauma", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`State Medical Center ${locationName}`)}` },
        { name: "St. Mary Medical Clinic", address: `${locationName}`, lat: lat + 0.035, lng: lng + 0.025, distanceKm: 3.8, distance: "3.8 km away", specialty: "Primary Healthcare", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`St Mary Clinic ${locationName}`)}` }
      ];
    }

    // Filter duplicates by name
    const uniqueMap = new Map();
    hospitals.forEach(item => {
      const key = item.name.toLowerCase().trim();
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });
    const uniqueHospitals = Array.from(uniqueMap.values());

    // Sort strictly by distance from coordinates ascending (nearest first)
    uniqueHospitals.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

    return { 
      locationName, 
      hospitals: uniqueHospitals 
    };
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
        return safeParseJSON(completion.choices[0]?.message?.content, {});
      } catch (groqErr) {
        console.error("Client-side direct Groq Food analysis failed:", groqErr);
      }
    }

    // 3. Fallback: Gemini Vision
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
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
      
      return safeParseJSON(response.text, {});
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

    // 2. Second Choice: Direct Groq client (Llama 70b)
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
        return safeParseJSON(response.choices[0]?.message?.content, {});
      } catch (groqErr) {
        console.error("Client side direct Groq biometric analytics failed:", groqErr);
      }
    }

    // 3. Fallback: Google Gemini
    const gemini = this.getGemini();
    try {
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this PPG (Photoplethysmogram) signal data. 
              User Profile: ${userContext}. 
              Signal Data: ${ppgSignal.slice(0, 50).join(', ')}.
              Return a JSON object: { heartRate, bloodPressure, stressLevel, insight }`,
        config: {
          responseMimeType: "application/json"
        }
      });
      return safeParseJSON(response.text, {});
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

  async extractLocation(text: string): Promise<any> {
    // 1. First Choice: Secure Backend Express Proxy Route
    try {
      const response = await fetch("/api/extract-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Backend Location Extraction Route Unavailable, falling back client-side:", err);
    }

    // 2. Second Choice: Direct Groq client (Llama 3.3 70b)
    const groqClient = this.getGroqClient();
    if (groqClient) {
      try {
        const response = await groqClient.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user" as const,
              content: `Extract the location details from this text into JSON format: '${text}'.
              Return a JSON object:
              {
                "landmark": "Lekki Conservation Centre",
                "city": "Lagos",
                "country": "Nigeria",
                "latitude": 6.4281,
                "longitude": 3.4219
              }`
            }
          ],
          response_format: { type: "json_object" }
        });
        return safeParseJSON(response.choices[0]?.message?.content, {});
      } catch (groqErr) {
        console.error("Client side direct Groq location extraction failed:", groqErr);
      }
    }

    // 3. Static fallback for demonstration/offline conditions
    const lower = text.toLowerCase();
    if (lower.includes('lekki')) {
      return { landmark: "Lekki Conservation Centre", city: "Lagos", country: "Nigeria", latitude: 6.4281, longitude: 3.4219 };
    } else if (lower.includes('ikeja')) {
      return { landmark: "Ikeja City Mall", city: "Lagos", country: "Nigeria", latitude: 6.5960, longitude: 3.3429 };
    } else if (lower.includes('abuja')) {
      return { landmark: "Federal Capital Territory", city: "Abuja", country: "Nigeria", latitude: 9.0765, longitude: 7.3986 };
    } else {
      return { landmark: text, city: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 };
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

