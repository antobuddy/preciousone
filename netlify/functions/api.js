import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/^\/\.netlify\/functions\/api/, '');
    if (path.startsWith('/api')) {
      path = path.replace(/^\/api/, '');
    }

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const visitorsStore = getStore('visitors');
    const votesStore = getStore('votes');
    const rsvpStore = getStore('rsvp');
    const namesStore = getStore('names');

    // 1. Get Visitor Count
    if (path === '/getVisitorCount' && req.method === 'GET') {
      let count = 100;
      try {
        const allVisitors = await visitorsStore.list();
        count = 100 + (allVisitors?.blobs?.length || 0);
      } catch (e) {}
      return new Response(JSON.stringify({ count }), { status: 200, headers });
    }

    // 2. Create/Update Visitor Token
    if (path === '/createVisitor' && req.method === 'POST') {
      const body = await req.json();
      const token = body.visitor_token;

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers });
      }

      let existingVisitor = null;
      try {
        existingVisitor = await visitorsStore.getJSON(token);
      } catch (e) {}

      let guestNumber = 101;
      const now = new Date().toISOString();

      if (existingVisitor) {
        guestNumber = existingVisitor.guestNumber || 101;
        await visitorsStore.setJSON(token, {
          ...existingVisitor,
          visitor_name: body.visitor_name || existingVisitor.visitor_name,
          mobile_number: body.mobile_number || existingVisitor.mobile_number,
          language: body.language || existingVisitor.language,
          lastVisit: now
        });
      } else {
        let allVisitors = { blobs: [] };
        try {
          allVisitors = await visitorsStore.list();
        } catch (e) {}
        guestNumber = 101 + (allVisitors?.blobs?.length || 0);

        await visitorsStore.setJSON(token, {
          ...body,
          guestNumber,
          createdAt: now,
          lastVisit: now
        });
      }

      return new Response(JSON.stringify({ success: true, guestNumber }), { status: 200, headers });
    }

    // 3. RSVP
    if (path === '/rsvp' && req.method === 'POST') {
      const body = await req.json();
      if (!body.visitor_token) {
        return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers });
      }
      await rsvpStore.setJSON(body.visitor_token, { ...body, updatedAt: new Date().toISOString() });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // 4. Gender Vote
    if (path === '/gender') {
      if (req.method === 'POST') {
        const body = await req.json();
        if (!body.visitor_token) {
          return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers });
        }
        const selection = body.selection || body.vote;
        await votesStore.set(`gender_${body.visitor_token}`, selection);
      }

      let boy = 0, girl = 0;
      try {
        const { blobs } = await votesStore.list({ prefix: 'gender_' });
        for (const b of (blobs || [])) {
          const val = await votesStore.get(b.key);
          if (val === 'boy') boy++;
          if (val === 'girl') girl++;
        }
      } catch (e) {}
      return new Response(JSON.stringify({ votes: { boy, girl } }), { status: 200, headers });
    }

    // 5. Arrival Vote
    if (path === '/arrival') {
      if (req.method === 'POST') {
        const body = await req.json();
        if (!body.visitor_token) {
          return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers });
        }
        const month = body.selected_month || body.vote;
        await votesStore.set(`arrival_${body.visitor_token}`, month);
      }

      const counts = { August: 0, September: 0, October: 0 };
      try {
        const { blobs } = await votesStore.list({ prefix: 'arrival_' });
        for (const b of (blobs || [])) {
          const val = await votesStore.get(b.key);
          if (counts[val] !== undefined) counts[val]++;
        }
      } catch (e) {}
      return new Response(JSON.stringify({ votes: counts }), { status: 200, headers });
    }

    // 6. Baby Name Suggestions
    if (path === '/babyname' && req.method === 'POST') {
      const body = await req.json();
      await namesStore.setJSON(`name_${Date.now()}_${Math.random()}`, body);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found', path }), { status: 404, headers });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};

export const config = {
  path: "/api/*"
};