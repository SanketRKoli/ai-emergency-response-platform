// Validates and cleans the fields of a new incident report. Pure function: no database, easy to test.
const present = (v) => v !== undefined && v !== null && v !== '';

export function parseIncidentInput(body = {}) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < 5) add('description', 'Describe what happened (at least 5 characters)');
  else if (description.length > 2000) add('description', 'Description must be at most 2000 characters');

  const locationDescription = typeof body.locationDescription === 'string' ? body.locationDescription.trim() : '';
  if (locationDescription.length > 300) add('locationDescription', 'Location description must be at most 300 characters');

  const hasLat = present(body.latitude);
  const hasLng = present(body.longitude);
  let latitude;
  let longitude;
  if (hasLat !== hasLng) {
    add('location', 'Latitude and longitude must be provided together');
  } else if (hasLat) {
    latitude = Number(body.latitude);
    longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) add('location', 'Latitude must be between -90 and 90');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) add('location', 'Longitude must be between -180 and 180');
  }

  const hasCoords = hasLat && hasLng;
  if (hasCoords && !['gps', 'map'].includes(body.locationSource)) add('location', 'locationSource must be gps or map when coordinates are given');
  if (!hasCoords && !locationDescription) add('location', 'Provide your location: use GPS, pick it on the map, or describe it');

  const isUrgent = body.isUrgent === true || body.isUrgent === 'true';
  if (errors.length) return { errors };

  return {
    errors,
    data: {
      description,
      isUrgent,
      ...(locationDescription ? { locationDescription } : {}),
      ...(hasCoords ? { latitude, longitude, locationSource: body.locationSource } : { locationSource: 'manual' }),
    },
  };
}
