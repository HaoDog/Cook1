import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize the Gemini API client
// The API key is automatically injected by AI Studio
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface RecipeResult {
  recipeName: string;
  description: string;
  imageSeed: string;
  ingredients: string[];
  steps: string[];
  nutrition: {
    calories: string;
    protein: string;
    fat: string;
    advice: string;
  };
}

const recipeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    recipeName: {
      type: Type.STRING,
      description: "菜谱的名称，尽量可爱有趣",
    },
    description: {
      type: Type.STRING,
      description: "菜谱的简单描述，吸引小朋友",
    },
    imageSeed: {
      type: Type.STRING,
      description: "一个简短的英文单词或词组，代表菜品的主体（例如 'fried rice', 'beef stew', 'salad'），用于生成美食图片",
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "所需食材清单",
    },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "详细的烹饪步骤，语言简单易懂",
    },
    nutrition: {
      type: Type.OBJECT,
      properties: {
        calories: { type: Type.STRING, description: "卡路里估算，例如 '300千卡'" },
        protein: { type: Type.STRING, description: "蛋白质估算，例如 '15克'" },
        fat: { type: Type.STRING, description: "脂肪估算，例如 '10克'" },
        advice: { type: Type.STRING, description: "给小朋友的健康饮食建议，语气亲切" },
      },
      required: ["calories", "protein", "fat", "advice"],
    },
  },
  required: ["recipeName", "description", "imageSeed", "ingredients", "steps", "nutrition"],
};

export async function generateRecipe(query: string): Promise<RecipeResult | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `用户想吃或者有这些食材："${query}"。请为青少年和儿童生成一份健康、美味、有趣的菜谱，并包含营养分析。`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: recipeSchema,
        temperature: 0.7,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as RecipeResult;
    }
    return null;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
}

export async function generateRecipeImage(description: string, seedWord: string): Promise<string | null> {
  try {
    const prompt = `High quality appetizing food photography, beautifully plated delicious dish of ${description}. Focus on ${seedWord}. Clean background, bright lighting, suitable for a recipe app.`;
    
    // Using our Express backend proxy to call Qwen API
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      console.error("Failed to generate image via proxy", await response.text());
      return null;
    }

    const data = await response.json();
    return data.url || null;

  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}
