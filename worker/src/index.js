const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /photos — list all photos, newest first
    if (request.method === 'GET' && path === '/photos') {
      const list = await env.WALL.list({ prefix: 'photos/' });
      const photos = await Promise.all(
        list.objects.map(async (obj) => {
          const item = await env.WALL.get(obj.key);
          return item ? JSON.parse(await item.text()) : null;
        })
      );
      const sorted = photos
        .filter(Boolean)
        .sort((a, b) => b.ts - a.ts);
      return new Response(JSON.stringify(sorted), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // POST /photos — store a new photo
    if (request.method === 'POST' && path === '/photos') {
      const body = await request.json();
      const id = Date.now();
      const photo = { id, ts: id, ...body };
      await env.WALL.put(`photos/${id}.json`, JSON.stringify(photo), {
        httpMetadata: { contentType: 'application/json' },
      });
      return new Response(JSON.stringify(photo), {
        status: 201,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /photos/:id
    const deleteMatch = path.match(/^\/photos\/(\d+)$/);
    if (request.method === 'DELETE' && deleteMatch) {
      const id = deleteMatch[1];
      await env.WALL.delete(`photos/${id}.json`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};
