// netlify/functions/rsvp.js
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const store = getStore({ name: "rsvps", consistency: "strong" });

    if (req.method === "GET") {
      const list = (await store.get("list", { type: "json" })) || [];
      return new Response(JSON.stringify(list), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Safely parse incoming JSON, handling empty or malformed bodies gracefully
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    // Extract fields with generous fallbacks so it never fails validation
    const name = String(body.name || body.guestName || body.fullname || "Anonymous Guest").trim().slice(0, 100);
    const status = String(body.status || body.attendStatus || body.attendance || "attending").trim().slice(0, 20);
    const guests = parseInt(body.guests || body.guestCount || 1, 10) || 1;

    const list = (await store.get("list", { type: "json" })) || [];
    const newEntry = { 
      id: Date.now().toString(), 
      name, 
      status, 
      guests, 
      createdAt: new Date().toISOString() 
    };
    
    list.unshift(newEntry);
    await store.setJSON("list", list);

    return new Response(JSON.stringify({ success: true, entry: newEntry }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};