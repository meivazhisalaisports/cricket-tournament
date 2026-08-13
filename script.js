const tournament = {
  name: 'Meivazhi Salai Village League',
  year: '2026',
  dates: 'Aug 28, 29, 30',
  venue: 'Meivazhi Salai, Koothini Patti Road, Keelakuruchi Post, Iluppur Taluk, Pudukottai 622101',
  teams: 16,
  format: 'Knockout',
  overs: '8+8 overs',
  prizes: ['1,00,000', '80,000', '60,000', '40,000', '30,000'],
  organizers: [
    { name: 'Salai Piriyadharshan', phone: '9751495916' },
    { name: 'Salai Gavanamani', phone: '6382426641' },
    { name: 'Salai Elansuriyan', phone: '8489217696' },
    { name: 'Salai Gnana Sudhan', phone: '9943831939' },
    { name: 'Salai Keshava Moorthy', phone: '9789871237' }
  ],
  email: 'meivazhisalaisports@gmail.com',
  registerUrl: 'https://forms.gle/REPLACE_WITH_YOUR_GOOGLE_FORM',
  liveScoreUrl: 'https://cricheroes.com/REPLACE_WITH_YOUR_LIVE_SCORE_LINK',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Koothini%20Patti%20Road%2C%20Meivazhi%20Salai%2C%20Keelakuruchi%20Post%2C%20Iluppur%20Taluk%2C%20Pudukottai%20622101&output=embed'
};

const fixtures = [
  { title: 'Day 1', meta: '8 knockout matches', description: 'Round 1 elimination matches to select the 8 winners.' },
  { title: 'Day 2', meta: 'Quarterfinal selection', description: 'The next round reduces the field to the 4 semifinal teams.' },
  { title: 'Day 3', meta: 'Semis, third place, final', description: 'Semifinal matches, 3rd place match, and the championship final.' }
];

const leaders = [
  { title: 'Man of the Match', value: 'Awarded for every game' },
  { title: 'Bowler of the Series', value: 'Series-level performance award' },
  { title: 'Batsman of the Series', value: 'Series-level batting award' },
  { title: 'Fielder of the Series', value: 'Outstanding fielding award' }
];

const adminAuth = {
  storageKey: 'msvl_admin_logged_in',
  sessionKey: 'msvl_admin_session'
};

const storageKeys = {
  registrations: 'msvl_team_registrations',
  teamSlots: 'msvl_team_slots',
  matchWinners: 'msvl_match_winners',
  resultsMeta: 'msvl_results_meta'
};

const cloudConfig = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbxWUqHHNbzPO7TiwXjq6J6bvd6nVQ0Bdme1-VCpYoTXqslTgssP0WPDXIdOipCyVUQe/exec'
};

const aadhaarPhotoConfig = {
  acceptAttr: '.jpg,.jpeg,.png,image/jpeg,image/png',
  maxSizeBytes: 2 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png']
};

const teamTypeConfig = {
  limit: 8,
  setting: 'Setting Team',
  singleVillage: 'Single Village Team'
};

