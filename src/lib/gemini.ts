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

export async function generateRecipe(query: string): Promise<RecipeResult | null> {
  try {
    const response = await fetch("/api/generate-recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      console.error("Failed to generate recipe via Qwen proxy", await response.text());
      return null;
    }

    const data = await response.json();
    return data as RecipeResult;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
}

export async function generateRecipeImage(description: string, seedWord: string): Promise<string | null> {
  try {
    const prompt = `High quality appetizing food photography, beautifully plated delicious dish of ${description}. Focus on ${seedWord}. Clean background, bright lighting, suitable for a recipe app.`;
    
    // Step 1: Submit to our proxy
    const submitRes = await fetch("/api/generate-image/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    if (!submitRes.ok) {
      console.error("Failed to submit image task", await submitRes.text());
      return null;
    }

    const { taskId } = await submitRes.json();
    if (!taskId) return null;

    // Step 2: Poll on the frontend to avoid backend Nginx timeouts (60s limit)
    let pings = 0;
    while (pings < 40) { // Up to 80 seconds max
      await new Promise(r => setTimeout(r, 2000));
      pings++;

      const statusRes = await fetch(`/api/generate-image/status?taskId=${taskId}`);
      if (!statusRes.ok) throw new Error(await statusRes.text());

      const statusData = await statusRes.json();
      
      if (statusData.status === 'SUCCEEDED') {
        return statusData.url;
      } else if (statusData.status === 'FAILED') {
        console.error("Image generation failed:", statusData.error);
        return null;
      }
      // If PENDING or RUNNING, keep looping
    }

    console.error("Image generation timed out on frontend");
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}
