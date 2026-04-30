import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import fetch from 'node-fetch';
import corsLib from 'cors';

admin.initializeApp();

const allowedOrigins = [
  'https://triptrackerapp.tech',
  'https://routetracker-92b42.web.app',
];

const corsHandler = corsLib({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
});

// ─── Response types ───────────────────────────────────────────────
interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    geometry: {
      location: { lat: number; lng: number };
    };
  }>;
}

interface GoogleDirectionsResponse {
  status: string;
  routes: Array<{
    legs: Array<{
      distance: { value: number };
    }>;
    overview_polyline: { points: string };
  }>;
}



const GOOGLE_MAPS_API_KEY = defineSecret('GOOGLE_MAPS_API_KEY');
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_FROM_EMAIL = defineSecret('RESEND_FROM_EMAIL');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// ─── Auth helper ──────────────────────────────────────────────────
async function verifyToken(authHeader: string | undefined): Promise<admin.auth.DecodedIdToken | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return null;
  }
}

// ─── 1. Google Maps Route ─────────────────────────────────────────
export const googleMapsRoute = onRequest(
  { secrets: [GOOGLE_MAPS_API_KEY], cors: false },
  (req, res) => {
    corsHandler(req, res, async () => {
      const user = await verifyToken(req.headers.authorization);
      if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      const { fromAddress, toAddress } = req.body as { fromAddress: string; toAddress: string };
      if (!fromAddress || !toAddress) {
        res.status(400).json({ error: 'fromAddress and toAddress are required' });
        return;
      }

      const apiKey = GOOGLE_MAPS_API_KEY.value();

      const geocode = async (address: string) => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        const r = await fetch(url);
        const data = (await r.json()) as GoogleGeocodeResponse;
        if (data.status !== 'OK' || !data.results?.[0]) {
          throw new Error(`Geocode failed for: ${address}`);
        }
        return data.results[0].geometry.location;
      };

      try {
        const [origin, destination] = await Promise.all([geocode(fromAddress), geocode(toAddress)]);

        const directionsUrl =
          `https://maps.googleapis.com/maps/api/directions/json` +
          `?origin=${origin.lat},${origin.lng}` +
          `&destination=${destination.lat},${destination.lng}` +
          `&mode=driving&key=${apiKey}`;

        const dirRes = await fetch(directionsUrl);
        const dirData = (await dirRes.json()) as GoogleDirectionsResponse;

        if (dirData.status !== 'OK' || !dirData.routes?.[0]?.legs?.[0]) {
          res.status(422).json({ error: 'Could not calculate route', details: dirData.status });
          return;
        }

        const leg = dirData.routes[0].legs[0];
        const meters = leg.distance.value;
        const miles = parseFloat((meters / 1609.344).toFixed(1));
        const encodedPolyline = dirData.routes[0].overview_polyline.points;

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
      } catch (err: unknown) {
        console.error('googleMapsRoute error:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
      }
    });
  }
);

// ─── 2. Static Map Proxy ──────────────────────────────────────────
export const staticMapProxy = onRequest(
  { secrets: [GOOGLE_MAPS_API_KEY], cors: false },
  (req, res) => {
    corsHandler(req, res, async () => {
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
      } catch (err: unknown) {
        console.error('staticMapProxy error:', err);
        res.status(500).send('Internal server error');
      }
    });
  }
);

// ─── 3. Voucher Email Notifications (Resend) ──────────────────────
interface EmailPayload {
  action: 'submit' | 'approve' | 'reject' | 'final_approval';
  recipientEmail: string;
  employeeName: string;
  month: string;
  totalMiles: number;
  voucherId: string;
  nextApproverRole?: string;
  rejectionReason?: string;
}

function buildEmailContent(payload: EmailPayload): { subject: string; html: string } {
  const { action, employeeName, month, totalMiles, nextApproverRole, rejectionReason } = payload;
  switch (action) {
    case 'submit':
      return {
        subject: `Mileage Voucher Pending Approval – ${employeeName} (${month})`,
        html: `<h2>Mileage Voucher Submitted for Approval</h2><p><strong>${employeeName}</strong> has submitted a mileage voucher for <strong>${month}</strong> totaling <strong>${totalMiles} miles</strong>.</p><p>Please log in to the RouteTracker app to review and approve or return this voucher.</p>`,
      };
    case 'approve':
      return {
        subject: `Mileage Voucher Approved – ${employeeName} (${month})`,
        html: `<h2>Mileage Voucher Approved</h2><p>The mileage voucher for <strong>${employeeName}</strong> for <strong>${month}</strong> totaling <strong>${totalMiles} miles</strong> has been approved at this level.</p>${nextApproverRole ? `<p>The voucher has been forwarded to the <strong>${nextApproverRole}</strong> for further review.</p>` : `<p>No further approval is required at this stage.</p>`}<p>Please log in to the RouteTracker app to review.</p>`,
      };
    case 'reject':
      return {
        subject: `Mileage Voucher Returned – ${month}`,
        html: `<h2>Mileage Voucher Returned for Corrections</h2><p>Your mileage voucher for <strong>${month}</strong> totaling <strong>${totalMiles} miles</strong> has been returned for corrections.</p>${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}<p>Please log in to the RouteTracker app to make corrections and resubmit.</p>`,
      };
    case 'final_approval':
      return {
        subject: `Mileage Voucher Final Approval – ${employeeName} (${month})`,
        html: `<h2>Mileage Voucher Received Final Approval</h2><p>The mileage voucher for <strong>${employeeName}</strong> for <strong>${month}</strong> totaling <strong>${totalMiles} miles</strong> has received final approval and is ready for processing.</p><p>Please log in to the RouteTracker app to process the reimbursement.</p>`,
      };
    default:
      return { subject: 'RouteTracker Notification', html: '<p>You have a new notification in RouteTracker.</p>' };
  }
}

