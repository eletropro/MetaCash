import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '' });

export interface RouteResult {
  distanceKm: number;
  durationText: string;
  fuelCost: number;
  mapsUrl: string;
}

export async function calculateRoute(
  origin: string,
  destination: string,
  fuelPrice: number,
  fuelConsumption: number
): Promise<RouteResult> {
  const prompt = `Calcule a distância e o tempo de viagem entre "${origin}" e "${destination}". 
  Retorne apenas um JSON com os campos: 
  - distanceKm (número, apenas o valor em km)
  - durationText (texto, ex: "25 min")
  - mapsUrl (URL do Google Maps para essa rota)
  
  Use ferramentas de mapas para precisão.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleMaps: {} }],
    },
  });

  let result = { distanceKm: 0, durationText: "N/A", mapsUrl: "" };
  try {
    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AI response as JSON", e);
  }
  
  // Calculate fuel cost: (Distance / Consumption) * Price
  const distance = Number(result.distanceKm) || 0;
  const cost = (distance / (fuelConsumption || 10)) * (fuelPrice || 5);

  return {
    distanceKm: distance,
    durationText: result.durationText || "N/A",
    fuelCost: cost,
    mapsUrl: result.mapsUrl || `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
  };
}
