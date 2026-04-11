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
      return new Response(null, { status: 204, headers: CORS_HEADERS });
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
        const jsonObjects = list.objects.filter((obj) => obj.key.endsWith('.json'));
        const photos = await Promise.all(
          jsonObjects.map(async (obj) => {
            const item = await env.WALL.get(obj.key);
            return item ? JSON.parse(await item.text()) : null;
          })
        );
        return json(photos.filter(Boolean).sort((a, b) => b.ts - a.ts));
      }

      // POST /photos — multipart/form-data (image + caption + person)
      // FormData upload is a CORS simple request — no preflight — works on iOS Safari
      if (request.method === 'POST' && path === '/photos') {
        const formData = await request.formData();
        const image = formData.get('image');
        const caption = formData.get('caption') || '';
        const person = formData.get('person') || '';
        const id = Date.now();
        const contentType = image.type || 'image/jpeg';
        const imageData = await image.arrayBuffer();

        await env.WALL.put(`photos/${id}.img`, imageData, {
          httpMetadata: { contentType },
        });

        const photo = { id, ts: id, caption, person };
        await env.WALL.put(`photos/${id}.json`, JSON.stringify(photo), {
          httpMetadata: { contentType: 'application/json' },
        });

        return json(photo, 201);
      }

      // GET /photos/:id/image — serve raw image from R2
      const imageMatch = path.match(/^\/photos\/(\d+)\/image$/);
      if (request.method === 'GET' && imageMatch) {
        const item = await env.WALL.get(`photos/${imageMatch[1]}.img`);
        if (!item) return json({ error: 'Not found' }, 404);
        // Use arrayBuffer() instead of item.body (ReadableStream) to avoid
        // streaming issues with binary data in Cloudflare Workers
        const imageData = await item.arrayBuffer();
        return new Response(imageData, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': item.httpMetadata?.contentType || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }

      // DELETE /photos/:id
      const deleteMatch = path.match(/^\/photos\/(\d+)$/);
      if (request.method === 'DELETE' && deleteMatch) {
        const id = deleteMatch[1];
        await Promise.all([
          env.WALL.delete(`photos/${id}.json`),
          env.WALL.delete(`photos/${id}.img`),
        ]);
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
