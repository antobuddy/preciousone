import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore({ name: "baby_names", consistency: "strong" });

    if (req.method === "GET") {
      const list = (await store.get("list", { type: "json" })) || [];
      return new Response(JSON.stringify(list), {
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

      // Generous fallbacks for all possible frontend property names
      const name = String(body.name || body.babyName || body.title || "").trim().slice(0, 60);
      const meaning = String(body.meaning || body.desc || body.description || "").trim().slice(0, 150);
      const author = String(body.author || body.submittedBy || body.nameAuthor || "Guest").trim().slice(0, 60);

      const list = (await store.get("list", { type: "json" })) || [];
      const newEntry = { 
        id: Date.now().toString(), 
        name: name || "Unnamed", 
        meaning, 
        author, 
        createdAt: new Date().toISOString() 
      };

      list.unshift(newEntry);
      await store.setJSON("list", list);

      return new Response(JSON.stringify({ success: true, entry: newEntry }), {
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