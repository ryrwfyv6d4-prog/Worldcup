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

        const photo = { id, ts: id, caption, person, reactions: {} };
        await env.WALL.put(`photos/${id}.json`, JSON.stringify(photo), {
          httpMetadata: { contentType: 'application/json' },
        });

        return json(photo, 201);
      }

      // POST /photos/:id/reactions — toggle emoji reaction for a person
      const reactMatch = path.match(/^\/photos\/(\d+)\/reactions$/);
      if (request.method === 'POST' && reactMatch) {
        const id = reactMatch[1];
        const { emoji, person } = await request.json();
        const item = await env.WALL.get(`photos/${id}.json`);
        if (!item) return json({ error: 'Not found' }, 404);
        const photo = JSON.parse(await item.text());
        const reactions = photo.reactions || {};
        const people = reactions[emoji] || [];
        const idx = people.indexOf(person);
        if (idx === -1) {
          reactions[emoji] = [...people, person];
        } else {
          reactions[emoji] = people.filter((_, i) => i !== idx);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        }
        photo.reactions = reactions;
        await env.WALL.put(`photos/${id}.json`, JSON.stringify(photo), {
          httpMetadata: { contentType: 'application/json' },
        });
        return json(reactions);
      }

      // GET /photos/:id/image — serve raw image from R2
      const imageMatch = path.match(/^\/photos\/(\d+)\/image$/);
      if (request.method === 'GET' && imageMatch) {
        const item = await env.WALL.get(`photos/${imageMatch[1]}.img`);
        if (!item) return json({ error: 'Not found' }, 404);
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

      // GET /predictions — load all predictions
      if (request.method === 'GET' && path === '/predictions') {
        const item = await env.WALL.get('predictions.json');
        if (!item) return json({});
        return json(JSON.parse(await item.text()));
      }

      // POST /predictions — save a prediction { matchId, person, pick }
      if (request.method === 'POST' && path === '/predictions') {
        const { matchId, person, pick } = await request.json();
        const item = await env.WALL.get('predictions.json');
        const preds = item ? JSON.parse(await item.text()) : {};
        if (!preds[matchId]) preds[matchId] = {};
        preds[matchId][person] = pick;
        await env.WALL.put('predictions.json', JSON.stringify(preds), {
          httpMetadata: { contentType: 'application/json' },
        });
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
