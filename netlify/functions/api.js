const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  try {
    // 1. Get Visitor Count & Create/Update Visitor
    if (path === '/getVisitorCount' && event.httpMethod === 'GET') {
      const allVisitors = await visitorsStore.list();
      return { statusCode: 200, headers, body: JSON.stringify({ count: 100 + allVisitors.blobs.length }) };
    }

    if (path === '/createVisitor' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const token = body.visitor_token;

      if (!token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token missing' }) };
      }

      let existingVisitor = null;
      try {
        existingVisitor = await visitorsStore.getJSON(token);
      } catch (e) {}

      let guestNumber;
      const now = new Date().toISOString();

      if (existingVisitor) {
        guestNumber = existingVisitor.guestNumber;
        await visitorsStore.setJSON(token, {
          ...existingVisitor,
          visitor_name: body.visitor_name || existingVisitor.visitor_name,
          mobile_number: body.mobile_number || existingVisitor.mobile_number,
          language: body.language || existingVisitor.language,
          lastVisit: now
        });
      } else {
        const allVisitors = await visitorsStore.list();
        guestNumber = 101 + allVisitors.blobs.length;

        await visitorsStore.setJSON(token, {
          ...body,
          guestNumber,
          createdAt: now,
          lastVisit: now
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, guestNumber }) };
    }

    // 2. RSVP
    if (path === '/rsvp' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.visitor_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token missing' }) };
      }
      await rsvpStore.setJSON(body.visitor_token, { ...body, updatedAt: new Date().toISOString() });
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // 3. Gender Vote & Results
    if (path === '/gender' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.visitor_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token missing' }) };
      }
      await votesStore.setJSON(`gender_${body.visitor_token}`, body.selection);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (path === '/gender/results' && event.httpMethod === 'GET') {
      const { blobs } = await votesStore.list({ prefix: 'gender_' });
      let boy = 0, girl = 0;
      for (const b of blobs) {
        const val = await votesStore.get(b.key);
        if (val === 'boy') boy++;
        if (val === 'girl') girl++;
      }
      return { statusCode: 200, headers, body: JSON.stringify({ boy, girl, total: boy + girl }) };
    }

    // 4. Arrival Month Vote & Results
    if (path === '/arrival' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.visitor_token) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token missing' }) };
      }
      await votesStore.setJSON(`arrival_${body.visitor_token}`, body.selected_month);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    if (path === '/arrival/results' && event.httpMethod === 'GET') {
      const { blobs } = await votesStore.list({ prefix: 'arrival_' });
      const counts = { August: 0, September: 0, October: 0 };
      for (const b of blobs) {
        const val = await votesStore.get(b.key);
        if (counts[val] !== undefined) counts[val]++;
      }
      const total = counts.August + counts.September + counts.October;
      return { statusCode: 200, headers, body: JSON.stringify({ ...counts, total }) };
    }

    // 5. Baby Name Suggestions
    if (path === '/babyname' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      await namesStore.setJSON(`name_${Date.now()}_${Math.random()}`, body);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found', path }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};