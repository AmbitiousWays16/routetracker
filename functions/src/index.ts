import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import fetch from 'node-fetch';

admin.initializeApp();

const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

// ─── Auth helper ────────────────────────────────────────────────
async function verifyToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return null;
  }
}

// ─── 1. Google Maps Route ────────────────────────────────────────
// Replaces: VITE_WORKER_URL/google-maps-route
export const googleMapsRoute = onRequest(
  { secrets: [GOOGLE_MAPS_API_KEY], cors: true },
  async (req, res) => {
    const user = await verifyToken(req.headers.authorization);
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { fromAddress, toAddress } = req.body as { fromAddress: string; toAddress: string };
    if (!fromAddress || !toAddress) {
      res.status(400).json({ error: 'fromAddress and toAddress are required' });
      return;
    }

    const apiKey = GOOGLE_MAPS_API_KEY.value();

    // Geocode both addresses
    const geocode = async (address: string) => {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const r = await fetch(url);
      const data = await r.json() as any;
      if (data.status !== 'OK') throw new Error(`Geocode failed for: ${address}`);
      return data.results[0].geometry.location as { lat: number; lng: number };
    };

    try {
      const [origin, destination] = await Promise.all([geocode(fromAddress), geocode(toAddress)]);

      // Directions API
      const directionsUrl =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin.lat},${origin.lng}` +
        `&destination=${destination.lat},${destination.lng}` +
        `&mode=driving&key=${apiKey}`;

      const dirRes = await fetch(directionsUrl);
      const dirData = await dirRes.json() as any;

      if (dirData.status !== 'OK') {
        res.status(422).json({ error: 'Could not calculate route', details: dirData.status });
        return;
      }

      const leg = dirData.routes[0].legs[0];
      const meters = leg.distance.value as number;
      const miles = parseFloat((meters / 1609.344).toFixed(1));
      const encodedPolyline = dirData.routes[0].overview_polyline.points as string;

      res.json({
        miles,
        routeUrl: `https://www.google.com/maps/dir/${encodeURIComponent(fromAddress)}/${encodeURIComponent(toAddress)}`,
        routeMapData: {
          encodedPolyline,
          startLat: origin.lat,
          startLng: origin.lng,
          endLat: destination.lat,
          endLng: destination.lng,
        },
      });
    } catch (err: any) {
      console.error('googleMapsRoute error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
);

// ─── 2. Static Map Proxy ─────────────────────────────────────────
// Replaces: VITE_WORKER_URL/static-map-proxy
export const staticMapProxy = onRequest(
  { secrets: [GOOGLE_MAPS_API_KEY], cors: true },
  async (req, res) => {
    const user = await verifyToken(req.headers.authorization);
    if (!user) { res.status(401).send('Unauthorized'); return; }

    const { polyline, startLat, startLng, endLat, endLng } = req.query as Record<string, string>;
    if (!polyline || !startLat || !startLng || !endLat || !endLng) {
      res.status(400).send('Missing required query params');
      return;
    }

    const apiKey = GOOGLE_MAPS_API_KEY.value();
    const mapUrl =
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?size=600x300` +
      `&path=enc:${encodeURIComponent(polyline)}` +
      `&markers=color:green%7C${startLat},${startLng}` +
      `&markers=color:red%7C${endLat},${endLng}` +
      `&key=${apiKey}`;

    try {
      const mapRes = await fetch(mapUrl);
      if (!mapRes.ok) {
        res.status(502).send('Failed to fetch map image from Google');
        return;
      }
      const buffer = await mapRes.buffer();
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err: any) {
      console.error('staticMapProxy error:', err);
      res.status(500).send('Internal server error');
    }
  }
);

// ─── 3. Trip Purpose Suggestions (AI) ───────────────────────────
// Replaces: VITE_WORKER_URL/trip-purpose-suggestions
export const tripPurposeSuggestions = onRequest(
  { secrets: [OPENAI_API_KEY], cors: true },
  async (req, res) => {
    const user = await verifyToken(req.headers.authorization);
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const { program, toAddress } = req.body as { program: string; toAddress: string };
    if (!program || !toAddress) {
      res.status(400).json({ error: 'program and toAddress are required' });
      return;
    }

    try {
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You generate short, professional business purpose descriptions for mileage reimbursement forms. Return only the suggestion text, no quotes, no extra explanation.',
            },
            {
              role: 'user',
              content: `Program: ${program}\nDestination: ${toAddress}\n\nWrite a one-sentence business purpose for this trip.`,
            },
          ],
          max_tokens: 80,
          temperature: 0.7,
        }),
      });

      const aiData = await aiRes.json() as any;
      const suggestion = aiData?.choices?.[0]?.message?.content?.trim();

      if (!suggestion) {
        res.status(502).json({ error: 'No suggestion returned from AI' });
        return;
      }

      res.json({ suggestion });
    } catch (err: any) {
      console.error('tripPurposeSuggestions error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
);