function normalizeTeamType(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveTeamTypeLabel(value) {
  const normalized = normalizeTeamType(value);
  if (normalized === normalizeTeamType(teamTypeConfig.setting)) return teamTypeConfig.setting;
  if (normalized === normalizeTeamType(teamTypeConfig.singleVillage)) return teamTypeConfig.singleVillage;
  return '';
}

function getTeamTypeTamilLabel(teamTypeLabel) {
  if (teamTypeLabel === teamTypeConfig.setting) return 'செட்டிங் டீம்';
  if (teamTypeLabel === teamTypeConfig.singleVillage) return 'சிங்கிள் வில்லேஜ் டீம்';
  return 'இந்த டீம் வகை';
}

function isActiveRegistrationStatus(status) {
  const normalized = String(status || 'pending').trim().toLowerCase();
  return normalized !== 'rejected' && normalized !== 'removed';
}

function countRegistrationsForTeamType(registrations, teamTypeLabel) {
  const normalizedType = normalizeTeamType(teamTypeLabel);
  if (!normalizedType) return 0;

  return registrations.filter((entry) => {
    if (!isActiveRegistrationStatus(entry?.status)) return false;
    const entryType = resolveTeamTypeLabel(entry?.teamType);
    return normalizeTeamType(entryType) === normalizedType;
  }).length;
}

function buildTeamTypeLimitMessage(teamTypeLabel) {
  const tamilLabel = getTeamTypeTamilLabel(teamTypeLabel);
  return (
    `For the ${teamTypeLabel}, already ${teamTypeConfig.limit} teams have been registered. ` +
    'Before paying / registering kindly contact the Admin / organiser.\n\n' +
    `${tamilLabel} பிரிவில் ஏற்கனவே ${teamTypeConfig.limit} அணிகள் பதிவு செய்யப்பட்டுள்ளன. ` +
    'பணம் செலுத்த / பதிவு செய்யும் முன் நிர்வாகி / ஒருங்கிணைப்பாளரை தொடர்பு கொள்ளவும்.'
  );
}

function getAdminSession() {
  try {
    const raw = window.sessionStorage.getItem(adminAuth.sessionKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const username = String(parsed.username || '').trim();
    const password = String(parsed.password || '');
    if (!username || !password) return null;
    return { username, password };
  } catch (error) {
    return null;
  }
}

function setAdminSession(username, password) {
  window.sessionStorage.setItem(
    adminAuth.sessionKey,
    JSON.stringify({ username: String(username || '').trim(), password: String(password || '') })
  );
}

function clearAdminSession() {
  window.sessionStorage.removeItem(adminAuth.sessionKey);
}

function buildProtectedPayload(payload) {
  const session = getAdminSession();
  if (!session) return null;
  return {
    ...payload,
    adminUser: session.username,
    adminPass: session.password
  };
}

function isCloudEnabled() {
  return typeof cloudConfig.webAppUrl === 'string' && cloudConfig.webAppUrl.startsWith('http');
}

async function cloudFetchAllData() {
  if (!isCloudEnabled()) return null;
  const response = await fetch(`${cloudConfig.webAppUrl}?action=allData`, {
    method: 'GET',
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`Cloud fetch failed: ${response.status}`);
  const payload = await response.json();
  if (!payload || payload.ok !== true) throw new Error(payload?.error || 'Cloud fetch returned invalid response');
  return payload;
}

async function cloudPost(payload) {
  if (!isCloudEnabled()) return;
  const response = await fetch(cloudConfig.webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Cloud write failed: ${response.status}`);
  const result = await response.json();
  if (!result || result.ok !== true) {
    const error = new Error(result?.message || result?.error || 'Cloud write returned invalid response');
    error.code = result?.error || 'CLOUD_WRITE_FAILED';
    error.payload = result;
    throw error;
  }
  return result;
}

function normalizeAadhaarPhotoMeta(photo) {
  if (!photo || typeof photo !== 'object') return null;

  const fileId = String(photo.fileId || '').trim();
  const fileName = String(photo.fileName || '').trim();
  const downloadUrl = String(photo.downloadUrl || '').trim() || (fileId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    : '');

  if (!fileId && !downloadUrl && !fileName) return null;
  return { fileId, fileName, downloadUrl };
}

function normalizePersonRecord(person, fallback) {
  const source = person && typeof person === 'object' ? person : {};
  const defaults = fallback && typeof fallback === 'object' ? fallback : {};

  return {
    label: String(source.label || defaults.label || '').trim(),
    name: String(source.name || defaults.name || '').trim(),
    phone: String(source.phone || defaults.phone || '').trim(),
    aadhaar: String(source.aadhaar || defaults.aadhaar || '').trim(),
    aadhaarPhoto: normalizeAadhaarPhotoMeta(source.aadhaarPhoto || defaults.aadhaarPhoto)
  };
}

function normalizeRegistrationRecord(record) {
  const source = record && typeof record === 'object' ? record : {};
  return {
    ...source,
    id: String(source.id || '').trim(),
    createdAt: String(source.createdAt || new Date().toISOString()),
    status: String(source.status || 'pending').trim() || 'pending',
    teamName: String(source.teamName || '').trim(),
    displayTeamName: String(source.displayTeamName || source.teamName || '').trim(),
    teamLocation: String(source.teamLocation || '').trim(),
    teamType: resolveTeamTypeLabel(source.teamType || '') || String(source.teamType || '').trim(),
    paymentStatus: String(source.paymentStatus || '').trim(),
    paidAmount: String(source.paidAmount || '').trim(),
    captain: normalizePersonRecord(source.captain),
    vc: normalizePersonRecord(source.vc),
    mandatoryPlayers: Array.isArray(source.mandatoryPlayers)
      ? source.mandatoryPlayers.map((person, index) => normalizePersonRecord(person, { label: `Player ${index + 3}` }))
      : [],
    substitutePlayers: Array.isArray(source.substitutePlayers)
      ? source.substitutePlayers.map((person, index) => normalizePersonRecord(person, { label: `Substitute ${index + 1}` }))
      : []
  };
}

function isSupportedAadhaarPhotoFile(file) {
  if (!(file instanceof File)) return false;
  const type = String(file.type || '').toLowerCase();
  if (aadhaarPhotoConfig.allowedTypes.includes(type)) return true;
  return /\.(jpe?g|png)$/i.test(String(file.name || ''));
}

function getAadhaarPhotoLimitText() {
  return `${Math.round(aadhaarPhotoConfig.maxSizeBytes / (1024 * 1024))} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
}

async function buildAadhaarPhotoUpload(file) {
  if (!(file instanceof File)) return null;
  return {
    fileName: String(file.name || '').trim(),
    contentType: String(file.type || '').trim(),
    dataUrl: await readFileAsDataUrl(file)
  };
}

function buildAadhaarPhotoDownloadMarkup(photo, fileLabel) {
  const normalized = normalizeAadhaarPhotoMeta(photo);
  if (!normalized?.downloadUrl) {
    return '<span class="team-detail-empty-note">No Aadhaar photo uploaded.</span>';
  }

  const downloadName = normalized.fileName || `${fileLabel || 'aadhaar'}-aadhaar`;
  return `
    <a
      class="btn btn-secondary btn-download-link"
      href="${escapeHtml(normalized.downloadUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      download="${escapeHtml(downloadName)}"
    >Download Aadhaar</a>
  `;
}

function parseCloudRegistrations(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      let details = {};
      try {
        details = row.playerJson ? JSON.parse(String(row.playerJson)) : {};
      } catch (error) {
        details = {};
      }

      const captainFromRow = {
        name: String(row.captainName || '').trim(),
        phone: String(row.captainPhone || '').trim(),
        aadhaar: String(row.captainAadhaar || '').trim()
      };

      const record = normalizeRegistrationRecord({
        id: String(row.id || details.id || '').trim(),
        createdAt: String(row.createdAt || details.createdAt || new Date().toISOString()),
        status: String(row.status || details.status || 'pending').trim() || 'pending',
        teamName: String(row.teamName || details.teamName || '').trim(),
        displayTeamName: String(details.displayTeamName || row.teamName || '').trim(),
        teamLocation: String(details.teamLocation || '').trim(),
        teamType: resolveTeamTypeLabel(details.teamType || row.teamType || ''),
        paymentStatus: String(details.paymentStatus || '').trim(),
        paidAmount: String(details.paidAmount || '').trim(),
        captain: details.captain && typeof details.captain === 'object' ? details.captain : captainFromRow,
        vc: details.vc && typeof details.vc === 'object' ? details.vc : { name: '', phone: '', aadhaar: '' },
        mandatoryPlayers: Array.isArray(details.mandatoryPlayers) ? details.mandatoryPlayers : [],
        substitutePlayers: Array.isArray(details.substitutePlayers) ? details.substitutePlayers : []
      });

      if (!record.id || !record.teamName) return null;
      if (record.status === 'removed') return null;
      if (!record.displayTeamName) record.displayTeamName = record.teamName;

      return record;
    })
    .filter(Boolean);
}

function parseCloudTeamSlots(rows) {
  const slots = createEmptyTeamSlots();
  if (!Array.isArray(rows)) return slots;

  rows.forEach((row) => {
    const slotNo = Number(row.slot);
    if (!Number.isInteger(slotNo) || slotNo < 1 || slotNo > tournament.teams) return;
    const teamId = String(row.teamId || '').trim();
    slots[slotNo - 1] = teamId || null;
  });

  return slots;
}

function parseCloudMatchWinners(rows) {
  const winners = {};
  if (!Array.isArray(rows)) return winners;

  rows.forEach((row) => {
    const matchNo = String(row.matchId || '').trim();
    const winnerId = String(row.winnerId || '').trim();
    if (!matchNo || !winnerId) return;
    winners[matchNo] = winnerId;
  });

  return winners;
}

function parseCloudResultsMeta(rows) {
  const meta = { matchMeta: {}, teamMeta: {} };
  if (!Array.isArray(rows)) return meta;

  rows.forEach((row) => {
    const key = String(row.key || '').trim();
    const value = String(row.value || '').trim();
    if (!key) return;

    try {
      const parsed = value ? JSON.parse(value) : {};
      if (key === 'matchMeta' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        meta.matchMeta = parsed;
      }
      if (key === 'teamMeta' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        meta.teamMeta = parsed;
      }
    } catch (error) {
      // Ignore malformed metadata rows and keep defaults.
    }
  });

  return meta;
}

function queueCloudTask(task, label) {
  task().catch((error) => {
    console.error(`Cloud sync failed (${label}):`, error);
  });
}

function syncRegistrationDelta(previousList, nextList) {
  const previousById = new Map(previousList.map((item) => [item.id, item]));
  const nextById = new Map(nextList.map((item) => [item.id, item]));

  nextList.forEach((item) => {
    if (!previousById.has(item.id)) {
      queueCloudTask(() => cloudPost({
        action: 'registerTeam',
        id: item.id,
        teamName: item.teamName,
        teamType: item.teamType || '',
        captainName: item.captain?.name || '',
        captainPhone: item.captain?.phone || '',
        captainAadhaar: item.captain?.aadhaar || '',
        playerJson: item,
        status: item.status,
        createdAt: item.createdAt
      }), `register ${item.id}`);
      return;
    }

    const previous = previousById.get(item.id);
    if ((previous?.status || '') !== (item.status || '')) {
      const payload = buildProtectedPayload({
        action: 'updateRegistrationStatus',
        id: item.id,
        status: item.status
      });
      if (!payload) return;
      queueCloudTask(() => cloudPost(payload), `registration status ${item.id}`);
    }
  });

  previousList.forEach((item) => {
    if (nextById.has(item.id)) return;
    const payload = buildProtectedPayload({
      action: 'updateRegistrationStatus',
      id: item.id,
      status: 'removed'
    });
    if (!payload) return;
    queueCloudTask(() => cloudPost(payload), `registration remove ${item.id}`);
  });
}

function syncTeamSlotsToCloud(slots) {
  const rows = slots
    .map((teamId, index) => ({
      slot: String(index + 1),
      teamId: teamId || '',
      teamName: ''
    }))
    .filter((row) => row.teamId);

  const payload = buildProtectedPayload({
    action: 'saveTeamSlots',
    rows
  });
  if (!payload) return;

  queueCloudTask(() => cloudPost(payload), 'team slots');
}

function syncMatchWinnersToCloud(winnersMap) {
  const timestamp = new Date().toISOString();
  const rows = Object.keys(winnersMap)
    .sort((a, b) => Number(a) - Number(b))
    .map((matchId) => ({
      matchId: String(matchId),
      round: '',
      teamAId: '',
      teamAName: '',
      teamBId: '',
      teamBName: '',
      winnerId: winnersMap[matchId] || '',
      winnerName: '',
      updatedAt: timestamp
    }));

  const payload = buildProtectedPayload({
    action: 'saveMatches',
    rows
  });
  if (!payload) return;

  queueCloudTask(() => cloudPost(payload), 'match winners');
}

function syncResultsMetaToCloud(meta) {
  const rows = [
    { key: 'matchMeta', value: JSON.stringify(meta.matchMeta || {}) },
    { key: 'teamMeta', value: JSON.stringify(meta.teamMeta || {}) }
  ];

  const payload = buildProtectedPayload({
    action: 'saveResultsMeta',
    rows
  });
  if (!payload) return;

  queueCloudTask(() => cloudPost(payload), 'results metadata');
}

async function hydrateLocalStateFromCloud() {
  if (!isCloudEnabled()) return;

  const cloudData = await cloudFetchAllData();
  if (!cloudData) return;

  const registrations = parseCloudRegistrations(cloudData.registrations);
  const teamSlots = parseCloudTeamSlots(cloudData.teamSlots);
  const matchWinners = parseCloudMatchWinners(cloudData.matches);
  const resultsMeta = parseCloudResultsMeta(cloudData.resultsMeta);

  window.localStorage.setItem(storageKeys.registrations, JSON.stringify(registrations));
  window.localStorage.setItem(storageKeys.teamSlots, JSON.stringify(teamSlots));
  window.localStorage.setItem(storageKeys.matchWinners, JSON.stringify(matchWinners));
  window.localStorage.setItem(storageKeys.resultsMeta, JSON.stringify(resultsMeta));
}

async function getLatestRegistrationsForLimitCheck() {
  if (!isCloudEnabled()) return getRegistrations();

  try {
    const cloudData = await cloudFetchAllData();
    return parseCloudRegistrations(cloudData?.registrations);
  } catch (error) {
    return getRegistrations();
  }
}

function createEmptyTeamSlots() {
  return Array.from({ length: tournament.teams }, () => null);
}

function getTeamSlots() {
  try {
    const raw = window.localStorage.getItem(storageKeys.teamSlots);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return createEmptyTeamSlots();

    const normalized = createEmptyTeamSlots();
    normalized.forEach((_, index) => {
      const value = parsed[index];
      normalized[index] = typeof value === 'string' && value ? value : null;
    });
    return normalized;
  } catch (error) {
    return createEmptyTeamSlots();
  }
}

function saveTeamSlots(slots) {
  window.localStorage.setItem(storageKeys.teamSlots, JSON.stringify(slots));
  if (isCloudEnabled()) syncTeamSlotsToCloud(slots);
}

function syncTeamSlotsWithRegistrations(registrations) {
  const approved = registrations.filter((item) => item.status === 'approved');
  const approvedIds = new Set(approved.map((item) => item.id));
  const slots = getTeamSlots();
  let changed = false;

  for (let i = 0; i < slots.length; i += 1) {
    const slotId = slots[i];
    if (slotId && !approvedIds.has(slotId)) {
      slots[i] = null;
      changed = true;
    }
  }

  approved.forEach((team) => {
    if (slots.includes(team.id)) return;
    const emptyIndex = slots.findIndex((slotId) => !slotId);
    if (emptyIndex !== -1) {
      slots[emptyIndex] = team.id;
      changed = true;
    }
  });

  if (changed) saveTeamSlots(slots);
  return slots;
}

function swapTeamSlots(fromSlot, toSlot) {
  const slots = getTeamSlots();
  const fromIndex = fromSlot - 1;
  const toIndex = toSlot - 1;
  const temp = slots[fromIndex];
  slots[fromIndex] = slots[toIndex];
  slots[toIndex] = temp;
  saveTeamSlots(slots);
}

function getMatchWinners() {
  try {
    const raw = window.localStorage.getItem(storageKeys.matchWinners);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const normalized = {};
    Object.keys(parsed).forEach((key) => {
      const value = parsed[key];
      if (typeof value === 'string' && value) normalized[key] = value;
    });
    return normalized;
  } catch (error) {
    return {};
  }
}

function saveMatchWinners(map) {
  window.localStorage.setItem(storageKeys.matchWinners, JSON.stringify(map));
  if (isCloudEnabled()) syncMatchWinnersToCloud(map);
}

function getResultsMeta() {
  try {
    const raw = window.localStorage.getItem(storageKeys.resultsMeta);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { matchMeta: {}, teamMeta: {} };
    }

    const matchMeta = parsed.matchMeta && typeof parsed.matchMeta === 'object' && !Array.isArray(parsed.matchMeta)
      ? parsed.matchMeta
      : {};
    const teamMeta = parsed.teamMeta && typeof parsed.teamMeta === 'object' && !Array.isArray(parsed.teamMeta)
      ? parsed.teamMeta
      : {};

    return { matchMeta, teamMeta };
  } catch (error) {
    return { matchMeta: {}, teamMeta: {} };
  }
}

function saveResultsMeta(meta) {
  window.localStorage.setItem(storageKeys.resultsMeta, JSON.stringify(meta));
  if (isCloudEnabled()) syncResultsMetaToCloud(meta);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function removeTeamFromTournamentData(teamId) {
  if (!teamId) return;

  const slots = getTeamSlots();
  let slotsChanged = false;
  for (let i = 0; i < slots.length; i += 1) {
    if (slots[i] === teamId) {
      slots[i] = null;
      slotsChanged = true;
    }
  }
  if (slotsChanged) saveTeamSlots(slots);

  const winners = getMatchWinners();
  let winnersChanged = false;
  Object.keys(winners).forEach((matchNo) => {
    if (winners[matchNo] === teamId) {
      delete winners[matchNo];
      winnersChanged = true;
    }
  });
  if (winnersChanged) saveMatchWinners(winners);
}

function setFixtureStatus(message, type) {
  const node = document.querySelector('[data-fixture-status]');
  if (!node) return;
  node.textContent = message;
  node.className = `form-status ${type || ''}`.trim();
}

function buildFixtureBracketData(registrations) {
  const slots = syncTeamSlotsWithRegistrations(registrations);
  const byId = new Map(registrations.map((item) => [item.id, item]));
  const storedWinners = getMatchWinners();
  const validWinners = {};

  function teamFromSlot(slotIndex) {
    const id = slots[slotIndex] || null;
    const team = id ? byId.get(id) : null;
    if (!team) {
      return {
        id: null,
        name: `Team ${slotIndex + 1} (Not Yet Registered)`
      };
    }
    return {
      id: team.id,
      name: team.displayTeamName
    };
  }

  function resolveWinner(matchNo, sideA, sideB) {
    const savedId = storedWinners[String(matchNo)] || '';
    if (!savedId) return '';
    if (savedId === sideA.id || savedId === sideB.id) {
      validWinners[String(matchNo)] = savedId;
      return savedId;
    }
    return '';
  }

  function winnerParticipant(matchNo, sideA, sideB) {
    const winnerId = resolveWinner(matchNo, sideA, sideB);
    if (winnerId && winnerId === sideA.id) return sideA;
    if (winnerId && winnerId === sideB.id) return sideB;
    return null;
  }

  function loserParticipant(matchNo, sideA, sideB) {
    const winnerId = resolveWinner(matchNo, sideA, sideB);
    if (!winnerId) return null;
    if (winnerId === sideA.id) return sideB.id ? sideB : null;
    if (winnerId === sideB.id) return sideA.id ? sideA : null;
    return null;
  }

  function buildMatch(matchNo, sideA, sideB, placeholderA, placeholderB, roundLabel) {
    const winnerId = resolveWinner(matchNo, sideA, sideB);
    const winnerName = winnerId === sideA.id ? sideA.name : winnerId === sideB.id ? sideB.name : 'TBD';
    return {
      matchNo,
      roundLabel,
      sideA: {
        id: sideA.id || null,
        name: sideA.id ? sideA.name : placeholderA
      },
      sideB: {
        id: sideB.id || null,
        name: sideB.id ? sideB.name : placeholderB
      },
      winnerId,
      winnerName,
      canSelectWinner: !!(sideA.id && sideB.id)
    };
  }

  const round1 = Array.from({ length: 8 }, (_, i) => {
    const aSlot = i * 2;
    const bSlot = aSlot + 1;
    return buildMatch(
      i + 1,
      teamFromSlot(aSlot),
      teamFromSlot(bSlot),
      `Team ${aSlot + 1} (Not Yet Registered)`,
      `Team ${bSlot + 1} (Not Yet Registered)`,
      'Round 1'
    );
  });

  const r1w1 = winnerParticipant(1, round1[0].sideA, round1[0].sideB);
  const r1w2 = winnerParticipant(2, round1[1].sideA, round1[1].sideB);
  const r1w3 = winnerParticipant(3, round1[2].sideA, round1[2].sideB);
  const r1w4 = winnerParticipant(4, round1[3].sideA, round1[3].sideB);
  const r1w5 = winnerParticipant(5, round1[4].sideA, round1[4].sideB);
  const r1w6 = winnerParticipant(6, round1[5].sideA, round1[5].sideB);
  const r1w7 = winnerParticipant(7, round1[6].sideA, round1[6].sideB);
  const r1w8 = winnerParticipant(8, round1[7].sideA, round1[7].sideB);

  const quarterfinals = [
    buildMatch(9, r1w1 || { id: null, name: '' }, r1w2 || { id: null, name: '' }, 'Match 1 Winner', 'Match 2 Winner', 'Quarterfinals'),
    buildMatch(10, r1w3 || { id: null, name: '' }, r1w4 || { id: null, name: '' }, 'Match 3 Winner', 'Match 4 Winner', 'Quarterfinals'),
    buildMatch(11, r1w5 || { id: null, name: '' }, r1w6 || { id: null, name: '' }, 'Match 5 Winner', 'Match 6 Winner', 'Quarterfinals'),
    buildMatch(12, r1w7 || { id: null, name: '' }, r1w8 || { id: null, name: '' }, 'Match 7 Winner', 'Match 8 Winner', 'Quarterfinals')
  ];

  const qfw1 = winnerParticipant(9, quarterfinals[0].sideA, quarterfinals[0].sideB);
  const qfw2 = winnerParticipant(10, quarterfinals[1].sideA, quarterfinals[1].sideB);
  const qfw3 = winnerParticipant(11, quarterfinals[2].sideA, quarterfinals[2].sideB);
  const qfw4 = winnerParticipant(12, quarterfinals[3].sideA, quarterfinals[3].sideB);

  const semifinals = [
    buildMatch(13, qfw1 || { id: null, name: '' }, qfw2 || { id: null, name: '' }, 'Match 9 Winner', 'Match 10 Winner', 'Semifinals'),
    buildMatch(14, qfw3 || { id: null, name: '' }, qfw4 || { id: null, name: '' }, 'Match 11 Winner', 'Match 12 Winner', 'Semifinals')
  ];

  const sfLoser1 = loserParticipant(13, semifinals[0].sideA, semifinals[0].sideB);
  const sfLoser2 = loserParticipant(14, semifinals[1].sideA, semifinals[1].sideB);
  const sfWinner1 = winnerParticipant(13, semifinals[0].sideA, semifinals[0].sideB);
  const sfWinner2 = winnerParticipant(14, semifinals[1].sideA, semifinals[1].sideB);

  const bronzeFinal = buildMatch(
    15,
    sfLoser1 || { id: null, name: '' },
    sfLoser2 || { id: null, name: '' },
    'Match 13 Loser',
    'Match 14 Loser',
    'Bronze Final (3rd Place Playoff)'
  );

  const grandFinal = buildMatch(
    16,
    sfWinner1 || { id: null, name: '' },
    sfWinner2 || { id: null, name: '' },
    'Match 13 Winner',
    'Match 14 Winner',
    'Grand Final'
  );

  const storedJson = JSON.stringify(storedWinners);
  const validJson = JSON.stringify(validWinners);
  if (storedJson !== validJson) {
    saveMatchWinners(validWinners);
  }

  return {
    round1,
    quarterfinals,
    semifinals,
    bronzeFinal,
    grandFinal
  };
}

function fillCommonData() {
  document.querySelectorAll('[data-tournament-name]').forEach((node) => node.textContent = tournament.name);
  document.querySelectorAll('[data-tournament-year]').forEach((node) => node.textContent = tournament.year);
  document.querySelectorAll('[data-tournament-dates]').forEach((node) => node.textContent = tournament.dates);
  document.querySelectorAll('[data-tournament-venue]').forEach((node) => node.textContent = tournament.venue);
  document.querySelectorAll('[data-organizer-email]').forEach((node) => node.textContent = tournament.email);
  document.querySelectorAll('[data-register-url]').forEach((node) => node.href = tournament.registerUrl);
  document.querySelectorAll('[data-live-url]').forEach((node) => node.href = tournament.liveScoreUrl);
  document.querySelectorAll('[data-map-url]').forEach((node) => node.src = tournament.mapEmbedUrl);
}

function buildCounts() {
  const teamCountNodes = document.querySelectorAll('[data-team-count]');
  teamCountNodes.forEach((node) => node.textContent = tournament.teams);

  const prizeNodes = document.querySelectorAll('[data-prize-list]');
  const prizeText = tournament.prizes.join(' • ');
  prizeNodes.forEach((node) => node.textContent = prizeText);
}

function buildOrganizers() {
  const organizerWrap = document.querySelector('[data-organizers]');
  if (!organizerWrap) return;

  organizerWrap.innerHTML = tournament.organizers
    .map(
      (organizer) => `
        <div class="card">
          <h3>${organizer.name}</h3>
          <p>${organizer.phone}</p>
        </div>
      `
    )
    .join('');
}

function buildFixtures() {
  const fixtureWrap = document.querySelector('[data-fixtures]');
  if (!fixtureWrap) return;

  const registrations = getRegistrations();
  const bracket = buildFixtureBracketData(registrations);
  const isAdminViewer = window.localStorage.getItem(adminAuth.storageKey) === 'true';

  function renderMatchCard(match) {
    const winnerOptions = `
      <option value="">Select winner</option>
      ${match.sideA.id ? `<option value="${match.sideA.id}" ${match.winnerId === match.sideA.id ? 'selected' : ''}>${match.sideA.name}</option>` : ''}
      ${match.sideB.id ? `<option value="${match.sideB.id}" ${match.winnerId === match.sideB.id ? 'selected' : ''}>${match.sideB.name}</option>` : ''}
    `;

    return `
      <article class="card fixture-match-card">
        <h4>Match ${match.matchNo}</h4>
        <p class="fixture-round-label">${match.roundLabel}</p>
        <div class="fixture-team-row">
          <strong>${match.sideA.name}</strong>
        </div>
        <div class="fixture-vs">vs</div>
        <div class="fixture-team-row">
          <strong>${match.sideB.name}</strong>
        </div>
        <p class="fixture-winner-view"><strong>Winner:</strong> ${match.winnerName}</p>
        ${
          isAdminViewer
            ? `<div class="admin-only fixture-admin-controls">
                ${
                  match.canSelectWinner
                    ? `<label>Pick Winner<select data-fixture-winner="${match.matchNo}">${winnerOptions}</select></label>`
                    : '<p class="form-note">Winner selection unlocks when both teams are available.</p>'
                }
              </div>`
            : ''
        }
      </article>
    `;
  }

  const round1Markup = bracket.round1.map((match) => renderMatchCard(match)).join('');
  const quarterMarkup = bracket.quarterfinals.map((match) => renderMatchCard(match)).join('');
  const semiMarkup = bracket.semifinals.map((match) => renderMatchCard(match)).join('');

  fixtureWrap.innerHTML = `
    <div class="fixture-plan">
      ${fixtures
        .map(
          (item, index) => `
            <div class="timeline-item fade-up delay-${index + 1}">
              <strong>${item.title}</strong>
              <div>
                <div>${item.meta}</div>
                <p>${item.description}</p>
              </div>
            </div>
          `
        )
        .join('')}
    </div>
    <section class="fixture-round">
      <h2 class="section-title">Round 1 Pairing (From Teams Slot Order)</h2>
      <p class="section-note">If admin swaps slot order in Teams tab, these match pairs update automatically.</p>
      <p class="form-status" data-fixture-status></p>
      <div class="fixture-match-grid">${round1Markup}</div>
    </section>
    <section class="fixture-round">
      <h2 class="section-title">Quarterfinals (Match 9 - Match 12)</h2>
      <p class="section-note">Slots auto-fill from Round 1 winners.</p>
      <div class="fixture-match-grid">${quarterMarkup}</div>
    </section>
    <section class="fixture-round">
      <h2 class="section-title">Semifinals (Match 13 - Match 14)</h2>
      <p class="section-note">Slots auto-fill from quarterfinal winners.</p>
      <div class="fixture-match-grid">${semiMarkup}</div>
    </section>
    <section class="fixture-round fixture-round-split">
      <article>
        <h2 class="section-title">Bronze Final (3rd Place Playoff)</h2>
        <p class="section-note">For the losers of the semifinals, to decide 3rd and 4th places.</p>
        <div class="fixture-match-grid fixture-match-grid-single">${renderMatchCard(bracket.bronzeFinal)}</div>
      </article>
      <article>
        <h2 class="section-title">Grand Final</h2>
        <p class="section-note">Championship match between semifinal winners.</p>
        <div class="fixture-match-grid fixture-match-grid-single">${renderMatchCard(bracket.grandFinal)}</div>
      </article>
    </section>
  `;
}

function setupFixtureWinnerSelection() {
  const fixtureWrap = document.querySelector('[data-fixtures]');
  if (!fixtureWrap || fixtureWrap.dataset.winnerSetup === 'true') return;
  fixtureWrap.dataset.winnerSetup = 'true';

  fixtureWrap.addEventListener('change', (event) => {
    const select = event.target.closest('[data-fixture-winner]');
    if (!select) return;

    const isAdmin = window.localStorage.getItem(adminAuth.storageKey) === 'true';
    if (!isAdmin) {
      setFixtureStatus('Admin login required to set match winners.', 'error');
      buildFixtures();
      return;
    }

    const matchNo = Number(select.getAttribute('data-fixture-winner'));
    if (!matchNo) return;

    const selectedTeamId = String(select.value || '').trim();
    const winners = getMatchWinners();
    if (!selectedTeamId) {
      delete winners[String(matchNo)];
      saveMatchWinners(winners);
      buildFixtures();
      buildResultsPage();
      setFixtureStatus(`Winner removed for Match ${matchNo}.`, 'success');
      return;
    }

    winners[String(matchNo)] = selectedTeamId;
    saveMatchWinners(winners);
    buildFixtures();
    buildResultsPage();
    setFixtureStatus(`Winner saved for Match ${matchNo}.`, 'success');
  });
}

function buildResultsPage() {
  const podiumNode = document.querySelector('[data-results-podium]');
  const matchBody = document.querySelector('[data-results-match-body]');
  const pointsBody = document.querySelector('[data-results-points-body]');
  if (!podiumNode || !matchBody || !pointsBody) return;

  const isAdminViewer = window.localStorage.getItem(adminAuth.storageKey) === 'true';
  const registrations = getRegistrations();
  const slots = syncTeamSlotsWithRegistrations(registrations);
  const byId = new Map(registrations.map((item) => [item.id, item]));
  const winners = getMatchWinners();
  const meta = getResultsMeta();

  const bracket = buildFixtureBracketData(registrations);
  const allMatches = [
    ...bracket.round1,
    ...bracket.quarterfinals,
    ...bracket.semifinals,
    bracket.bronzeFinal,
    bracket.grandFinal
  ];

  function getRunner(match) {
    if (!match.winnerId || !match.sideA.id || !match.sideB.id) return 'TBD';
    if (match.winnerId === match.sideA.id) return match.sideB.name || 'TBD';
    if (match.winnerId === match.sideB.id) return match.sideA.name || 'TBD';
    return 'TBD';
  }

  const champion = bracket.grandFinal.winnerName || 'TBD';
  const runnerUp = getRunner(bracket.grandFinal);
  const thirdPlace = bracket.bronzeFinal.winnerName || 'TBD';
  const fourthPlace = getRunner(bracket.bronzeFinal);

  const podiumRows = [
    { label: 'Winner', value: champion || 'TBD' },
    { label: 'Runner', value: runnerUp || 'TBD' },
    { label: '3rd', value: thirdPlace || 'TBD' },
    { label: '4th', value: fourthPlace || 'TBD' }
  ];

  podiumNode.innerHTML = podiumRows
    .map(
      (row) => `
        <article class="card podium-card">
          <p class="podium-label">${escapeHtml(row.label)}</p>
          <h3>${escapeHtml(row.value || 'TBD')}</h3>
        </article>
      `
    )
    .join('');

  matchBody.innerHTML = allMatches
    .map((match) => {
      const info = meta.matchMeta[String(match.matchNo)] || {};
      const pom = String(info.pom || '');
      const achievement = String(info.achievement || '');

      const pomCell = isAdminViewer
        ? `<input type="text" class="results-input" data-results-match-field="pom" data-match-no="${match.matchNo}" value="${escapeHtml(pom)}" placeholder="-" />`
        : `<span>${escapeHtml(pom || '-')}</span>`;

      const achievementCell = isAdminViewer
        ? `<input type="text" class="results-input" data-results-match-field="achievement" data-match-no="${match.matchNo}" value="${escapeHtml(achievement)}" placeholder="-" />`
        : `<span>${escapeHtml(achievement || '-')}</span>`;

      return `
        <tr>
          <td class="rank">${match.matchNo}</td>
          <td>${escapeHtml(match.sideA.name || '-')}</td>
          <td>${escapeHtml(match.sideB.name || '-')}</td>
          <td>${escapeHtml(match.winnerName || 'TBD')}</td>
          <td>${pomCell}</td>
          <td>${achievementCell}</td>
        </tr>
      `;
    })
    .join('');

  const winCounts = {};
  Object.values(winners).forEach((teamId) => {
    if (!teamId) return;
    winCounts[teamId] = (winCounts[teamId] || 0) + 1;
  });

  const defaultRank = {};
  const ranked = slots
    .map((teamId, index) => {
      const points = teamId ? (winCounts[teamId] || 0) * 2 : -1;
      return { teamId, slotNo: index + 1, points };
    })
    .filter((row) => !!row.teamId)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.slotNo - b.slotNo;
    });

  ranked.forEach((row, index) => {
    defaultRank[row.teamId] = String(index + 1);
  });

  pointsBody.innerHTML = slots
    .map((teamId, index) => {
      const slotNo = index + 1;
      const team = teamId ? byId.get(teamId) : null;
      const key = teamId || `slot-${slotNo}`;
      const teamInfo = meta.teamMeta[key] || {};
      const points = teamId ? String((winCounts[teamId] || 0) * 2) : '-';
      const autoPosition = teamId ? (defaultRank[teamId] || '-') : '-';
      const position = String(teamInfo.position || autoPosition || '-');
      const mvp = String(teamInfo.mvp || '');

      const positionCell = isAdminViewer
        ? `<input type="text" class="results-input results-input-small" data-results-team-field="position" data-team-key="${escapeHtml(key)}" value="${escapeHtml(position === '-' ? '' : position)}" placeholder="${escapeHtml(autoPosition)}" />`
        : `<span>${escapeHtml(position || '-')}</span>`;

      const mvpCell = isAdminViewer
        ? `<input type="text" class="results-input" data-results-team-field="mvp" data-team-key="${escapeHtml(key)}" value="${escapeHtml(mvp)}" placeholder="-" />`
        : `<span>${escapeHtml(mvp || '-')}</span>`;

      return `
        <tr>
          <td>${escapeHtml(team ? team.displayTeamName : `Team ${slotNo} (Not Yet Registered)`)}</td>
          <td>${escapeHtml(points)}</td>
          <td>${positionCell}</td>
          <td>${mvpCell}</td>
        </tr>
      `;
    })
    .join('');
}

