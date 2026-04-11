import { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const WALL_KEY = 'dans_shed_wall_v1';
const WORKER_URL = import.meta.env.VITE_WALL_API_URL || '';

// Cloud API helpers
async function apiGet(path) {
  const res = await fetch(`${WORKER_URL}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiUploadPhoto(caption, person, blob) {
  const formData = new FormData();
  formData.append('image', blob, 'photo.jpg');
  formData.append('caption', caption);
  formData.append('person', person);
  const res = await fetch(`${WORKER_URL}/photos`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function apiDelete(path) {
  const res = await fetch(`${WORKER_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`${res.status}`);
}

// Resize image via canvas and return a Blob (avoids large base64 JSON bodies on iOS Safari)
function resizeImageToBlob(file, maxPx = 720, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) { resolve(blob); return; }
          // iOS fallback: toBlob returned null, convert via toDataURL
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
            const binary = atob(base64);
            const arr = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
            resolve(new Blob([arr], { type: 'image/jpeg' }));
          } catch (err) {
            reject(new Error('toBlob failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.src = objectUrl;
  });
}

// Slight random tilt for polaroid feel (deterministic from id)
function tiltStyle(id) {
  const n = id % 5;
  const tilts = [-2.5, -1, 0, 1.2, 2.5];
  return { transform: `rotate(${tilts[n]}deg)` };
}

function PhotoCard({ photo, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const date = new Date(photo.ts).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="polaroid" style={tiltStyle(photo.id)}>
      <div className="polaroid-img-wrap">
        <img src={photo.dataUrl || photo.imageUrl} alt={photo.caption} className="polaroid-img" />
      </div>
      <div className="polaroid-body">
        {photo.caption && <p className="polaroid-caption">{photo.caption}</p>}
        <div className="polaroid-meta">
          {photo.person && <span className="polaroid-person">{photo.person}</span>}
          <span className="polaroid-date">{date}</span>
        </div>
        <button
          className={`polaroid-delete ${confirmDelete ? 'confirm' : ''}`}
          onClick={() => {
            if (confirmDelete) onDelete(photo.id);
            else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
            }
          }}
        >
          {confirmDelete ? 'Sure?' : '✕'}
        </button>
      </div>
    </div>
  );
}

function AddBitForm({ participants, onAdd, onCancel }) {
  const fileRef = useRef();
  const [caption, setCaption] = useState('');
  const [person, setPerson] = useState('');
  const [preview, setPreview] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setRawFile(file);
    setError(null);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!rawFile) { setError('Pick a photo first.'); return; }
    setSaving(true);
    setError(null);
    try {
      const blob = await resizeImageToBlob(rawFile);
      await onAdd({ caption: caption.trim(), person: person.trim(), rawBlob: blob });
    } catch {
      setError('Could not process image. Try a smaller photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-bit-form card">
      <h3 className="section-title">Add a Bit</h3>

      <div className="photo-drop" onClick={() => fileRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="preview" className="photo-preview" />
        ) : (
          <>
            <span className="photo-drop-icon">📷</span>
            <span className="photo-drop-label">Tap to pick a photo</span>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </div>

      <label className="field-label mt">Caption</label>
      <input
        className="input"
        type="text"
        placeholder="What's the occasion?"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={120}
      />

      <label className="field-label mt">Who's in it / posted by</label>
      {participants.length > 0 ? (
        <div className="person-pills">
          {participants.map((p) => (
            <button
              key={p}
              className={`person-pill ${person === p ? 'active' : ''}`}
              onClick={() => setPerson(person === p ? '' : p)}
            >
              {p}
            </button>
          ))}
          <input
            className="input"
            type="text"
            placeholder="Or type a name…"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            style={{ marginTop: 6, flex: 1, minWidth: 120 }}
          />
        </div>
      ) : (
        <input
          className="input"
          type="text"
          placeholder="Name"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        />
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="btn-group" style={{ marginTop: 14 }}>
        <button className="btn-primary sm" onClick={handleSubmit} disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Saving…' : '📌 Pin it'}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
}

export default function TheWall({ participants }) {
  const useCloud = Boolean(WORKER_URL);

  // Local storage (fallback when no Worker URL)
  const [localPhotos, setLocalPhotos] = useLocalStorage(WALL_KEY, []);

  // Cloud storage state
  const [cloudPhotos, setCloudPhotos] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(useCloud);
  const [cloudError, setCloudError] = useState(null);

  const [adding, setAdding] = useState(false);

  // Load from cloud on mount
  useEffect(() => {
    if (!useCloud) return;
    setCloudLoading(true);
    apiGet('/photos')
      .then((data) => {
        setCloudPhotos(data.map((p) => ({ ...p, imageUrl: `${WORKER_URL}/photos/${p.id}/image` })));
        setCloudLoading(false);
      })
      .catch((e) => { setCloudError(`Could not load photos: ${e.message}`); setCloudLoading(false); });
  }, [useCloud]);

  const photos = useCloud ? (cloudPhotos ?? []) : localPhotos;

  const handleAdd = async ({ caption, person, rawBlob }) => {
    if (useCloud) {
      try {
        const photo = await apiUploadPhoto(caption, person, rawBlob);
        const imageUrl = `${WORKER_URL}/photos/${photo.id}/image`;
        setCloudPhotos((prev) => [{ ...photo, imageUrl }, ...(prev ?? [])]);
      } catch (e) {
        setCloudError(`Upload failed: ${e.message}`);
      }
    } else {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(rawBlob);
      });
      setLocalPhotos((prev) => [{ id: Date.now(), ts: Date.now(), caption, person, dataUrl }, ...prev]);
    }
    setAdding(false);
  };

  const handleDelete = async (id) => {
    if (useCloud) {
      try {
        await apiDelete(`/photos/${id}`);
        setCloudPhotos((prev) => (prev ?? []).filter((p) => p.id !== id));
      } catch (e) {
        setCloudError(`Delete failed: ${e.message}`);
      }
    } else {
      setLocalPhotos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="header-row">
          <h2>The Wall</h2>
          {!adding && (
            <button className="btn-outline-gold" onClick={() => setAdding(true)}>
              + Add a bit
            </button>
          )}
        </div>
        <p className="subtitle">
          Stick photos here as the bits come up.
          {useCloud ? ' ☁️ Synced across all devices.' : ' 📱 Stored locally on this device.'}
        </p>
      </div>

      {cloudError && (
        <div className="card" style={{ borderLeft: '3px solid var(--gold)', marginBottom: 12 }}>
          <p className="hint" style={{ color: '#c0392b' }}>{cloudError}</p>
        </div>
      )}

      {adding && (
        <AddBitForm
          participants={participants}
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {cloudLoading && (
        <div className="empty-state"><p className="hint">Loading photos…</p></div>
      )}

      {!cloudLoading && photos.length === 0 && !adding && (
        <div className="empty-state">
          <div className="empty-icon">🪣</div>
          <p>The wall is bare. Pin your first photo.</p>
        </div>
      )}

      {!cloudLoading && (
        <div className="wall-grid">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
