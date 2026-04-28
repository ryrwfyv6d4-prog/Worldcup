import { useState, useEffect, useRef } from 'react';

const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';

const PIN_COLOURS = ['#c0392b','#2980b9','#27ae60','#8e44ad','#e67e22'];
const ROTATIONS  = [-2.8, -1.4, 0.5, 1.8, -0.7, 2.2, -2.1, 1.1, -0.4, 2.6];

function tilt(id) { return ROTATIONS[id % ROTATIONS.length]; }
function pinColour(id) { return PIN_COLOURS[id % PIN_COLOURS.length]; }

function resizeImage(file, maxPx = 720, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Load failed')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('toBlob failed')); },
        'image/jpeg', quality
      );
    };
    img.src = url;
  });
}

function Notice({ notice, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rot = tilt(notice.id);
  const pin = pinColour(notice.id);
  const date = new Date(notice.ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

  return (
    <div className="notice-wrap" style={{ '--rot': rot + 'deg' }}>
      {/* Drawing pin */}
      <div className="notice-pin" style={{ background: pin }}>
        <div className="notice-pin-head" style={{ background: pin }} />
      </div>
      <div className="notice-paper">
        {notice.title && <div className="notice-title">{notice.title}</div>}
        {notice.body  && <div className="notice-body">{notice.body}</div>}
        {notice.hasImage && (
          <img
            src={WORKER_URL + '/notices/' + notice.id + '/image'}
            alt=""
            className="notice-img"
          />
        )}
        <div className="notice-footer">
          <span className="notice-author">{notice.author || 'Anonymous'}</span>
          <span className="notice-date">{date}</span>
        </div>
        <button
          className={'notice-delete' + (confirmDelete ? ' confirm' : '')}
          onClick={() => {
            if (confirmDelete) onDelete(notice.id);
            else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
          }}
        >
          {confirmDelete ? 'Remove?' : '✕'}
        </button>
      </div>
    </div>
  );
}

function PinForm({ participants, onPost, onCancel }) {
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [author, setAuthor] = useState('');
  const [file, setFile]     = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!body.trim() && !title.trim()) { setError('Write something first.'); return; }
    setSaving(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('title',  title.trim());
      fd.append('body',   body.trim());
      fd.append('author', author.trim());
      if (file) {
        const blob = await resizeImage(file);
        fd.append('image', blob, 'notice.jpg');
      }
      const res = await fetch(WORKER_URL + '/notices', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(res.status);
      const notice = await res.json();
      const imageUrl = notice.hasImage ? WORKER_URL + '/notices/' + notice.id + '/image' : null;
      onPost({ ...notice, imageUrl });
    } catch (e) {
      setError('Could not post. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 className="section-title">Pin a Note</h3>
      <label className="field-label mt">Heading (optional)</label>
      <input className="input" type="text" placeholder="e.g. Match Day at the Shed" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
      <label className="field-label mt">Message</label>
      <textarea className="input" rows={4} placeholder="What's the notice?" value={body} onChange={e => setBody(e.target.value)} maxLength={500} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      <label className="field-label mt">Your name</label>
      {participants.length > 0 ? (
        <div className="person-pills">
          {participants.map(p => (
            <button key={p} className={'person-pill' + (author === p ? ' active' : '')} onClick={() => setAuthor(author === p ? '' : p)}>{p}</button>
          ))}
          <input className="input" type="text" placeholder="Or type a name…" value={author} onChange={e => setAuthor(e.target.value)} style={{ marginTop: 6, flex: 1, minWidth: 120 }} />
        </div>
      ) : (
        <input className="input" type="text" placeholder="Your name" value={author} onChange={e => setAuthor(e.target.value)} />
      )}
      <div className="photo-drop" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>
        {preview ? <img src={preview} alt="preview" className="photo-preview" /> : (
          <><span className="photo-drop-icon">📎</span><span className="photo-drop-label">Attach a photo (optional)</span></>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {error && <p className="error-msg">{error}</p>}
      <div className="btn-group" style={{ marginTop: 14 }}>
        <button className="btn-primary sm" onClick={handleSubmit} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Pinning…' : '📌 Pin it'}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function NoticeBoard({ participants }) {
  const [notices, setNotices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    fetch(WORKER_URL + '/notices')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setNotices(data); setLoading(false); })
      .catch(e => { setError('Could not load notices.'); setLoading(false); });
  }, []);

  const handlePost = (notice) => {
    setNotices(prev => [notice, ...prev]);
    setAdding(false);
  };

  const handleDelete = async (id) => {
    try {
      await fetch(WORKER_URL + '/notices/' + id, { method: 'DELETE' });
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch {
      setError('Delete failed.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-row">
          <h2>Notice Board</h2>
          {!adding && (
            <button className="btn-outline-gold" onClick={() => setAdding(true)}>+ Pin a note</button>
          )}
        </div>
        <p className="subtitle">Updates, reminders, banter. Stick it up.</p>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold)', marginBottom: 12 }}>
          <p className="hint" style={{ color: '#c0392b' }}>{error}</p>
        </div>
      )}

      {adding && <PinForm participants={participants} onPost={handlePost} onCancel={() => setAdding(false)} />}

      {loading && <div className="empty-state"><p className="hint">Loading notices…</p></div>}

      {!loading && notices.length === 0 && !adding && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>Board's empty. Pin the first notice.</p>
        </div>
      )}

      {!loading && (
        <div className="notice-board">
          {notices.map(n => (
            <Notice key={n.id} notice={n} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