function setupResultsAdminEditing() {
  const matchBody = document.querySelector('[data-results-match-body]');
  const pointsBody = document.querySelector('[data-results-points-body]');
  if (matchBody && matchBody.dataset.editBound !== 'true') {
    matchBody.dataset.editBound = 'true';
    matchBody.addEventListener('change', (event) => {
      const input = event.target.closest('[data-results-match-field]');
      if (!input) return;

      const isAdmin = window.localStorage.getItem(adminAuth.storageKey) === 'true';
      if (!isAdmin) {
        buildResultsPage();
        return;
      }

      const field = input.getAttribute('data-results-match-field');
      const matchNo = input.getAttribute('data-match-no');
      if (!field || !matchNo) return;

      const meta = getResultsMeta();
      if (!meta.matchMeta[matchNo]) meta.matchMeta[matchNo] = {};
      meta.matchMeta[matchNo][field] = String(input.value || '').trim();
      saveResultsMeta(meta);
      buildResultsPage();
    });
  }

  if (pointsBody && pointsBody.dataset.editBound !== 'true') {
    pointsBody.dataset.editBound = 'true';
    pointsBody.addEventListener('change', (event) => {
      const input = event.target.closest('[data-results-team-field]');
      if (!input) return;

      const isAdmin = window.localStorage.getItem(adminAuth.storageKey) === 'true';
      if (!isAdmin) {
        buildResultsPage();
        return;
      }

      const field = input.getAttribute('data-results-team-field');
      const teamKey = input.getAttribute('data-team-key');
      if (!field || !teamKey) return;

      const meta = getResultsMeta();
      if (!meta.teamMeta[teamKey]) meta.teamMeta[teamKey] = {};
      meta.teamMeta[teamKey][field] = String(input.value || '').trim();
      saveResultsMeta(meta);
      buildResultsPage();
    });
  }
}

