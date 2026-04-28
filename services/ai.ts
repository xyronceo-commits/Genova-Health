
import OpenAI from "openai";
import { Message } from "../types";

export class AIService {
  private getAI() {
    return new OpenAI({
      apiKey: (process.env.OPENAI_API_KEY as string) || "dummy_key",
      dangerouslyAllowBrowser: true // Since we are in a Vite environment where process.env was bridged
    });
  }

  async *getResponseStream(
    model: string = 'gpt-4o-mini',
    systemInstruction: string,
    history: Message[],
    userMessage: string,
    useSearch: boolean = false
  ) {
    const openai = this.getAI();
    
    const messages: any[] = [
      { role: "system", content: systemInstruction },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text
      })),
      { role: "user", content: userMessage }
    ];

    try {
      // Note: OpenAI doesn't have "groundingMetadata" exactly like Gemini in the standard chat SDK.
      // We simulate the stream.
      const stream = await openai.chat.completions.create({
        model: model.startsWith('gemini') ? 'gpt-4o-mini' : model,
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          yield {
            text,
            groundingMetadata: null // Placeholder
          };
        }
      }
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw error;
    }
  }

  async findHospitals(lat: number, lng: number): Promise<any> {
    const openai = this.getAI();
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a health emergency assistant locating facilities in Nigeria. Return ONLY JSON." },
          { role: "user", content: `Identify 3 real, functional emergency hospitals or clinics nearest to coordinates (${lat}, ${lng}) in Nigeria. 
          Use your internal knowledge of Nigerian healthcare geography (e.g. Lagos, Abuja, Port Harcourt distributions).
          Return a JSON object in this exact format:
          { 
            "hospitals": [
              { "name": "Hospital Name", "address": "Full Address", "distance": "estimated distance (e.g. 2.5km)", "specialty": "Emergency/General" }
            ] 
          }` }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0]?.message?.content || "{\"hospitals\":[]}");
    } catch (error) {
      console.error("OpenAI Search Error:", error);
      // Fallback data for Nigeria
      return {
        hospitals: [
          { name: "Reddington Hospital", address: "Victoria Island, Lagos", distance: "Dynamic search failed", specialty: "Emergency" },
          { name: "Lagoon Hospital", address: "Ikoyi, Lagos", distance: "Dynamic search failed", specialty: "General" },
          { name: "Nisa Premier Hospital", address: "Jabi, Abuja", distance: "Dynamic search failed", specialty: "Multi-specialty" }
        ]
      };
    }
  }

  async analyzeFood(base64Image: string, userContext: string): Promise<any> {
    const openai = this.getAI();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: "You are Genova NutriScan AI. Return ONLY JSON." },
          {
            role: "user",
            content: [
              { type: "text", text: `Identify the food in this image and provide nutritional data for a user with profile: ${userContext}. 
              Provide estimates for calories, protein, carbs, and fat.
              If it's a Nigerian dish (like Jollof, Amala, Pounded Yam), identify it correctly and provide localized health tips.
              Return a JSON object in this exact format:
              {
                "foodName": "Dish Name",
                "calories": 450,
                "protein": "20g",
                "carbs": "55g",
                "fat": "15g",
                "insight": "AI-generated personalized health advice based on user profile and meal."
              }` },
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
      
      return JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch (error) {
      console.error("Food Analysis Error:", error);
      throw error;
    }
  }

  async analyzeBiometrics(ppgSignal: number[], userContext: string): Promise<any> {
    const openai = this.getAI();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: "You are Genova BioScan AI focused on PPG signal analysis. Return ONLY JSON." },
          { role: "user", content: `Analyze this PPG (Photoplethysmogram) signal data. 
              User Profile: ${userContext}. 
              Signal Data: ${ppgSignal.join(', ')}.
              
              1. Count peaks to estimate Heart Rate (BPM).
              2. Estimate Blood Pressure (e.g. 120/80) based on signal and profile.
              3. Estimate Stress Level (Low/Medium/High).
              4. Provide a localized Nigerian health insight.
              
              Return a JSON object in this exact format:
              {
                "heartRate": 72,
                "bloodPressure": "120/80",
                "stressLevel": "Low",
                "insight": "Personalized health advice."
              }` 
          }
        ],
        response_format: { type: "json_object" }
      });
      
      return JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch (error) {
      console.error("Biometrics Analysis Error:", error);
      throw error;
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
