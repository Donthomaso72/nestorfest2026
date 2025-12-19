
import { GoogleGenAI, Type } from "@google/genai";

// Netlify Drop har inget build-steg för att ersätta process.env.
// Vi försöker hämta nyckeln på ett säkert sätt.
const getApiKey = () => {
  try {
    // Om vi använder en bundler (lokalt)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Om nyckeln injicerats via Netlify Snippets eller liknande
    if ((window as any).NETLIFY_API_KEY) {
      return (window as any).NETLIFY_API_KEY;
    }
  } catch (e) {}
  return "";
};

const apiKey = getApiKey();

if (!apiKey) {
  console.warn("VARNING: Ingen API_KEY hittades. Om du kör via Netlify Drop, se till att du har konfigurerat Environment Variables korrekt i Site Settings.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });

const extractJSON = (text: string) => {
  if (!text) throw new Error("AI:n svarade med tom text.");
  try {
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (markdownMatch) return JSON.parse(markdownMatch[1]);
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) return JSON.parse(braceMatch[0]);
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("Failed JSON extraction", e);
    throw new Error("Kunde inte tolka datan från AI:n.");
  }
};

export const generateRockPersona = async (name: string, favoriteFood: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a fun 80s hard rock stage name and persona for someone named "${name}" who likes "${favoriteFood}". Return ONLY a JSON object with stageName, role, instrument, and backstory. Style: Nestor band vibe.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          stageName: { type: Type.STRING },
          role: { type: Type.STRING },
          instrument: { type: Type.STRING },
          backstory: { type: Type.STRING }
        },
        required: ["stageName", "role", "instrument", "backstory"]
      }
    }
  });
  return extractJSON(response.text);
};

export const rewriteAsBallad = async (input: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Rewrite the following as a dramatic 80s power ballad in the style of Nestor: "${input}". Include [Verse] and [Chorus].`,
  });
  return response.text;
};

export const generateAlbumArt = async (title: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [{ text: `An 80s melodic hard rock album cover for a band called NESTOR. The album title is "${title}". Neon pink and cyan color palette, grid background, chrome lettering.` }]
    },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("Ingen bild genererades.");
};