function buildAwards() {
  const awardWrap = document.querySelector('[data-awards]');
  if (!awardWrap) return;

  awardWrap.innerHTML = leaders
    .map(
      (item) => `
        <div class="card">
          <h3>${item.title}</h3>
          <p>${item.value}</p>
        </div>
      `
    )
    .join('');
}

function setupCountdown() {
  const countdown = document.querySelector('[data-countdown]');
  if (!countdown) return;

  const eventDate = new Date('2026-08-28T00:00:00').getTime();

  function renderCountdown() {
    const now = Date.now();
    const distance = Math.max(0, eventDate - now);
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((distance / (1000 * 60)) % 60);
    const seconds = Math.floor((distance / 1000) % 60);

    countdown.textContent = `${days}d : ${hours}h : ${minutes}m : ${seconds}s`;
  }

  renderCountdown();
  setInterval(renderCountdown, 1000);
}

function setupScrollReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-up');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((target) => observer.observe(target));
}

function setupRedirectPage() {
  const autoLink = document.querySelector('[data-auto-redirect]');
  if (!autoLink) return;

  const secondsNode = document.querySelector('[data-redirect-seconds]');
  const targetUrl = autoLink.href;
  let seconds = 5;

  const tick = () => {
    if (secondsNode) secondsNode.textContent = seconds;
    if (seconds <= 0) {
      window.location.replace(targetUrl);
      return;
    }
    seconds -= 1;
    window.setTimeout(tick, 1000);
  };

  tick();
}

