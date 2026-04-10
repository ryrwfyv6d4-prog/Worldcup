import { useState, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const WALL_KEY = 'dans_shed_wall_v1';

// Resize image via canvas to keep localStorage size sane (~100KB per photo)
function resizeImage(file, maxPx = 720, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
        <img src={photo.dataUrl} alt={photo.caption} className="polaroid-img" />
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setRawFile(file);
    setError(null);
    // show preview immediately at natural size
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!rawFile && !preview) { setError('Pick a photo first.'); return; }
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await resizeImage(rawFile);
      onAdd({ caption: caption.trim(), person: person.trim(), dataUrl });
    } catch {
      setError('Could not process image. Try a smaller photo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-bit-form card">
      <h3 className="section-title">Add a Bit</h3>

      {/* Photo picker */}
      <div
        className="photo-drop"
        onClick={() => fileRef.current?.click()}
      >
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

      {/* Caption */}
      <label className="field-label mt">Caption</label>
      <input
        className="input"
        type="text"
        placeholder="What's the occasion?"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={120}
      />

      {/* Person */}
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
  const [photos, setPhotos] = useLocalStorage(WALL_KEY, []);
  const [adding, setAdding] = useState(false);

  const handleAdd = (bit) => {
    const newPhoto = {
      id: Date.now(),
      ts: Date.now(),
      ...bit,
    };
    setPhotos((prev) => [newPhoto, ...prev]);
    setAdding(false);
  };

  const handleDelete = (id) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
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
        <p className="subtitle">Stick photos here as the bits come up.</p>
      </div>

      {adding && (
        <AddBitForm
          participants={participants}
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {photos.length === 0 && !adding && (
        <div className="empty-state">
          <div className="empty-icon">🪣</div>
          <p>The wall is bare. Pin your first photo.</p>
        </div>
      )}

      <div className="wall-grid">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
