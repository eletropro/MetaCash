import { GoogleGenAI } from "@google/genai";

export interface RouteResult {
  distanceKm: number;
  durationText: string;
  fuelCost: number;
  mapsUrl: string;
  originCoords?: [number, number];
  destCoords?: [number, number];
}

function getAi() {
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';
  if (!apiKey) {
    console.warn("GEMINI_API_KEY não encontrada no ambiente.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function calculateRoute(
  origin: string,
  destination: string,
  fuelPrice: number,
  fuelConsumption: number,
  originCoords?: [number, number],
  destCoords?: [number, number]
): Promise<RouteResult> {
  const ai = getAi();
  const originStr = originCoords ? `${originCoords[0]}, ${originCoords[1]}` : origin;
  const destStr = destCoords ? `${destCoords[0]}, ${destCoords[1]}` : destination;

  const prompt = `Aja como um GPS. Calcule a distância de condução e o tempo entre:
  ORIGEM: "${originStr}"
  DESTINO: "${destStr}"
  
  Use a ferramenta Google Maps para validar.
  Retorne APENAS um JSON:
  {
    "distanceKm": número,
    "durationText": "tempo",
    "mapsUrl": "link",
    "originCoords": [lat, lng],
    "destCoords": [lat, lng]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        distanceKm: 0,
        durationText: "Erro no formato",
        fuelCost: 0,
        mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
      };
    }

    const result = JSON.parse(jsonMatch[0]);
    const distance = parseFloat(result.distanceKm) || 0;
    const consumption = fuelConsumption > 0 ? fuelConsumption : 10;
    const price = fuelPrice > 0 ? fuelPrice : 0;
    const cost = (distance / consumption) * price;

    return {
      distanceKm: distance,
      durationText: result.durationText || "N/A",
      fuelCost: cost,
      mapsUrl: result.mapsUrl || `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
      originCoords: result.originCoords || originCoords,
      destCoords: result.destCoords || destCoords
    };
  } catch (error) {
    console.error("Erro calculateRoute:", error);
    return {
      distanceKm: 0,
      durationText: "Erro de serviço",
      fuelCost: 0,
      mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    };
  }
}

export async function searchAddress(query: string): Promise<{ address: string; coords?: [number, number] }> {
  const ai = getAi();
  const prompt = `Localize o endereço completo e as coordenadas geográficas para: "${query}". 
  Seja preciso. Retorne APENAS um objeto JSON válido no formato:
  {
    "address": "endereço completo formatado",
    "coords": [latitude, longitude]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        if (result.address && result.coords) {
          return { address: result.address, coords: result.coords };
        }
      } catch (e) {
        console.error("Erro ao parsear JSON de endereço:", e);
      }
    }

    // Se falhar o JSON, tenta pegar do texto ou grounding se disponível
    return { address: text.split('\n')[0] || query };
  } catch (error) {
    console.error("Erro searchAddress:", error);
    return { address: query };
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const ai = getAi();
  const prompt = `Qual é o endereço exato para estas coordenadas: latitude ${lat}, longitude ${lng}? 
  Responda APENAS com o endereço formatado, sem mais nada.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text?.trim();
    if (text && text.length > 5) {
      return text;
    }
    return `${lat}, ${lng}`;
  } catch (error) {
    console.error("Erro reverseGeocode:", error);
    return `${lat}, ${lng}`;
  }
}
