// Configuration file template for Vanguard Hazard Intelligence
// Safe to commit to GitHub
export const config = {
  openMeteoApiUrl: "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m",
  openRouteServiceToken: process.env.OPENROUTE_SERVICE_TOKEN || "YOUR_OPENROUTE_SERVICE_TOKEN",
  nasaMapKey: process.env.NASA_MAP_KEY || "YOUR_NASA_MAP_KEY",
  geminiApiKey: process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY",
};
