import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore({ name: "arrival_votes", consistency: "strong" });

    if (req.method === "GET") {
      const votes = (await store.get("votes", { type: "json" })) || {};
      return new Response(JSON.stringify(votes), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      let body = {};
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }

      const month = String(body.month || body.arrivalMonth || body.selection || "TBD").trim().slice(0, 30);

      const votes = (await store.get("votes", { type: "json" })) || {};
      votes[month] = (votes[month] || 0) + 1;
      await store.setJSON("votes", votes);

      return new Response(JSON.stringify({ success: true, votes }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};