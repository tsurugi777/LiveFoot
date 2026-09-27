const GENERIC_PERSON_PHOTO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZWJlOCIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjcwIiByPSIzNiIgZmlsbD0iIzkzYTY5YyIvPjxwYXRoIGQ9Ik0yOCAyMDB2LTI0YzAtNDAgMzItNjQgNzItNjRzNzIgMjQgNzIgNjR2MjQiIGZpbGw9IiM5M2E2OWMiLz48L3N2Zz4=';
const POSITION_ALIASES = {ATA:'CA',ME:'MLE',MD:'MLD',LTD:'LD',LTE:'LE',GOL:'GO',MC:'MLG',ZAG:'ZC',MEI:'MAT'};
function normalizePosition(value) {
  if (typeof value !== 'string') return value;
  return [...new Set(value.split('/').map(p=>p.trim().toUpperCase()).filter(Boolean).map(p=>POSITION_ALIASES[p] || p))].join('/');
}
function personPhoto(value) {
  if (value === 'assets/generic-person.svg' || value === '/assets/generic-person.svg') return GENERIC_PERSON_PHOTO;
  if (typeof value !== 'string' || !value.trim()) return GENERIC_PERSON_PHOTO;
  // Recognize only the app's old generated initials, preserving real uploaded images.
  if (value.startsWith('data:image/svg+xml;charset=utf-8,')) {
    try {
      const svg = decodeURIComponent(value.slice(value.indexOf(',')+1));
      if (svg.includes('dominant-baseline="central"') && svg.includes('hsl(') && svg.includes('<text')) return GENERIC_PERSON_PHOTO;
    } catch (_) {}
  }
  return value;
}
function normalizePeople(data, seen = new WeakSet()) {
  if (!data || typeof data !== 'object' || seen.has(data)) return data;
  seen.add(data);
  for (const key of Object.keys(data)) {
    if ((key === 'pos' || key === 'role') && typeof data[key] === 'string') data[key] = normalizePosition(data[key]);
    else if (['photoUrl','managerPhotoUrl','managerPhoto'].includes(key)) data[key] = personPhoto(data[key]);
    else if (data[key] && typeof data[key] === 'object') normalizePeople(data[key],seen);
  }
  return data;
}
function personImage(photo, className = '', style = '') {
  return `<img src="${escapeEditorValue(personPhoto(photo))}" class="${className}" style="${style}" alt="Foto" onerror="this.onerror=null; this.src=GENERIC_PERSON_PHOTO;">`;
}
