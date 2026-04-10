const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // GET /state — load shared draw state
      if (request.method === 'GET' && path === '/state') {
        const item = await env.WALL.get('app-state.json');
        if (!item) return json(null);
        return json(JSON.parse(await item.text()));
      }

      // PUT /state — save shared draw state
      if (request.method === 'PUT' && path === '/state') {
        const body = await request.json();
        await env.WALL.put('app-state.json', JSON.stringify(body), {
          httpMetadata: { contentType: 'application/json' },
        });
        return json({ ok: true });
      }

      // GET /photos — list all photos, newest first
      if (request.method === 'GET' && path === '/photos') {
        const list = await env.WALL.list({ prefix: 'photos/' });
        const photos = await Promise.all(
          list.objects.map(async (obj) => {
            const item = await env.WALL.get(obj.key);
            return item ? JSON.parse(await item.text()) : null;
          })
        );
        return json(photos.filter(Boolean).sort((a, b) => b.ts - a.ts));
      }

      // POST /photos — store a new photo
      if (request.method === 'POST' && path === '/photos') {
        const body = await request.json();
        const id = Date.now();
        const photo = { id, ts: id, ...body };
        await env.WALL.put(`photos/${id}.json`, JSON.stringify(photo), {
          httpMetadata: { contentType: 'application/json' },
        });
        return json(photo, 201);
      }

      // DELETE /photos/:id
      const deleteMatch = path.match(/^\/photos\/(\d+)$/);
      if (request.method === 'DELETE' && deleteMatch) {
        await env.WALL.delete(`photos/${deleteMatch[1]}.json`);
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      // Always return CORS headers so the browser sees the error, not a CORS failure
      return json({ error: e.message }, 500);
    }
  },
};