function highlightCurrentNav() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function setupBackToTop() {
  const button = document.querySelector('[data-back-top]');
  if (!button) return;
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function setupAdminLogin() {
  const navbarInner = document.querySelector('.navbar-inner');
  if (!navbarInner) return;

  const actions = document.createElement('div');
  actions.className = 'admin-actions';
  actions.innerHTML = `
    <button type="button" class="admin-login-btn" data-admin-toggle>Login as Admin</button>
    <span class="admin-mode-pill" data-admin-pill hidden>Admin mode</span>
  `;
  navbarInner.appendChild(actions);

  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.setAttribute('data-admin-modal', '');
  modal.hidden = true;
  modal.innerHTML = `
    <div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Admin login">
      <h3>Admin Login</h3>
      <p>Use admin credentials to unlock admin-only controls.</p>
      <label>
        User ID
        <input type="text" data-admin-user autocomplete="username" />
      </label>
      <label>
        Password
        <input type="password" data-admin-pass autocomplete="current-password" />
      </label>
      <p class="admin-error" data-admin-error></p>
      <div class="admin-modal-actions">
        <button type="button" class="btn btn-secondary" data-admin-cancel>Cancel</button>
        <button type="button" class="btn btn-primary" data-admin-submit>Login</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const toggleButton = actions.querySelector('[data-admin-toggle]');
  const pill = actions.querySelector('[data-admin-pill]');
  const userInput = modal.querySelector('[data-admin-user]');
  const passInput = modal.querySelector('[data-admin-pass]');
  const errorNode = modal.querySelector('[data-admin-error]');
  const cancelButton = modal.querySelector('[data-admin-cancel]');
  const submitButton = modal.querySelector('[data-admin-submit]');

  function isAdminLoggedIn() {
    return window.localStorage.getItem(adminAuth.storageKey) === 'true';
  }

  function setAdminMode(value) {
    if (value) {
      window.localStorage.setItem(adminAuth.storageKey, 'true');
      document.body.classList.add('admin-mode');
      toggleButton.textContent = 'Logout Admin';
      pill.hidden = false;
    } else {
      window.localStorage.removeItem(adminAuth.storageKey);
      clearAdminSession();
      document.body.classList.remove('admin-mode');
      toggleButton.textContent = 'Login as Admin';
      pill.hidden = true;
    }

    renderTeamApprovalCards();
    buildFixtures();
    buildResultsPage();
  }

  function openModal() {
    modal.hidden = false;
    modal.classList.add('open');
    errorNode.textContent = '';
    userInput.value = '';
    passInput.value = '';
    userInput.focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.hidden = true;
  }

  async function doLogin() {
    const userId = (userInput.value || '').trim();
    const password = (passInput.value || '').trim();

    if (!userId || !password) {
      errorNode.textContent = 'Enter user ID and password.';
      return;
    }

    try {
      await cloudPost({
        action: 'adminLogin',
        username: userId,
        password
      });

      setAdminSession(userId, password);
      setAdminMode(true);
      closeModal();
      return;
    } catch (error) {
      const reason = String(error?.message || 'Unknown error');
      if (/unauthorized/i.test(reason)) {
        errorNode.textContent = 'Invalid user ID or password.';
      } else {
        errorNode.textContent = 'Login failed due to network/deployment issue. Please hard refresh and try again.';
      }
    }
  }

  toggleButton.addEventListener('click', () => {
    if (isAdminLoggedIn()) {
      setAdminMode(false);
      return;
    }
    openModal();
  });

  cancelButton.addEventListener('click', closeModal);
  submitButton.addEventListener('click', doLogin);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  passInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doLogin();
  });

  setAdminMode(isAdminLoggedIn() && !!getAdminSession());
}

function formatAadhaar(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 12);
  const parts = digits.match(/.{1,4}/g) || [];
  return parts.join(' ');
}

function isValidAadhaar(value) {
  return /^\d{4}\s\d{4}\s\d{4}$/.test((value || '').trim());
}

function getRegistrations() {
  try {
    const raw = window.localStorage.getItem(storageKeys.registrations);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => normalizeRegistrationRecord(item)) : [];
  } catch (error) {
    return [];
  }
}

function saveRegistrations(list, options) {
  const previous = getRegistrations();
  const skipCloudSync = !!(options && options.skipCloudSync);
  window.localStorage.setItem(storageKeys.registrations, JSON.stringify(list));
  if (isCloudEnabled() && !skipCloudSync) syncRegistrationDelta(previous, list);
}

function getStatusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Pending';
}

function getApprovalCardClass(status) {
  if (status === 'approved') return 'approval-card approval-card--approved';
  if (status === 'rejected') return 'approval-card approval-card--rejected';
  return 'approval-card approval-card--pending';
}

function renderApprovedTeams() {
  const listNode = document.querySelector('[data-approved-teams-list]');
  const emptyNode = document.querySelector('[data-approved-teams-empty]');
  if (!listNode || !emptyNode) return;

  const registrations = getRegistrations();
  const slots = syncTeamSlotsWithRegistrations(registrations);
  const byId = new Map(registrations.map((item) => [item.id, item]));

  emptyNode.hidden = true;
  listNode.innerHTML = slots
    .map((slotId, index) => {
      const slotNumber = index + 1;
      const team = slotId ? byId.get(slotId) : null;

      if (!team) {
        return `
          <article class="card team-roster-card team-roster-card--placeholder" data-team-slot="${slotNumber}" data-team-id="">
            <p class="slot-label">Slot ${slotNumber}</p>
            <h3>Team ${slotNumber}</h3>
            <p>Not yet registered</p>
          </article>
        `;
      }

      return `
        <article class="card team-roster-card team-roster-card--filled" data-team-slot="${slotNumber}" data-team-id="${team.id}">
          <p class="slot-label">Slot ${slotNumber}</p>
          <h3>${team.displayTeamName}</h3>
          <p><strong>Location:</strong> ${team.teamLocation}</p>
          <p><strong>Captain:</strong> ${team.captain?.name || '-'}</p>
          <p><strong>Vice Captain:</strong> ${team.vc?.name || '-'}</p>
        </article>
      `;
    })
    .join('');
}

function setupTeamSlotDragAndDrop() {
  const listNode = document.querySelector('[data-approved-teams-list]');
  if (!listNode) return;

  const statusNode = document.querySelector('[data-slot-dnd-status]');
  let state = null;

  function isAdmin() {
    return window.localStorage.getItem(adminAuth.storageKey) === 'true';
  }

  function clearStatus() {
    if (!statusNode) return;
    statusNode.textContent = '';
    statusNode.className = 'form-status';
  }

  function setStatus(message, type) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.className = `form-status ${type}`;
  }

  function setDropTarget(card) {
    if (state?.targetCard === card) return;
    if (state?.targetCard) state.targetCard.classList.remove('is-drop-target');
    if (state && card) card.classList.add('is-drop-target');
    if (state) state.targetCard = card || null;
  }

  function removeGhost() {
    if (state?.ghost && state.ghost.parentNode) {
      state.ghost.parentNode.removeChild(state.ghost);
    }
  }

  function cleanup() {
    if (!state) return;
    if (state.sourceCard) state.sourceCard.classList.remove('is-drag-source');
    if (state.targetCard) state.targetCard.classList.remove('is-drop-target');
    removeGhost();
    state = null;
  }

  function updateGhostPosition(clientX, clientY) {
    if (!state?.ghost) return;
    state.ghost.style.left = `${clientX + 12}px`;
    state.ghost.style.top = `${clientY + 12}px`;
  }

  function findSlotCardAt(clientX, clientY) {
    const hit = document.elementFromPoint(clientX, clientY);
    const card = hit ? hit.closest('[data-team-slot]') : null;
    if (!card || !listNode.contains(card)) return null;
    return card;
  }

  listNode.addEventListener('pointerdown', (event) => {
    const sourceCard = event.target.closest('[data-team-slot]');
    if (!sourceCard || !listNode.contains(sourceCard)) return;
    if (!isAdmin()) return;

    const sourceId = sourceCard.getAttribute('data-team-id') || '';
    if (!sourceId) {
      setStatus('Only filled team cards can be dragged.', 'error');
      return;
    }

    clearStatus();
    state = {
      pointerId: event.pointerId,
      sourceCard,
      sourceSlot: Number(sourceCard.getAttribute('data-team-slot')),
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      targetCard: null,
      ghost: null
    };

    if (typeof sourceCard.setPointerCapture === 'function') {
      sourceCard.setPointerCapture(event.pointerId);
    }
  });

  listNode.addEventListener('pointermove', (event) => {
    if (!state || event.pointerId !== state.pointerId) return;

    const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (!state.dragging && distance > 8) {
      state.dragging = true;
      state.sourceCard.classList.add('is-drag-source');
      const ghost = document.createElement('div');
      ghost.className = 'team-drag-ghost';
      ghost.textContent = state.sourceCard.querySelector('h3')?.textContent || 'Team';
      document.body.appendChild(ghost);
      state.ghost = ghost;
    }

    if (!state.dragging) return;
    event.preventDefault();
    updateGhostPosition(event.clientX, event.clientY);

    const targetCard = findSlotCardAt(event.clientX, event.clientY);
    if (!targetCard) {
      setDropTarget(null);
      return;
    }

    const targetSlot = Number(targetCard.getAttribute('data-team-slot'));
    setDropTarget(targetSlot === state.sourceSlot ? null : targetCard);
  });

  function finalizeDrop(event) {
    if (!state || event.pointerId !== state.pointerId) return;
    const wasDragging = state.dragging;
    const sourceSlot = state.sourceSlot;
    let targetSlot = sourceSlot;

    if (wasDragging) {
      const targetCard = findSlotCardAt(event.clientX, event.clientY);
      if (targetCard) {
        const parsed = Number(targetCard.getAttribute('data-team-slot'));
        if (!Number.isNaN(parsed)) targetSlot = parsed;
      }
    }

    cleanup();

    if (!wasDragging || sourceSlot === targetSlot) return;
    swapTeamSlots(sourceSlot, targetSlot);
    renderApprovedTeams();
    buildFixtures();
    setStatus(`Swapped Slot ${sourceSlot} with Slot ${targetSlot}.`, 'success');
  }

  listNode.addEventListener('pointerup', finalizeDrop);
  listNode.addEventListener('pointercancel', cleanup);
}

function renderTeamApprovalCards() {
  const listNode = document.querySelector('[data-team-approvals-list]');
  const emptyNode = document.querySelector('[data-team-approvals-empty]');
  if (!listNode || !emptyNode) return;

  const registrations = getRegistrations();
  if (!registrations.length) {
    listNode.innerHTML = '';
    emptyNode.hidden = false;
    return;
  }

  emptyNode.hidden = true;
  listNode.innerHTML = registrations
    .map(
      (item, index) => `
        <article class="${getApprovalCardClass(item.status)}">
          <button type="button" class="approval-remove-btn admin-only" data-team-remove="${index}" aria-label="Remove ${item.displayTeamName}">×</button>
          <h4>${item.displayTeamName}</h4>
          <p>Base team: ${item.teamName}</p>
          <p>Location: ${item.teamLocation}</p>
          <p>Team Type: ${item.teamType || '-'}</p>
          <p>Payment Status: ${item.paymentStatus || '-'}</p>
          <p>Status: ${getStatusLabel(item.status)}</p>
          <button type="button" class="btn btn-secondary" data-team-view="${index}">View Details</button>
        </article>
      `
    )
    .join('');
}

function setupTeamDetailModal() {
  const modal = document.querySelector('[data-team-modal]');
  const detailBody = document.querySelector('[data-team-detail-body]');
  const closeButton = document.querySelector('[data-team-close]');
  const actionWrap = modal ? modal.querySelector('.admin-modal-actions') : null;
  const approvalsList = document.querySelector('[data-team-approvals-list]');
  if (!modal || !detailBody || !closeButton || !approvalsList || !actionWrap) return;

  const removeModal = document.createElement('div');
  removeModal.className = 'admin-modal';
  removeModal.setAttribute('data-team-remove-modal', '');
  removeModal.hidden = true;
  removeModal.innerHTML = `
    <div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Confirm team removal">
      <h3>Remove Team</h3>
      <p data-team-remove-message>Confirm remove this team out of the tournament?</p>
      <div class="admin-modal-actions">
        <button type="button" class="btn btn-secondary" data-team-remove-no>No</button>
        <button type="button" class="btn btn-danger" data-team-remove-yes>Yes, Remove</button>
      </div>
    </div>
  `;
  document.body.appendChild(removeModal);

  const removeMessage = removeModal.querySelector('[data-team-remove-message]');
  const removeNoButton = removeModal.querySelector('[data-team-remove-no]');
  const removeYesButton = removeModal.querySelector('[data-team-remove-yes]');
  let pendingRemoveIndex = null;

  function closeModal() {
    modal.classList.remove('open');
    modal.hidden = true;
  }

  function openRemoveModal(index, teamName) {
    pendingRemoveIndex = index;
    if (removeMessage) {
      removeMessage.textContent = `Confirm remove ${teamName} out of the tournament?`;
    }
    removeModal.hidden = false;
    removeModal.classList.add('open');
  }

  function closeRemoveModal() {
    pendingRemoveIndex = null;
    removeModal.classList.remove('open');
    removeModal.hidden = true;
  }

  approvalsList.addEventListener('click', (event) => {
    const removeTrigger = event.target.closest('[data-team-remove]');
    if (removeTrigger) {
      const registrations = getRegistrations();
      const index = Number(removeTrigger.getAttribute('data-team-remove'));
      const entry = registrations[index];
      if (!entry) return;
      openRemoveModal(index, entry.displayTeamName || entry.teamName || 'this team');
      return;
    }

    const trigger = event.target.closest('[data-team-view]');
    if (!trigger) return;

    const registrations = getRegistrations();
    const index = Number(trigger.getAttribute('data-team-view'));
    const entry = registrations[index];
    if (!entry) return;
    modal.setAttribute('data-team-index', String(index));

    const mandatoryPlayers = entry.mandatoryPlayers
      .map(
        (p) => `
          <div class="team-detail-row">
            <span>${escapeHtml(p.label)}</span>
            <span class="team-detail-value-stack">
              <span>${escapeHtml(p.name || '-')} - ${escapeHtml(p.aadhaar || '-')}</span>
              ${buildAadhaarPhotoDownloadMarkup(p.aadhaarPhoto, p.name || p.label)}
            </span>
          </div>
        `
      )
      .join('');

    const substitutes = entry.substitutePlayers
      .filter((p) => p.name || p.aadhaar)
      .map(
        (p) => `
          <div class="team-detail-row">
            <span>${escapeHtml(p.label)}</span>
            <span class="team-detail-value-stack">
              <span>${escapeHtml(p.name || '-')} - ${escapeHtml(p.aadhaar || '-')}</span>
              ${buildAadhaarPhotoDownloadMarkup(p.aadhaarPhoto, p.name || p.label)}
            </span>
          </div>
        `
      )
      .join('');

    detailBody.innerHTML = `
      <section class="team-detail-group">
        <h4>Team Info</h4>
        <div class="team-detail-row"><span>Display Team Name</span><span>${escapeHtml(entry.displayTeamName)}</span></div>
        <div class="team-detail-row"><span>Base Team Name</span><span>${escapeHtml(entry.teamName)}</span></div>
        <div class="team-detail-row"><span>Team Location</span><span>${escapeHtml(entry.teamLocation)}</span></div>
        <div class="team-detail-row"><span>Team Type</span><span>${escapeHtml(entry.teamType || '-')}</span></div>
        <div class="team-detail-row"><span>Status</span><span>${escapeHtml(getStatusLabel(entry.status))}</span></div>
      </section>

      <section class="team-detail-group">
        <h4>Captain</h4>
        <div class="team-detail-row"><span>Name</span><span>${escapeHtml(entry.captain.name)}</span></div>
        <div class="team-detail-row"><span>Phone</span><span>${escapeHtml(entry.captain.phone)}</span></div>
        <div class="team-detail-row">
          <span>Aadhaar</span>
          <span class="team-detail-value-stack">
            <span>${escapeHtml(entry.captain.aadhaar)}</span>
            ${buildAadhaarPhotoDownloadMarkup(entry.captain.aadhaarPhoto, entry.captain.name || 'captain')}
          </span>
        </div>
      </section>

      <section class="team-detail-group">
        <h4>Vice Captain</h4>
        <div class="team-detail-row"><span>Name</span><span>${escapeHtml(entry.vc.name)}</span></div>
        <div class="team-detail-row"><span>Phone</span><span>${escapeHtml(entry.vc.phone)}</span></div>
        <div class="team-detail-row">
          <span>Aadhaar</span>
          <span class="team-detail-value-stack">
            <span>${escapeHtml(entry.vc.aadhaar)}</span>
            ${buildAadhaarPhotoDownloadMarkup(entry.vc.aadhaarPhoto, entry.vc.name || 'vice-captain')}
          </span>
        </div>
      </section>

      <section class="team-detail-group">
        <h4>Payment</h4>
        <div class="team-detail-row"><span>Payment Status</span><span>${escapeHtml(entry.paymentStatus || '-')}</span></div>
        <div class="team-detail-row"><span>Paid Amount</span><span>${escapeHtml(entry.paymentStatus === 'Paid' ? (entry.paidAmount || '-') : '-')}</span></div>
      </section>

      <section class="team-detail-group">
        <h4>Playing XI (3-11)</h4>
        ${mandatoryPlayers}
      </section>

      <section class="team-detail-group">
        <h4>Substitutes (Optional)</h4>
        ${substitutes || '<div class="team-detail-row"><span>Info</span><span>No substitute details added.</span></div>'}
      </section>
    `;

    const approvedCount = registrations.filter((item) => item.status === 'approved').length;
    const approvalLimitReached = entry.status !== 'approved' && approvedCount >= tournament.teams;
    const canApprove = entry.status !== 'approved' && !approvalLimitReached;
    const canReject = entry.status !== 'rejected';
    actionWrap.innerHTML = `
      <button type="button" class="btn btn-secondary" data-team-close>Close</button>
      <button type="button" class="btn btn-success" data-team-approve ${canApprove ? '' : 'disabled'}>Approve</button>
      <button type="button" class="btn btn-danger" data-team-reject ${canReject ? '' : 'disabled'}>Reject</button>
      <p class="form-status ${approvalLimitReached ? 'error' : ''}" data-team-action-status>
        ${approvalLimitReached ? `Approval limit reached. Only ${tournament.teams} teams can be approved.` : ''}
      </p>
    `;

    const dynamicClose = actionWrap.querySelector('[data-team-close]');
    if (dynamicClose) {
      dynamicClose.addEventListener('click', closeModal);
    }

    modal.hidden = false;
    modal.classList.add('open');
  });

  actionWrap.addEventListener('click', (event) => {
    const approveButton = event.target.closest('[data-team-approve]');
    const rejectButton = event.target.closest('[data-team-reject]');
    if (!approveButton && !rejectButton) return;

    const actionStatus = actionWrap.querySelector('[data-team-action-status]');

    const index = Number(modal.getAttribute('data-team-index'));
    if (Number.isNaN(index)) return;

    const registrations = getRegistrations();
    if (!registrations[index]) return;

    if (approveButton) {
      const approvedCount = registrations.filter((item) => item.status === 'approved').length;
      const entry = registrations[index];
      const isAlreadyApproved = entry.status === 'approved';
      if (!isAlreadyApproved && approvedCount >= tournament.teams) {
        if (actionStatus) {
          actionStatus.textContent = `Cannot approve more than ${tournament.teams} teams.`;
          actionStatus.className = 'form-status error';
        }
        return;
      }
    }

    registrations[index].status = approveButton ? 'approved' : 'rejected';
    saveRegistrations(registrations);
    syncTeamSlotsWithRegistrations(registrations);
    renderTeamApprovalCards();
    renderApprovedTeams();
    buildFixtures();
    closeModal();
  });

  if (removeNoButton) {
    removeNoButton.addEventListener('click', closeRemoveModal);
  }

  if (removeYesButton) {
    removeYesButton.addEventListener('click', () => {
      if (pendingRemoveIndex === null) return;

      const registrations = getRegistrations();
      const removed = registrations[pendingRemoveIndex];
      if (!removed) {
        closeRemoveModal();
        return;
      }

      registrations.splice(pendingRemoveIndex, 1);
      saveRegistrations(registrations);
      removeTeamFromTournamentData(removed.id);

      renderTeamApprovalCards();
      renderApprovedTeams();
      buildFixtures();
      closeModal();
      closeRemoveModal();
    });
  }

  removeModal.addEventListener('click', (event) => {
    if (event.target === removeModal) closeRemoveModal();
  });

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
}

function setupRegistrationForm() {
  const form = document.querySelector('[data-register-form]');
  if (!form) return;

  const mandatoryList = form.querySelector('[data-players-mandatory]');
  const substituteList = form.querySelector('[data-players-substitute]');
  const statusNode = form.querySelector('[data-form-status]');
  const paidAmountWrap = form.querySelector('[data-paid-amount-wrap]');
  const paidAmountInput = form.querySelector('textarea[name="paidAmount"]');
  const paymentStatusInputs = Array.from(form.querySelectorAll('input[name="paymentStatus"]'));

  if (mandatoryList) {
    mandatoryList.innerHTML = Array.from({ length: 9 }, (_, i) => {
      const playerNo = i + 3;
      return `
        <div class="player-row">
          <strong>Player ${playerNo}</strong>
          <div class="input-wrap">
            <label class="field-mini-label" for="player${playerNo}Name">Name</label>
            <input id="player${playerNo}Name" type="text" name="player${playerNo}Name" required placeholder="Player ${playerNo} name" />
            <span class="field-error" data-field-error></span>
          </div>
          <div class="input-wrap">
            <label class="field-mini-label" for="player${playerNo}Aadhaar">Aadhaar Number</label>
            <input id="player${playerNo}Aadhaar" type="text" name="player${playerNo}Aadhaar" required data-aadhaar maxlength="14" inputmode="numeric" placeholder="xxxx xxxx xxxx" />
            <span class="field-error" data-field-error></span>
          </div>
          <div class="input-wrap">
            <label class="field-mini-label" for="player${playerNo}AadhaarPhoto">Aadhaar Photo</label>
            <input id="player${playerNo}AadhaarPhoto" type="file" name="player${playerNo}AadhaarPhoto" required data-aadhaar-photo accept="${aadhaarPhotoConfig.acceptAttr}" />
            <span class="field-error" data-field-error></span>
          </div>
        </div>
      `;
    }).join('');
  }

  if (substituteList) {
    substituteList.innerHTML = Array.from({ length: 5 }, (_, i) => {
      const subNo = i + 1;
      return `
        <div class="player-row">
          <strong>Substitute ${subNo}</strong>
          <div class="input-wrap">
            <label class="field-mini-label" for="sub${subNo}Name">Name</label>
            <input id="sub${subNo}Name" type="text" name="sub${subNo}Name" placeholder="Substitute ${subNo} name" />
            <span class="field-error" data-field-error></span>
          </div>
          <div class="input-wrap">
            <label class="field-mini-label" for="sub${subNo}Aadhaar">Aadhaar Number</label>
            <input id="sub${subNo}Aadhaar" type="text" name="sub${subNo}Aadhaar" data-aadhaar maxlength="14" inputmode="numeric" placeholder="xxxx xxxx xxxx" />
            <span class="field-error" data-field-error></span>
          </div>
          <div class="input-wrap">
            <label class="field-mini-label" for="sub${subNo}AadhaarPhoto">Aadhaar Photo</label>
            <input id="sub${subNo}AadhaarPhoto" type="file" name="sub${subNo}AadhaarPhoto" data-aadhaar-photo accept="${aadhaarPhotoConfig.acceptAttr}" />
            <span class="field-error" data-field-error></span>
          </div>
        </div>
      `;
    }).join('');
  }

  function ensureFieldErrorNode(input) {
    const wrap = input.closest('.input-wrap');
    if (wrap) {
      const node = wrap.querySelector('[data-field-error]');
      if (node) return node;
      const created = document.createElement('span');
      created.className = 'field-error';
      created.setAttribute('data-field-error', '');
      wrap.appendChild(created);
      return created;
    }

    const label = input.closest('label');
    if (label) {
      const node = label.querySelector('[data-field-error]');
      if (node) return node;
      const created = document.createElement('span');
      created.className = 'field-error';
      created.setAttribute('data-field-error', '');
      label.appendChild(created);
      return created;
    }

    return null;
  }

  function getFieldLabel(input) {
    const label = input.closest('label');
    if (label) {
      const raw = label.childNodes[0] ? String(label.childNodes[0].textContent || '') : '';
      return raw.replace('*', '').trim() || input.name;
    }

    const row = input.closest('.player-row');
    if (row) {
      const rowTitle = row.querySelector('strong')?.textContent?.trim() || 'Player';
      const isPhoto = /aadhaarphoto/i.test(input.name);
      const isAadhaar = /aadhaar/i.test(input.name);
      if (isPhoto) return `${rowTitle} Aadhaar Photo`;
      return isAadhaar ? `${rowTitle} Aadhaar` : `${rowTitle} Name`;
    }

    return input.name || 'Field';
  }

  function setFieldError(input, message) {
    const errorNode = ensureFieldErrorNode(input);
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    if (errorNode) errorNode.textContent = message;
  }

  function clearFieldError(input) {
    const errorNode = ensureFieldErrorNode(input);
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    if (errorNode) errorNode.textContent = '';
  }

  function clearAllFieldErrors() {
    form.querySelectorAll('input, select, textarea').forEach((field) => clearFieldError(field));
  }

  function setPaidAmountVisibility(paymentStatus) {
    if (!paidAmountWrap || !paidAmountInput) return;
    const isPaid = String(paymentStatus || '').trim().toLowerCase() === 'paid';
    paidAmountWrap.hidden = !isPaid;
    paidAmountInput.disabled = !isPaid;
    if (!isPaid) {
      paidAmountInput.value = '';
      clearFieldError(paidAmountInput);
    }
  }

  paymentStatusInputs.forEach((input) => {
    input.addEventListener('pointerdown', () => {
      input.dataset.wasChecked = input.checked ? '1' : '0';
    });

    input.addEventListener('click', () => {
      if (input.dataset.wasChecked !== '1') return;
      input.checked = false;
      setPaidAmountVisibility('');
      clearFieldError(input);
    });
  });

  function validateRegistrationForm() {
    const errors = [];
    const errorInputs = new Set();

    function addError(input, message) {
      if (errorInputs.has(input)) return;
      errorInputs.add(input);
      errors.push({ input, message });
    }

    function aadhaarDigits(value) {
      return String(value || '').replace(/\D/g, '');
    }

    function getAadhaarOwnerName(input) {
      const nameToAadhaar = {
        captainAadhaar: 'captainName',
        vcAadhaar: 'vcName'
      };

      let nameInput = null;
      if (nameToAadhaar[input.name]) {
        nameInput = form.querySelector(`[name="${nameToAadhaar[input.name]}"]`);
      } else {
        const playerMatch = input.name.match(/^player(\d+)Aadhaar$/);
        const subMatch = input.name.match(/^sub(\d+)Aadhaar$/);
        if (playerMatch) {
          nameInput = form.querySelector(`[name="player${playerMatch[1]}Name"]`);
        } else if (subMatch) {
          nameInput = form.querySelector(`[name="sub${subMatch[1]}Name"]`);
        }
      }

      const enteredName = nameInput ? String(nameInput.value || '').trim() : '';
      if (enteredName) return enteredName;
      return getFieldLabel(input).replace(/\s*Aadhaar$/i, '').trim();
    }

    const requiredInputs = Array.from(form.querySelectorAll('input[required], select[required]'));
    const validAadhaarEntries = [];

    requiredInputs.forEach((input) => {
      if (input.type === 'radio') return;
      if (input.hasAttribute('data-aadhaar')) return;
      const value = (input.value || '').trim();
      if (!value) {
        addError(input, `${getFieldLabel(input)} is required.`);
      }
    });

    const phoneInputs = Array.from(form.querySelectorAll('input[name$="Phone"]'));
    phoneInputs.forEach((input) => {
      const value = (input.value || '').trim();
      if (!value) return;
      if (!/^\d{10}$/.test(value)) {
        addError(input, `${getFieldLabel(input)} must be exactly 10 digits.`);
      }
    });

    const selectedPaymentStatusInput = paymentStatusInputs.find((input) => input.checked);
    const paymentStatus = selectedPaymentStatusInput ? String(selectedPaymentStatusInput.value || '').trim() : '';

    if (!paymentStatus) {
      if (paymentStatusInputs[0]) addError(paymentStatusInputs[0], 'Payment Status is required.');
    }

    const paidAmountValue = String(paidAmountInput?.value || '').trim();
    if (paymentStatus === 'Paid') {
      if (!paidAmountValue) {
        if (paidAmountInput) addError(paidAmountInput, 'Paid Amount is required when Payment Status is Paid.');
      } else if (!/^\d+$/.test(paidAmountValue)) {
        if (paidAmountInput) addError(paidAmountInput, 'Paid Amount must contain numbers only.');
      }
    }

    const aadhaarInputs = Array.from(form.querySelectorAll('input[data-aadhaar]'));
    aadhaarInputs.forEach((input) => {
      const value = (input.value || '').trim();
      const subMatch = input.name.match(/^sub(\d+)Aadhaar$/);

      if (subMatch) {
        const subNameInput = form.querySelector(`[name="sub${subMatch[1]}Name"]`);
        const hasSubName = !!(subNameInput && (subNameInput.value || '').trim());

        if (hasSubName && !value) {
          addError(input, `${getFieldLabel(input)} is required when substitute name is entered.`);
          return;
        }

        if (!hasSubName && value) {
          addError(subNameInput || input, 'Substitute name is required when Aadhaar is entered.');
          return;
        }

        if (value && !isValidAadhaar(value)) {
          addError(input, `${getFieldLabel(input)} must be in xxxx xxxx xxxx format.`);
          return;
        }

        if (value && isValidAadhaar(value)) {
          validAadhaarEntries.push({
            input,
            digits: aadhaarDigits(value),
            ownerName: getAadhaarOwnerName(input)
          });
        }
        return;
      }

      if (!value) {
        addError(input, `${getFieldLabel(input)} is required.`);
        return;
      }

      if (!isValidAadhaar(value)) {
        addError(input, `${getFieldLabel(input)} must be in xxxx xxxx xxxx format.`);
        return;
      }

      validAadhaarEntries.push({
        input,
        digits: aadhaarDigits(value),
        ownerName: getAadhaarOwnerName(input)
      });
    });

    const aadhaarPhotoInputs = Array.from(form.querySelectorAll('input[data-aadhaar-photo]'));
    aadhaarPhotoInputs.forEach((input) => {
      const file = input.files && input.files[0];
      const subMatch = input.name.match(/^sub(\d+)AadhaarPhoto$/);

      if (subMatch) {
        const subNo = subMatch[1];
        const subNameInput = form.querySelector(`[name="sub${subNo}Name"]`);
        const subAadhaarInput = form.querySelector(`[name="sub${subNo}Aadhaar"]`);
        const hasSubName = !!(subNameInput && String(subNameInput.value || '').trim());
        const hasSubAadhaar = !!(subAadhaarInput && String(subAadhaarInput.value || '').trim());

        if (file && !hasSubName) {
          addError(subNameInput || input, 'Substitute name is required when Aadhaar photo is entered.');
        }

        if (file && !hasSubAadhaar) {
          addError(subAadhaarInput || input, 'Substitute Aadhaar is required when Aadhaar photo is entered.');
        }

        if ((hasSubName || hasSubAadhaar) && !file) {
          addError(input, 'Substitute Aadhaar Photo is required when substitute details are entered.');
          return;
        }
      }

      if (!file) return;

      if (!isSupportedAadhaarPhotoFile(file)) {
        addError(input, `${getFieldLabel(input)} must be JPG, JPEG, or PNG.`);
        return;
      }

      if (file.size > aadhaarPhotoConfig.maxSizeBytes) {
        addError(input, `${getFieldLabel(input)} must be ${getAadhaarPhotoLimitText()} or smaller.`);
      }
    });

    const seenInCurrentTeam = new Map();
    validAadhaarEntries.forEach((entry) => {
      if (!entry.digits) return;
      const first = seenInCurrentTeam.get(entry.digits);
      if (!first) {
        seenInCurrentTeam.set(entry.digits, entry);
        return;
      }

      addError(
        entry.input,
        `${entry.ownerName} - Aadhaar number has already in this team at the tournament. You cannot add again.`
      );
    });

    const existingAadhaarByTeam = new Map();
    getRegistrations().forEach((reg) => {
      const values = [
        reg?.captain?.aadhaar,
        reg?.vc?.aadhaar,
        ...(Array.isArray(reg?.mandatoryPlayers) ? reg.mandatoryPlayers.map((p) => p.aadhaar) : []),
        ...(Array.isArray(reg?.substitutePlayers) ? reg.substitutePlayers.map((p) => p.aadhaar) : [])
      ];

      values.forEach((raw) => {
        const digits = aadhaarDigits(raw);
        if (digits.length !== 12 || existingAadhaarByTeam.has(digits)) return;
        existingAadhaarByTeam.set(digits, reg.displayTeamName || reg.teamName || 'another team');
      });
    });

    validAadhaarEntries.forEach((entry) => {
      const existingTeam = existingAadhaarByTeam.get(entry.digits);
      if (!existingTeam) return;
      addError(
        entry.input,
        `${entry.ownerName} - Aadhaar number has already in team ${existingTeam} at the tournament. You cannot add again.`
      );
    });

    return errors;
  }

  form.querySelectorAll('input, select, textarea').forEach((field) => ensureFieldErrorNode(field));

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement && target.name === 'paidAmount') {
      target.value = target.value.replace(/\D/g, '');
      clearFieldError(target);
      return;
    }

    if (target instanceof HTMLInputElement) {
      if (target.hasAttribute('data-aadhaar')) {
        target.value = formatAadhaar(target.value);
      }
      if (/Phone$/.test(target.name || '')) {
        target.value = target.value.replace(/\D/g, '').slice(0, 10);
      }
      clearFieldError(target);
      return;
    }
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      if (target.type === 'file') {
        clearFieldError(target);
        return;
      }

      if (target.name === 'paymentStatus') {
        setPaidAmountVisibility(target.value);
        clearFieldError(target);
        return;
      }

      clearFieldError(target);
    }

    if (target instanceof HTMLSelectElement) {
      clearFieldError(target);

      if (target.name !== 'teamType') return;
      const selectedType = resolveTeamTypeLabel(target.value);
      if (!selectedType) return;

      const currentCount = countRegistrationsForTeamType(getRegistrations(), selectedType);
      if (currentCount >= teamTypeConfig.limit) {
        alert(buildTeamTypeLimitMessage(selectedType));
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    clearAllFieldErrors();
    if (statusNode) {
      statusNode.textContent = '';
      statusNode.className = 'form-status';
    }
    try {
      const errors = validateRegistrationForm();
      if (errors.length) {
        const handled = new Set();
        errors.forEach(({ input, message }) => {
          if (handled.has(input)) return;
          handled.add(input);
          setFieldError(input, message);
        });

        if (statusNode) {
          statusNode.textContent = 'Please fix the highlighted fields.';
          statusNode.classList.add('error');
        }

        const firstInput = errors[0].input;
        if (firstInput && typeof firstInput.focus === 'function') firstInput.focus();
        return;
      }

      const formData = new FormData(form);
      const teamName = String(formData.get('teamName') || '').trim();
      const teamType = resolveTeamTypeLabel(String(formData.get('teamType') || '').trim());
      if (!teamType) {
        const teamTypeInput = form.querySelector('select[name="teamType"]');
        if (teamTypeInput) {
          setFieldError(teamTypeInput, 'Team Type is required.');
          teamTypeInput.focus();
        }
        if (statusNode) {
          statusNode.textContent = 'Please fix the highlighted fields.';
          statusNode.classList.add('error');
        }
        return;
      }

      const latestRegistrations = await getLatestRegistrationsForLimitCheck();
      const teamTypeCount = countRegistrationsForTeamType(latestRegistrations, teamType);
      if (teamTypeCount >= teamTypeConfig.limit) {
        const teamTypeInput = form.querySelector('select[name="teamType"]');
        if (teamTypeInput) {
          setFieldError(teamTypeInput, buildTeamTypeLimitMessage(teamType));
          teamTypeInput.focus();
        }
        if (statusNode) {
          statusNode.textContent = 'Selected Team Type registration limit reached.';
          statusNode.classList.add('error');
        }
        alert(buildTeamTypeLimitMessage(teamType));
        return;
      }

      const sameTeamCount = latestRegistrations.filter((r) => (r.teamName || '').toLowerCase() === teamName.toLowerCase()).length;
      const displayTeamName = sameTeamCount ? `${teamName} ${sameTeamCount + 1}` : teamName;

      const mandatoryPlayers = await Promise.all(Array.from({ length: 9 }, async (_, i) => {
        const playerNo = i + 3;
        const photoInput = form.querySelector(`[name="player${playerNo}AadhaarPhoto"]`);
        const photoFile = photoInput instanceof HTMLInputElement ? photoInput.files?.[0] : null;
        return {
          label: `Player ${playerNo}`,
          name: String(formData.get(`player${playerNo}Name`) || '').trim(),
          aadhaar: String(formData.get(`player${playerNo}Aadhaar`) || '').trim(),
          aadhaarPhotoUpload: await buildAadhaarPhotoUpload(photoFile || null)
        };
      }));

      const substitutePlayers = await Promise.all(Array.from({ length: 5 }, async (_, i) => {
        const subNo = i + 1;
        const photoInput = form.querySelector(`[name="sub${subNo}AadhaarPhoto"]`);
        const photoFile = photoInput instanceof HTMLInputElement ? photoInput.files?.[0] : null;
        return {
          label: `Substitute ${subNo}`,
          name: String(formData.get(`sub${subNo}Name`) || '').trim(),
          aadhaar: String(formData.get(`sub${subNo}Aadhaar`) || '').trim(),
          aadhaarPhotoUpload: await buildAadhaarPhotoUpload(photoFile || null)
        };
      }));

      const paymentStatus = String(formData.get('paymentStatus') || '').trim();
      const paidAmount = String(formData.get('paidAmount') || '').trim();

      if (!paymentStatus) {
        const paymentStatusInput = form.querySelector('input[name="paymentStatus"]');
        if (paymentStatusInput) {
          setFieldError(paymentStatusInput, 'Payment Status is required.');
          paymentStatusInput.focus();
        }
        if (statusNode) {
          statusNode.textContent = 'Please fix the highlighted fields.';
          statusNode.classList.add('error');
        }
        return;
      }

      if (paymentStatus === 'Paid') {
        if (!paidAmount || !/^\d+$/.test(paidAmount)) {
          if (paidAmountInput) {
            setFieldError(paidAmountInput, 'Enter Paid Amount in numbers only.');
            paidAmountInput.focus();
          }
          if (statusNode) {
            statusNode.textContent = 'Please fix the highlighted fields.';
            statusNode.classList.add('error');
          }
          return;
        }
      }

      const invalidSubNoName = substitutePlayers.find((player) => player.aadhaar && !player.name);
      if (invalidSubNoName) {
        const subNo = Number(String(invalidSubNoName.label || '').replace(/\D/g, ''));
        const subNameInput = Number.isInteger(subNo) ? form.querySelector(`[name="sub${subNo}Name"]`) : null;
        if (subNameInput) {
          setFieldError(subNameInput, 'Substitute name is required when Aadhaar is entered.');
          subNameInput.focus();
        }
        if (statusNode) {
          statusNode.textContent = 'Please fix the highlighted fields.';
          statusNode.classList.add('error');
        }
        return;
      }

      const invalidSubNoAadhaar = substitutePlayers.find((player) => player.name && !player.aadhaar);
      if (invalidSubNoAadhaar) {
        const subNo = Number(String(invalidSubNoAadhaar.label || '').replace(/\D/g, ''));
        const subAadhaarInput = Number.isInteger(subNo) ? form.querySelector(`[name="sub${subNo}Aadhaar"]`) : null;
        if (subAadhaarInput) {
          setFieldError(subAadhaarInput, 'Substitute Aadhaar is required when name is entered.');
          subAadhaarInput.focus();
        }
        if (statusNode) {
          statusNode.textContent = 'Please fix the highlighted fields.';
          statusNode.classList.add('error');
        }
        return;
      }

      const record = {
        id: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
        teamName,
        displayTeamName,
        teamLocation: String(formData.get('teamLocation') || '').trim(),
        teamType,
        captain: {
          name: String(formData.get('captainName') || '').trim(),
          phone: String(formData.get('captainPhone') || '').trim(),
          aadhaar: String(formData.get('captainAadhaar') || '').trim(),
          aadhaarPhotoUpload: await buildAadhaarPhotoUpload(
            form.querySelector('[name="captainAadhaarPhoto"]')?.files?.[0] || null
          )
        },
        vc: {
          name: String(formData.get('vcName') || '').trim(),
          phone: String(formData.get('vcPhone') || '').trim(),
          aadhaar: String(formData.get('vcAadhaar') || '').trim(),
          aadhaarPhotoUpload: await buildAadhaarPhotoUpload(
            form.querySelector('[name="vcAadhaarPhoto"]')?.files?.[0] || null
          )
        },
        paymentStatus,
        paidAmount: paymentStatus === 'Paid' ? paidAmount : '',
        mandatoryPlayers,
        substitutePlayers
      };

      if (isCloudEnabled()) {
        try {
          await cloudPost({
            action: 'registerTeam',
            id: record.id,
            teamName: record.teamName,
            teamType: record.teamType,
            captainName: record.captain?.name || '',
            captainPhone: record.captain?.phone || '',
            captainAadhaar: record.captain?.aadhaar || '',
            playerJson: record,
            status: record.status,
            createdAt: record.createdAt
          });
          await hydrateLocalStateFromCloud();
        } catch (error) {
          if (error?.code === 'TEAM_TYPE_LIMIT_REACHED') {
            const popupMessage = buildTeamTypeLimitMessage(teamType);
            const teamTypeInput = form.querySelector('select[name="teamType"]');
            if (teamTypeInput) {
              setFieldError(teamTypeInput, popupMessage);
              teamTypeInput.focus();
            }
            if (statusNode) {
              statusNode.textContent = 'Selected Team Type registration limit reached.';
              statusNode.classList.add('error');
            }
            alert(popupMessage);
            return;
          }

          if (statusNode) {
            statusNode.textContent = 'Unable to submit registration now. Please try again.';
            statusNode.classList.add('error');
          }
          return;
        }
      } else {
        const registrations = getRegistrations();
        registrations.push(record);
        saveRegistrations(registrations);
      }

      renderTeamApprovalCards();
      renderApprovedTeams();

      if (statusNode) {
        statusNode.textContent = `Registration submitted successfully as ${displayTeamName}.`;
        statusNode.classList.add('success');
      }

      form.reset();
      setPaidAmountVisibility('');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  setPaidAmountVisibility('');

  renderTeamApprovalCards();
  renderApprovedTeams();
  setupTeamDetailModal();
}

async function initializeApp() {
  fillCommonData();
  buildCounts();
  buildOrganizers();
  buildAwards();
  setupCountdown();
  setupScrollReveal();
  setupRedirectPage();
  highlightCurrentNav();
  setupBackToTop();

  buildFixtures();
  buildResultsPage();
  setupAdminLogin();
  setupRegistrationForm();
  renderApprovedTeams();
  setupTeamSlotDragAndDrop();
  setupFixtureWinnerSelection();
  setupResultsAdminEditing();

  if (isCloudEnabled()) {
    hydrateLocalStateFromCloud()
      .then(() => {
        renderTeamApprovalCards();
        renderApprovedTeams();
        buildFixtures();
        buildResultsPage();
      })
      .catch((error) => {
        console.error('Cloud initialization failed:', error);
      });
  }
}

initializeApp();
