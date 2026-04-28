
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
          { role: "system", content: "You are a health emergency assistant. Return results in JSON format." },
          { role: "user", content: `Find 3 real, functional emergency hospitals or clinics nearest to coordinates (${lat}, ${lng}) in Nigeria. Return a list of names and addresses. Format: { "hospitals": [{ "name": "...", "address": "...", "distance": "..." }] }` }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0]?.message?.content || "{\"hospitals\":[]}");
    } catch (error) {
      console.error("OpenAI Search Error:", error);
      throw error;
    }
  }

  async analyzeFood(base64Image: string, userContext: string): Promise<any> {
    const openai = this.getAI();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: "system", content: "You are Genova NutriScan AI. Identify food items and estimate their nutritional value. Provide a health tip relevant to the user's genotype, blood group, and health goals. If it is a Nigerian meal, provide localized insights. Return JSON." },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this food image for a user with the following health profile: ${userContext}. Provide nutritional estimates and personalized advice.` },
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
          { role: "system", content: "You are Genova BioScan AI. You analyze PPG signals from smartphone cameras to estimate heart rate and blood pressure. You are highly accurate in signal processing. Provide localized Nigerian health advice. Return JSON." },
          { role: "user", content: `Analyze this PPG (Photoplethysmogram) signal data collected from a smartphone camera. 
              User Profile: ${userContext}. 
              Signal Data (average red channel values over 10 seconds): ${ppgSignal.join(', ')}.
              
              Calculate the Heart Rate (BPM) based on the peaks in the signal. 
              Estimate Blood Pressure (Systolic/Diastolic) using the user's profile and signal characteristics (e.g., pulse wave analysis).
              Provide a health insight relevant to the user's Nigerian context and genotype.` 
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
