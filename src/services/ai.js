/**
 * AI Service for Dressflow
 * Handles background removal using remove.bg API.
 */

export const removeBackground = async (imageFile) => {
  const apiKey = import.meta.env.VITE_REMOVE_BG_KEY;
  
  if (!apiKey) {
    console.warn("VITE_REMOVE_BG_KEY manquante dans le fichier .env. Utilisation du mode simulation.");
    return new Promise(resolve => setTimeout(() => resolve(imageFile), 2000));
  }

  try {
    const formData = new FormData();
    formData.append('image_file', imageFile);
    formData.append('size', 'auto');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.title || "Erreur lors du détourage");
    }

    const resultBlob = await response.blob();
    return resultBlob;
  } catch (error) {
    console.error("Erreur AI:", error);
    throw error;
  }
}
