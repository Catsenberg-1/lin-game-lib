// ============================================================
// Netlify Serverless Function — 全用户累计占卜计数
// ============================================================
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers, status: 204 });
  }

  try {
    const store = getStore("divination-counter");

    // GET — 读取当前计数
    if (req.method === "GET") {
      const val = await store.get("total");
      const count = val ? parseInt(val, 10) : 0;
      return new Response(JSON.stringify({ count }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // POST — 递增计数
    if (req.method === "POST") {
      const val = await store.get("total");
      const count = (val ? parseInt(val, 10) : 0) + 1;
      await store.set("total", count.toString());
      return new Response(JSON.stringify({ count }), {
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
};
