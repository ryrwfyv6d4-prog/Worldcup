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

      // GET /highlight — resolve a match highlights video, shared-cached in R2.
      // Query: ?home=France&away=Senegal&hs=3&as=1  (hs/as optional)
      // Tries FIFA channel then SBS Sport. Caches the resolved videoId so all
      // users share one lookup and we make at most ~1 API call per match per day.
      if (request.method === 'GET' && path === '/highlight') {
        const home = url.searchParams.get('home') || '';
        const away = url.searchParams.get('away') || '';
        const hs = url.searchParams.get('hs');
        const as_ = url.searchParams.get('as');
        if (!home || !away) return json({ videoId: null });

        const hasScore = hs != null && hs !== '' && as_ != null && as_ !== '';
        const cacheKey = hasScore
          ? `highlights/v7/${home}|${away}|${hs}-${as_}.json`
          : `highlights/v7/${home}|${away}.json`;

        // 1. Shared cache hit — zero quota
        const cached = await env.WALL.get(cacheKey);
        if (cached) {
          const c = JSON.parse(await cached.text());
          if (c.videoId) return json({ videoId: c.videoId, source: c.source || 'cache' });
          // negative cache: only re-try after 30 min
          if (Date.now() - (c.ts || 0) < 30 * 60 * 1000) return json({ videoId: null });
        }

        const keys = [env.YOUTUBE_API_KEY, env.YOUTUBE_API_KEY_BACKUP].filter(Boolean);
        if (!keys.length) return json({ videoId: null });

        const query = `${home} ${away} FIFA World Cup 2026 highlights`;

        const FIFA_CHANNEL = 'UCpcTrCXblq78GZrTUTLWeBw';
        const SBS_CHANNEL = 'UCn6UMS98Ox-B3jkSWlweJ2w';
        const PUBLISHED_AFTER = '2026-06-01T00:00:00Z';

        const ALIASES = {
          'turkey': 'türkiye',
          'usa': 'united states',
          'south korea': 'korea republic',
          'czech republic': 'czechia',
          "ivory coast": "côte d'ivoire",
        };
        const teamInTitle = (name, title) => {
          const n = name.toLowerCase();
          if (title.includes(n)) return true;
          const alias = ALIASES[n];
          return alias ? title.includes(alias) : false;
        };

        async function searchChannel(channelId, apiKey) {
          try {
            const r = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&q=${encodeURIComponent(query)}&type=video&maxResults=5&order=relevance&publishedAfter=${PUBLISHED_AFTER}&key=${apiKey}`
            );
            const j = await r.json();
            if (j.error?.errors?.[0]?.reason === 'quotaExceeded') return 'QUOTA_EXCEEDED';
            const items = j.items || [];
            const t = (s) => s?.toLowerCase() || '';
            const m = items.find((i) => {
              const title = t(i.snippet?.title);
              if (!title.includes('highlight') || !title.includes('2026')) return false;
              if (!teamInTitle(home, title) || !teamInTitle(away, title)) return false;
              return true;
            });
            return m?.id?.videoId || null;
          } catch {
            return null;
          }
        }

        // Try each API key in turn, falling back on quota exhaustion
        // SBS checked first — uploads faster and more reliably than FIFA channel
        let videoId = null;
        let source = 'sbs';
        for (const apiKey of keys) {
          videoId = await searchChannel(SBS_CHANNEL, apiKey);
          if (videoId === 'QUOTA_EXCEEDED') { videoId = null; continue; }
          if (!videoId) {
            const fifa = await searchChannel(FIFA_CHANNEL, apiKey);
            if (fifa === 'QUOTA_EXCEEDED') continue;
            if (fifa) { videoId = fifa; source = 'fifa'; }
          }
          if (videoId) break;
        }

        // Cache the outcome (positive forever, negative with a timestamp)
        await env.WALL.put(
          cacheKey,
          JSON.stringify(videoId ? { videoId, source, ts: Date.now() } : { videoId: null, ts: Date.now() }),
          { httpMetadata: { contentType: 'application/json' } }
        );

        return json({ videoId, source: videoId ? source : null });
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
