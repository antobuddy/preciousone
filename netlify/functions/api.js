import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api/, ''); // handles Netlify routing

  // Connect to Netlify Blobs stores
  const visitorsStore = getStore('visitors');
  const votesStore = getStore('votes');
  const rsvpStore = getStore('rsvp');
  const namesStore = getStore('names');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  try {
    // 1. Get Visitor Count & Create Visitor
    if (path === '/getVisitorCount' && req.method === 'GET') {
      const allVisitors = await visitorsStore.list();
      return new Response(JSON.stringify({ count: 100 + allVisitors.blobs.length }), { status: 200, headers });
    }

    if (path === '/createVisitor' && req.method === 'POST') {
      const body = await req.json();
      const allVisitors = await visitorsStore.list();
      const guestNumber = 101 + allVisitors.blobs.length;
      
      await visitorsStore.setJSON(body.visitor_token, {
        ...body,
        guestNumber,
        createdAt: new Date().toISOString()
      });

      return new Response(JSON.stringify({ success: true, guestNumber }), { status: 200, headers });
    }

    // 2. RSVP
    if (path === '/rsvp' && req.method === 'POST') {
      const body = await req.json();
      await rsvpStore.setJSON(body.visitor_token, { ...body, updatedAt: new Date().toISOString() });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // 3. Gender Vote & Results
    if (path === '/gender' && req.method === 'POST') {
      const body = await req.json();
      await votesStore.setJSON(`gender_${body.visitor_token}`, body.selection);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (path === '/gender/results' && req.method === 'GET') {
      const { blobs } = await votesStore.list({ prefix: 'gender_' });
      let boy = 0, girl = 0;
      for (const b of blobs) {
        const val = await votesStore.get(b.key);
        if (val === 'boy') boy++;
        if (val === 'girl') girl++;
      }
      return new Response(JSON.stringify({ boy, girl, total: boy + girl }), { status: 200, headers });
    }

    // 4. Arrival Month Vote & Results
    if (path === '/arrival' && req.method === 'POST') {
      const body = await req.json();
      await votesStore.setJSON(`arrival_${body.visitor_token}`, body.selected_month);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    if (path === '/arrival/results' && req.method === 'GET') {
      const { blobs } = await votesStore.list({ prefix: 'arrival_' });
      const counts = { August: 0, September: 0, October: 0 };
      for (const b of blobs) {
        const val = await votesStore.get(b.key);
        if (counts[val] !== undefined) counts[val]++;
      }
      const total = counts.August + counts.September + counts.October;
      return new Response(JSON.stringify({ ...counts, total }), { status: 200, headers });
    }

    // 5. Baby Name Suggestions
    if (path === '/babyname' && req.method === 'POST') {
      const body = await req.json();
      await namesStore.setJSON(`name_${Date.now()}_${Math.random()}`, body);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found' }), { status: 404, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/*"
};