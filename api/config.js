export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ""
  });
}
