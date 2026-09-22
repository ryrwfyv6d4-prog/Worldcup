// Every change to the shared sweep state, as a small operation.
//
// Phones used to send the whole state back after every edit, and the worker
// stored whatever arrived last. A phone that had been sitting in a pocket
// since breakfast would vote on a poll and quietly delete every Wall post made
// since. Now a phone sends only what it did ("add this post", "Jake votes 2"),
// and the worker applies it to the latest copy. The same function runs on the
// phone (so the change shows at once) and in the worker (so it lands on the
// real thing), which is why this file imports nothing.

export const EMPTY_STATE = {
  assignments: {},   // { player: [team, team, team, team] }
  drawLocked: false,
  wallPosts: [],     // { id, person, text, ts, note? }
  polls: [],         // { id, person, q, options: [..], votes: { person: optionIndex }, ts }
  manualMedals: {},  // { teamName: ['CUP','BIG_PUSH'] }
  bonusPoints: {},   // { player: { key: { pts, label } } }
  deleted: [],       // ids of removed posts and polls, so a stale copy can't bring them back
};

const WALL_CAP = 200;
const DELETED_CAP = 1000;

const byNewest = (a, b) => (b.ts || 0) - (a.ts || 0);

function withNote(state, note) {
  if (!note || (state.wallPosts || []).some((p) => p.id === note.id)) return state;
  return { ...state, wallPosts: [{ ...note, note: true }, ...(state.wallPosts || [])].slice(0, WALL_CAP) };
}

// Apply one operation. Anything that no longer makes sense against the latest
// state (a swap of a club its owner has since traded, a redraw after the lock)
// is dropped rather than forced through.
export function applyOp(input, op) {
  const s = { ...EMPTY_STATE, ...(input || {}) };
  if (!op || typeof op !== 'object') return s;
  const deleted = new Set(s.deleted || []);

  switch (op.type) {
    case 'wall.add': {
      const p = op.post;
      if (!p || p.id == null || deleted.has(p.id) || s.wallPosts.some((x) => x.id === p.id)) return s;
      return { ...s, wallPosts: [p, ...s.wallPosts].sort(byNewest).slice(0, WALL_CAP) };
    }
    case 'wall.remove':
      return {
        ...s,
        wallPosts: s.wallPosts.filter((x) => x.id !== op.id),
        deleted: [...deleted, op.id].slice(-DELETED_CAP),
      };

    case 'poll.add': {
      const p = op.poll;
      if (!p || p.id == null || deleted.has(p.id) || s.polls.some((x) => x.id === p.id)) return s;
      return { ...s, polls: [p, ...s.polls].sort(byNewest) };
    }
    case 'poll.vote':
      return {
        ...s,
        polls: s.polls.map((p) => {
          if (p.id !== op.id || !op.person) return p;
          const votes = { ...(p.votes || {}) };
          if (op.option == null) delete votes[op.person];
          else votes[op.person] = op.option;
          return { ...p, votes };
        }),
      };
    case 'poll.remove':
      return {
        ...s,
        polls: s.polls.filter((x) => x.id !== op.id),
        deleted: [...deleted, op.id].slice(-DELETED_CAP),
      };

    case 'medal.set': {
      const mm = { ...(s.manualMedals || {}) };
      const cur = mm[op.team] || [];
      if (Boolean(op.on) === cur.includes(op.key)) return s;
      mm[op.team] = op.on ? [...cur, op.key] : cur.filter((k) => k !== op.key);
      if (!mm[op.team].length) delete mm[op.team];
      return withNote({ ...s, manualMedals: mm }, op.note);
    }

    // A fresh draw, or scrapping one. Never once the draw is locked.
    case 'draw.set':
      if (s.drawLocked) return s;
      return { ...s, assignments: op.assignments || {} };
    case 'draw.lock':
      return { ...s, drawLocked: true };

    // Trade two clubs. Only goes through if each club is still with the
    // person the phone thought had it.
    case 'draw.swap': {
      const { a, b } = op;
      if (!a || !b || a.person === b.person) return s;
      if (!(s.assignments[a.person] || []).includes(a.team)) return s;
      if (!(s.assignments[b.person] || []).includes(b.team)) return s;
      const next = {};
      for (const [person, teams] of Object.entries(s.assignments)) {
        next[person] = (teams || []).map((t) => {
          if (person === a.person && t === a.team) return b.team;
          if (person === b.person && t === b.team) return a.team;
          return t;
        });
      }
      return withNote({ ...s, assignments: next }, op.note);
    }

    default:
      return s;
  }
}

export function applyOps(state, ops) {
  return (ops || []).reduce(applyOp, { ...EMPTY_STATE, ...(state || {}) });
}

function unionById(stored = [], incoming = [], deleted) {
  const out = new Map();
  for (const x of incoming || []) if (x && x.id != null && !deleted.has(x.id)) out.set(x.id, x);
  for (const x of stored || []) if (x && x.id != null) out.set(x.id, x);
  return [...out.values()].sort(byNewest);
}

// A whole-state PUT, from draw night or from a phone still running the old
// build. It can add, but it cannot take away: posts and polls are unioned,
// anything deleted stays deleted, and once the draw is locked the draw it
// sends is ignored.
export function mergeLegacy(stored, incoming) {
  if (!stored) return { ...EMPTY_STATE, ...(incoming || {}) };
  const s = { ...EMPTY_STATE, ...stored };
  const b = { ...EMPTY_STATE, ...(incoming || {}) };
  const deleted = new Set(s.deleted || []);

  const polls = unionById(s.polls, b.polls, deleted).map((p) => {
    const theirs = (b.polls || []).find((x) => x.id === p.id);
    return theirs ? { ...p, votes: { ...(theirs.votes || {}), ...(p.votes || {}) } } : p;
  });

  const medals = { ...(s.manualMedals || {}) };
  for (const [team, keys] of Object.entries(b.manualMedals || {})) {
    medals[team] = [...new Set([...(medals[team] || []), ...(keys || [])])];
  }

  // An empty draw or bonus list in the upload means "this phone never had
  // one", not "clear it", so it never wipes what is stored.
  const locked = Boolean(s.drawLocked);
  const takeDraw = !locked && Object.keys(b.assignments || {}).length > 0;
  const takeBonus = !locked && Object.keys(b.bonusPoints || {}).length > 0;
  return {
    ...s,
    assignments: takeDraw ? b.assignments : s.assignments,
    drawLocked: locked || (takeDraw && Boolean(b.drawLocked)),
    bonusPoints: takeBonus ? b.bonusPoints : s.bonusPoints,
    wallPosts: unionById(s.wallPosts, b.wallPosts, deleted).slice(0, WALL_CAP),
    polls,
    manualMedals: medals,
  };
}
