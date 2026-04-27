
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message } from "../types";

export class GeminiService {
  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async *getResponseStream(
    model: string = 'gemini-3-flash-preview',
    systemInstruction: string,
    history: Message[],
    userMessage: string,
    useSearch: boolean = false
  ) {
    const ai = this.getAI();
    
    const contents = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    try {
      const response = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          tools: useSearch ? [{ googleSearch: {} }] : undefined,
        },
      });

      for await (const chunk of response) {
        yield {
          text: chunk.text,
          groundingMetadata: chunk.candidates?.[0]?.groundingMetadata
        };
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  async findHospitals(lat: number, lng: number): Promise<any> {
    const ai = this.getAI();
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite-latest",
        contents: "Find the 3 nearest functional emergency hospitals and clinics to my current location in Nigeria. Provide their names, exact street addresses, and what they are known for.",
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
        },
      });

      return {
        text: response.text,
        chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
      };
    } catch (error) {
      console.error("Maps Grounding Error:", error);
      throw error;
    }
  }

  async analyzeFood(base64Image: string, userContext: string): Promise<any> {
    const ai = this.getAI();
    
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: `Analyze this food image for a user with the following health profile: ${userContext}. Provide nutritional estimates and personalized advice.` },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.STRING, description: "e.g., '15g'" },
              carbs: { type: Type.STRING, description: "e.g., '30g'" },
              fat: { type: Type.STRING, description: "e.g., '10g'" },
              healthTip: { type: Type.STRING, description: "A personalized tip based on user profile and the meal." }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "healthTip"]
          },
          systemInstruction: "You are Genova NutriScan AI. Identify food items and estimate their nutritional value. Provide a health tip relevant to the user's genotype, blood group, and health goals. If it is a Nigerian meal, provide localized insights.",
        }
      });
      
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Food Analysis Error:", error);
      throw error;
    }
  }

  async analyzeBiometrics(ppgSignal: number[], userContext: string): Promise<any> {
    const ai = this.getAI();
    
    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: `Analyze this PPG (Photoplethysmogram) signal data collected from a smartphone camera. 
              User Profile: ${userContext}. 
              Signal Data (average red channel values over 10 seconds): ${ppgSignal.join(', ')}.
              
              Calculate the Heart Rate (BPM) based on the peaks in the signal. 
              Estimate Blood Pressure (Systolic/Diastolic) using the user's profile and signal characteristics (e.g., pulse wave analysis).
              Provide a health insight relevant to the user's Nigerian context and genotype.` 
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              heartRate: { type: Type.NUMBER },
              bloodPressure: { type: Type.STRING, description: "e.g., '120/80'" },
              stressLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              insight: { type: Type.STRING, description: "Personalized health insight based on the biometrics and user profile." }
            },
            required: ["heartRate", "bloodPressure", "stressLevel", "insight"]
          },
          systemInstruction: "You are Genova BioScan AI. You analyze PPG signals from smartphone cameras to estimate heart rate and blood pressure. You are highly accurate in signal processing. Provide localized Nigerian health advice.",
        }
      });
      
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error("Biometrics Analysis Error:", error);
      throw error;
    }
  }

  // Live API Session helper
  connectLive(callbacks: any, systemInstruction: string) {
    const ai = this.getAI();
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  }
}

export const gemini = new GeminiService();
