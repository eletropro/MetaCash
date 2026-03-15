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

  const prompt = `Pesquise no Google Maps a rota de carro entre:
  ORIGEM: ${originStr}
  DESTINO: ${destStr}
  
  Responda com a distância total em quilômetros (km) e o tempo de viagem.
  Exemplo de resposta: "A distância é 15.5 km e o tempo é 20 min"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        temperature: 0.2,
      },
    });

    const text = response.text || '';
    console.log("GPS Response:", text);

    // Regex ultra-abrangente
    // Pega números como 10, 10.5, 10,5 seguidos de km ou quilômetros
    const distanceMatch = text.match(/(\d+[.,]?\d*)\s*(km|quil[ôo]metros)/i);
    const durationMatch = text.match(/(\d+)\s*(min|hora|hr|h|seg)/i);
    
    let distance = 0;
    if (distanceMatch) {
      distance = parseFloat(distanceMatch[1].replace(',', '.'));
    } else {
      // Fallback: procura qualquer número que venha antes de "km" no texto todo
      const fallbackMatch = text.toLowerCase().match(/([\d.,]+)\s*km/);
      if (fallbackMatch) {
        distance = parseFloat(fallbackMatch[1].replace(',', '.'));
      }
    }

    let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const chunk of chunks) {
        if (chunk.maps?.uri) mapsUrl = chunk.maps.uri;
      }
    }

    const consumption = fuelConsumption > 0 ? fuelConsumption : 10;
    const price = fuelPrice > 0 ? fuelPrice : 0;
    const cost = (distance / consumption) * price;

    return {
      distanceKm: distance,
      durationText: durationMatch ? durationMatch[0] : "Ver mapa",
      fuelCost: cost,
      mapsUrl: mapsUrl,
      originCoords: originCoords,
      destCoords: destCoords
    };
  } catch (error) {
    console.error("Erro calculateRoute:", error);
    return {
      distanceKm: 0,
      durationText: "Erro",
      fuelCost: 0,
      mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    };
  }
}

export async function searchAddress(query: string): Promise<{ address: string; coords?: [number, number] }> {
  const ai = getAi();
  const prompt = `Localize o endereço completo e as coordenadas geográficas exatas (latitude e longitude) para: "${query}".
  Use o Google Maps. Responda com o endereço formatado e as coordenadas no formato [lat, lng].`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || '';
    // Busca por padrões de coordenadas: [-23.55, -46.63] ou apenas os números
    const coordsMatch = text.match(/\[?\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]?/);
    
    let coords: [number, number] | undefined = undefined;
    if (coordsMatch) {
      coords = [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])];
    }

    // Tenta pegar o endereço da primeira linha ou de um padrão
    const addressMatch = text.match(/Endereço:\s*([^\n]+)/i) || text.match(/^([^,\n]+,[^,\n]+,[^,\n]+)/);
    const address = addressMatch ? addressMatch[1].trim() : text.split('\n')[0].trim();

    return { 
      address: address || query, 
      coords 
    };
  } catch (error) {
    console.error("Erro searchAddress:", error);
    return { address: query };
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const ai = getAi();
  const prompt = `Qual é o endereço exato para estas coordenadas: ${lat}, ${lng}? 
  Use o Google Maps. Responda apenas o endereço formatado.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    return response.text?.trim() || `${lat}, ${lng}`;
  } catch (error) {
    console.error("Erro reverseGeocode:", error);
    return `${lat}, ${lng}`;
  }
}
