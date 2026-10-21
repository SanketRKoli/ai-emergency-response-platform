import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage, fieldErrors } from '../api/axios.js';
import LocationPicker from '../components/LocationPicker.jsx';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const GPS_ERRORS = {
  1: 'Location permission was denied. Pick the location on the map or describe it instead.',
  2: 'Your position could not be determined. Pick it on the map or describe it instead.',
  3: 'Getting your position timed out. Try again, pick it on the map, or describe it.',
};

export default function ReportIncident() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [description, setDescription] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng, source: 'gps' | 'map' }
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Release the preview's memory when it changes or the page closes.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const onImage = (e) => {
    const file = e.target.files[0];
    setImageError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return setImageError('Only JPG, JPEG or PNG images are allowed');
    if (file.size > MAX_IMAGE_BYTES) return setImageError('Image is too large (maximum 5 MB)');
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };
  const clearImage = () => { setImage(null); setPreview(''); setImageError(''); if (fileRef.current) fileRef.current.value = ''; };

  const useGps = () => {
    setGpsError('');
    if (!navigator.geolocation) return setGpsError('This browser does not support GPS. Use the map or describe the location.');
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps', accuracy: Math.round(pos.coords.accuracy) }); setGpsBusy(false); },
      (err) => { setGpsError(GPS_ERRORS[err.code] || 'Could not get your location.'); setGpsBusy(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const submit = async (urgent) => {
    setError('');
    const v = {};
    if (description.trim().length < 5) v.description = 'Describe what happened (at least 5 characters)';
    if (!coords && !locationDescription.trim()) v.location = 'Provide your location: use GPS, pick it on the map, or describe it';
    setErrors(v);
    if (Object.keys(v).length) return;

    const form = new FormData();
    form.append('description', description.trim());
    form.append('isUrgent', String(urgent));
    if (locationDescription.trim()) form.append('locationDescription', locationDescription.trim());
    if (coords) { form.append('latitude', coords.lat); form.append('longitude', coords.lng); form.append('locationSource', coords.source); }
    if (image) form.append('image', image);

    setBusy(true);
    try {
      const { data } = await api.post('/incidents', form);
      navigate('/dashboard', { state: { submitted: data.incident.reportId, urgent } });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 760 }}>
      <Link to="/dashboard" className="small">&larr; Back to dashboard</Link>
      <h1 className="h4 mt-2 mb-3">🚨 Report an Emergency</h1>
      {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}

      <div className="card shadow-sm mb-3"><div className="card-body">
        <label className="form-label fw-semibold" htmlFor="description">What happened?</label>
        <textarea id="description" rows={4} maxLength={2000} className={`form-control ${errors.description ? 'is-invalid' : ''}`} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: There is smoke coming from the second floor of Block B and people are inside." />
        {errors.description && <div className="invalid-feedback">{errors.description}</div>}
        <div className="form-text text-end">{description.length}/2000</div>
      </div></div>

      <div className="card shadow-sm mb-3"><div className="card-body">
        <div className="fw-semibold mb-2">Location</div>
        <div className="d-flex flex-wrap gap-2 mb-2">
          <button type="button" className="btn btn-outline-primary" onClick={useGps} disabled={gpsBusy}>
            {gpsBusy ? 'Getting location...' : '📍 Use My Current Location'}
          </button>
          <button type="button" className="btn btn-outline-primary" onClick={() => setShowMap((s) => !s)}>🗺️ Select on Map</button>
        </div>
        {gpsError && <div className="alert alert-warning py-2 small">{gpsError}</div>}
        {showMap && (
          <div className="mb-2">
            <LocationPicker initial={coords ? [coords.lat, coords.lng] : null} onCancel={() => setShowMap(false)}
              onConfirm={({ lat, lng }) => { setCoords({ lat, lng, source: 'map' }); setShowMap(false); }} />
          </div>
        )}
        {coords && (
          <div className="alert alert-success py-2 small d-flex justify-content-between align-items-center">
            <span>{coords.source === 'gps' ? `GPS location captured (about ${coords.accuracy} m accuracy)` : 'Map location selected'}: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            <button type="button" className="btn-close" aria-label="Remove location" onClick={() => setCoords(null)} />
          </div>
        )}
        <label className="form-label small mb-1" htmlFor="locDesc">Or describe the location (optional if GPS or map is used)</label>
        <input id="locDesc" className="form-control" maxLength={300} value={locationDescription} onChange={(e) => setLocationDescription(e.target.value)} placeholder="Example: Near Block B main entrance" />
        {errors.location && <div className="text-danger small mt-2">{errors.location}</div>}
      </div></div>

      <div className="card shadow-sm mb-4"><div className="card-body">
        <label className="form-label fw-semibold" htmlFor="image">Photo (optional)</label>
        <input id="image" ref={fileRef} type="file" accept="image/jpeg,image/png" className="form-control" onChange={onImage} />
        <div className="form-text">JPG, JPEG or PNG, up to 5 MB.</div>
        {imageError && <div className="text-danger small mt-1">{imageError}</div>}
        {preview && (
          <div className="mt-3 d-flex align-items-start gap-3">
            <img src={preview} alt="Selected incident" style={{ maxHeight: 160, maxWidth: '60%' }} className="rounded border" />
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearImage}>Remove image</button>
          </div>
        )}
      </div></div>

      <div className="d-grid gap-2">
        <button type="button" className="btn btn-danger btn-lg" disabled={busy} onClick={() => submit(true)}>{busy ? 'Sending...' : '🚨 SEND URGENT REPORT'}</button>
        <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => submit(false)}>Send as non-urgent report</button>
      </div>
    </div>
  );
}
