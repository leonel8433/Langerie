
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

export const extractCatalog = async (
  fileBase64: string, 
  mimeType: string, 
  applyMarkup: boolean = false
): Promise<Product[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: fileBase64,
            },
          },
          {
            text: `Extraia a lista de produtos deste catálogo de lingeries. 
            ${applyMarkup ? "IMPORTANTE: Todos os preços encontrados são de ATACADO. Você deve DOBRAR os valores (preço * 2) para o preço de venda final." : ""}
            Retorne obrigatoriamente um array JSON de objetos com os campos: 'name' (string), 'reference' (string), 'description' (string), 'price' (number), 'colors' (array de strings) e 'sizes' (array de strings). 
            Não inclua explicações, retorne apenas o JSON puro.`
          }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reference: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.NUMBER },
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              sizes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "reference", "price"]
          }
        }
      }
    });

    const rawText = response.text;
    if (!rawText) return [];

    try {
      const products = JSON.parse(rawText.trim());
      
      return products.map((p: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: p.name || "Produto Sem Nome",
        reference: p.reference || "",
        description: p.description || "",
        price: Number(p.price) || 0,
        colors: p.colors || [],
        sizes: p.sizes || []
      }));
    } catch (parseError) {
      console.error("Erro no parse do JSON", parseError);
      throw new Error("Erro de formatação nos dados extraídos.");
    }
  } catch (error) {
    console.error("Erro Gemini:", error);
    throw error;
  }
};

export const extractFromUrl = async (url: string, applyMarkup: boolean = true): Promise<Product[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Acesse o site ${url} (fabricante de lingerie Provence). Identifique os principais produtos, suas referências e preços. 
      ${applyMarkup ? "Dobre todos os preços encontrados (margem de 100%)." : ""}
      Retorne um array JSON com: 'name', 'reference', 'description', 'price', 'colors' (array), 'sizes' (array). 
      Se não conseguir acessar diretamente, use seu conhecimento sobre a marca Provence Lingerie para listar os itens clássicos com preços estimados baseados no mercado de atacado atual, aplicando a margem.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reference: { type: Type.STRING },
              description: { type: Type.STRING },
              price: { type: Type.NUMBER },
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              sizes: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "price"]
          }
        }
      },
    });

    const rawText = response.text;
    if (!rawText) return [];
    return JSON.parse(rawText.trim()).map((p: any) => ({
      ...p,
      id: Math.random().toString(36).substr(2, 9),
      price: Number(p.price) || 0
    }));
  } catch (error) {
    console.error("Erro Web Import:", error);
    throw error;
  }
};