export const sendVoucherEmail = onRequest(
  { secrets: [RESEND_API_KEY, RESEND_FROM_EMAIL], cors: false },
  (req, res) => {
    corsHandler(req, res, async () => {
      const user = await verifyToken(req.headers.authorization);
      if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      const payload = req.body as EmailPayload;
      if (!payload.action || !payload.recipientEmail || !payload.employeeName || !payload.month || !payload.voucherId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const { subject, html } = buildEmailContent(payload);

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY.value()}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL.value(),
            to: payload.recipientEmail,
            subject,
            html,
          }),
        });

        if (!resendRes.ok) {
          const errorBody = await resendRes.text();
          console.error('Resend error:', resendRes.status, errorBody);
          res.status(502).json({ error: 'Failed to send email via Resend' });
          return;
        }

        res.json({ success: true });
      } catch (err: unknown) {
        console.error('sendVoucherEmail error:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
      }
    });
  }
);

// ─── 4. AI Trip Suggestions (Gemini) ─────────────────────────────
export interface TripSuggestion {
  fromAddress: string;
  toAddress: string;
  businessPurpose: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export const getTripSuggestions = onRequest(
  { secrets: [GEMINI_API_KEY], cors: false },
  (req, res) => {
    corsHandler(req, res, async () => {
      const user = await verifyToken(req.headers.authorization);
      if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      try {
        const db = admin.firestore();
        const tripsSnap = await db.collection('trips')
          .where('user_id', '==', user.uid)
          .orderBy('date', 'desc')
          .limit(20)
          .get();

        if (tripsSnap.empty) {
          res.json({ suggestions: [] });
          return;
        }

        const recentTrips = tripsSnap.docs.map((d) => ({
          date: d.data().date as string,
          from: d.data().from_address as string,
          to: d.data().to_address as string,
          purpose: d.data().purpose as string,
        }));

        const prompt =
          'Based on these recent trips, predict the top 3 most likely next trips for this user. ' +
          'Return a JSON array of up to 3 objects with fields: fromAddress, toAddress, businessPurpose. ' +
          'Only return the JSON array, no other text.\n\nRecent trips:\n' +
          JSON.stringify(recentTrips, null, 2);

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY.value()}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (!geminiRes.ok) {
          console.error('Gemini API error:', geminiRes.status, await geminiRes.text());
          res.status(502).json({ error: 'Failed to get AI suggestions' });
          return;
        }

        const geminiData = (await geminiRes.json()) as GeminiResponse;
        const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

        let suggestions: TripSuggestion[] = [];
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            suggestions = parsed.slice(0, 3).filter(
              (s) => s && typeof s.fromAddress === 'string' && typeof s.toAddress === 'string' && typeof s.businessPurpose === 'string'
            );
          }
        } catch {
          suggestions = [];
        }

        res.json({ suggestions });
      } catch (err: unknown) {
        console.error('getTripSuggestions error:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
      }
    });
  }
);

// ─── 5. Invite User ───────────────────────────────────────────────
export const inviteUser = onRequest(
  { secrets: [RESEND_API_KEY, RESEND_FROM_EMAIL], cors: false },
  (req, res) => {
    corsHandler(req, res, async () => {
      const caller = await verifyToken(req.headers.authorization);
      if (!caller) { res.status(401).json({ error: 'Unauthorized' }); return; }

      if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

      // Verify caller is an admin via Firestore
      const db = admin.firestore();
      const adminSnap = await db.collection('user_roles')
        .where('user_id', '==', caller.uid)
        .where('role', '==', 'admin')
        .get();
      if (adminSnap.empty) { res.status(403).json({ error: 'Forbidden: admin role required' }); return; }

      const { email } = req.body as { email: string };
      if (!email || typeof email !== 'string' || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(email.trim())) {
        res.status(400).json({ error: 'A valid email address is required' });
        return;
      }

      try {
        // Create or retrieve the Firebase Auth user
        let uid: string;
        try {
          const existing = await admin.auth().getUserByEmail(email);
          uid = existing.uid;
        } catch {
          const newUser = await admin.auth().createUser({ email });
          uid = newUser.uid;
        }

        // Generate a password reset link (serves as the invitation / setup link)
        const actionLink = await admin.auth().generatePasswordResetLink(email);

        // Ensure a profile document exists in Firestore
        const profileRef = db.collection('profiles').doc(uid);
        const profileSnap = await profileRef.get();
        if (!profileSnap.exists) {
          await profileRef.set({ user_id: uid, email, created_at: admin.firestore.FieldValue.serverTimestamp() });
        }

        // Send invitation email via Resend
        const inviteHtml = `
          <h2>You've been invited to RouteTracker</h2>
          <p>An administrator has invited you to join the RouteTracker mileage tracking application.</p>
          <p>Click the button below to set your password and get started:</p>
          <p><a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Accept Invitation &amp; Set Password</a></p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;">${actionLink}</p>
          <p>This link will expire in 24 hours.</p>
        `;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY.value()}`,
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL.value(),
            to: email,
            subject: 'You\'ve been invited to RouteTracker',
            html: inviteHtml,
          }),
        });

        if (!resendRes.ok) {
          const errorBody = await resendRes.text();
          console.error('Resend invite error:', resendRes.status, errorBody);
          res.status(502).json({ error: 'Failed to send invitation email' });
          return;
        }

        res.json({ success: true, uid });
      } catch (err: unknown) {
        console.error('inviteUser error:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
      }
    });
  }
);
