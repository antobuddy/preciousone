import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore({ name: "gender_votes", consistency: "strong" });

    if (req.method === "GET") {
      const votes = (await store.get("votes", { type: "json" })) || { boy: 0, girl: 0 };
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

      const vote = String(body.vote || body.gender || body.selection || "boy").trim().toLowerCase();

      const votes = (await store.get("votes", { type: "json" })) || { boy: 0, girl: 0 };
      if (votes[vote] !== undefined) {
        votes[vote] += 1;
      } else {
        votes.boy = (votes.boy || 0) + 1;
      }
      
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