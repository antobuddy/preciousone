// netlify/functions/createVisitor.js
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const store = getStore({ name: "visitors", consistency: "strong" });
    const current = (await store.get("count", { type: "json" })) || { total: 0 };
    const newTotal = current.total + 1;
    
    await store.setJSON("count", { total: newTotal });

    return new Response(JSON.stringify({ success: true, total: newTotal }), {
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