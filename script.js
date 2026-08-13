const SHEET_ID = "1_TPFhnUeAzjGKyQXz7m1z9PkoJufCRoNEnBmBnEkWtg";

const SHEETS = {
  registrations: "Registrations",
  teamSlots: "Team_slots",
  matches: "Matches",
  resultsMeta: "Results_meta",
  admins: "Admins"
};

const TEAM_TYPE_LIMIT = 8;
const TEAM_TYPE_SETTING = "Setting Team";
const TEAM_TYPE_SINGLE_VILLAGE = "Single Village Team";
const AADHAAR_STORAGE_MODE = "metadata-only";
const AADHAAR_PREVIEW_MAX_CHARS = 12000;
const AADHAAR_MAX_BYTES = 2 * 1024 * 1024;
const AADHAAR_ALLOWED_TYPES = {
  "image/jpeg": true,
  "image/png": true,
  "image/jpg": true,
  "image/pjpeg": true
};
const AADHAAR_DRIVE_FOLDER_ID = "";

function doGet(e) {
  try {
    const action = (e.parameter.action || "allData").trim();

    if (action === "allData") {
      return json({
        ok: true,
        registrations: readRows(SHEETS.registrations),
        teamSlots: readRows(SHEETS.teamSlots),
        matches: readRows(SHEETS.matches),
        resultsMeta: readRows(SHEETS.resultsMeta)
      });
    }

    if (action === "registrations") return json({ ok: true, data: readRows(SHEETS.registrations) });
    if (action === "teamSlots") return json({ ok: true, data: readRows(SHEETS.teamSlots) });
    if (action === "matches") return json({ ok: true, data: readRows(SHEETS.matches) });
    if (action === "resultsMeta") return json({ ok: true, data: readRows(SHEETS.resultsMeta) });

    return json({ ok: false, error: "Unknown action" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = (body.action || "").trim();

    if (action === "adminLogin") {
      const ok = verifyAdminCredentials(body.username, body.password);
      if (!ok) throw new Error("Unauthorized");
      return json({ ok: true });
    }

    if (action === "registerTeam") {
      const requestedType = resolveTeamTypeLabel(
        body.teamType || (body.playerJson && body.playerJson.teamType) || ""
      );
      if (!requestedType) {
        return json({ ok: false, error: "TEAM_TYPE_REQUIRED" });
      }

      const lock = LockService.getScriptLock();
      lock.waitLock(30000);

      try {
        const existingRows = readRows(SHEETS.registrations);
        const count = countRegistrationsForTeamType(existingRows, requestedType);
        if (count >= TEAM_TYPE_LIMIT) {
          return json({
            ok: false,
            error: "TEAM_TYPE_LIMIT_REACHED",
            message: "Team type registration limit reached",
            teamType: requestedType,
            limit: TEAM_TYPE_LIMIT
          });
        }

        let playerJson = body.playerJson && typeof body.playerJson === "object"
          ? body.playerJson
          : {};
        const registrationId = body.id || Utilities.getUuid();
        playerJson.teamType = requestedType;
        playerJson.id = registrationId;
        playerJson = persistAadhaarPhotosInRegistration(
          playerJson,
          body.teamName || playerJson.teamName || "",
          registrationId
        );

        const row = [
          registrationId,
          body.teamName || "",
          body.captainName || "",
          body.captainPhone || "",
          body.captainAadhaar || "",
          JSON.stringify(playerJson),
          body.status || "pending",
          body.createdAt || new Date().toISOString()
        ];
        appendRow(SHEETS.registrations, row);
        return json({ ok: true, registration: playerJson });
      } finally {
        lock.releaseLock();
      }
    }

    if (action === "updateRegistrationStatus") {
      requireAdminFromBody(body);
      const ok = updateById(SHEETS.registrations, "id", body.id, { status: body.status || "pending" });
      return json({ ok });
    }

    if (action === "saveTeamSlots") {
      requireAdminFromBody(body);
      overwriteRows(SHEETS.teamSlots, ["slot", "teamId", "teamName"], body.rows || []);
      return json({ ok: true });
    }

    if (action === "saveMatches") {
      requireAdminFromBody(body);
      overwriteRows(
        SHEETS.matches,
        ["matchId", "round", "teamAId", "teamAName", "teamBId", "teamBName", "winnerId", "winnerName", "updatedAt"],
        body.rows || []
      );
      return json({ ok: true });
    }

    if (action === "saveResultsMeta") {
      requireAdminFromBody(body);
      overwriteRows(SHEETS.resultsMeta, ["key", "value"], body.rows || []);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown action" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function readRows(tabName) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    out.push(obj);
  }
  return out;
}

function appendRow(tabName, row) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
  sh.appendRow(row);
}

function overwriteRows(tabName, headers, rowsAsObjects) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
  sh.clearContents();
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (!rowsAsObjects.length) return;

  const data = rowsAsObjects.map(r => headers.map(h => r[h] ?? ""));
  sh.getRange(2, 1, data.length, headers.length).setValues(data);
}

function updateById(tabName, idColumnName, idValue, patch) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(tabName);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return false;

  const headers = values[0];
  const idCol = headers.indexOf(idColumnName);
  if (idCol === -1) return false;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(idValue)) {
      Object.keys(patch).forEach(key => {
        const col = headers.indexOf(key);
        if (col !== -1) values[i][col] = patch[key];
      });
      sh.getRange(i + 1, 1, 1, headers.length).setValues([values[i]]);
      return true;
    }
  }
  return false;
}

function requireAdminFromBody(body) {
  const user = String(body.adminUser || "").trim();
  const pass = String(body.adminPass || "");
  if (!verifyAdminCredentials(user, pass)) throw new Error("Unauthorized");
}

function verifyAdminCredentials(username, password) {
  const user = normalizeUserName(username);
  const pass = String(password || "").trim();
  if (!user || !pass) return false;

  const rows = readRows(SHEETS.admins);
  if (!rows.length) return false;

  const row = rows.find(function(r) {
    const normalizedRow = normalizeRowKeys(r);
    const candidateUser = readFirstDefined(normalizedRow, [
      "username",
      "user",
      "userid",
      "admin",
      "adminId"
    ]);
    return normalizeUserName(candidateUser) === user;
  });
  if (!row) return false;

  const normalizedRow = normalizeRowKeys(row);
  const stored = String(
    readFirstDefined(normalizedRow, [
      "passwordHash",
      "password",
      "pass",
      "pwd"
    ]) || ""
  ).trim();
  if (!stored) return false;

  if (stored === pass) return true;

  const hashedInput = sha256Hex(pass);
  return stored.toLowerCase() === hashedInput.toLowerCase();
}

function normalizeUserName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function readFirstDefined(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var normalizedKey = normalizeRowKey(keys[i]);
    var value = obj[normalizedKey];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function normalizeRowKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeRowKeys(row) {
  var out = {};
  if (!row || typeof row !== "object") return out;
  Object.keys(row).forEach(function(key) {
    out[normalizeRowKey(key)] = row[key];
  });
  return out;
}

function sha256Hex(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function normalizeTeamType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function resolveTeamTypeLabel(value) {
  const normalized = normalizeTeamType(value);
  if (normalized === normalizeTeamType(TEAM_TYPE_SETTING)) return TEAM_TYPE_SETTING;
  if (normalized === normalizeTeamType(TEAM_TYPE_SINGLE_VILLAGE)) return TEAM_TYPE_SINGLE_VILLAGE;
  return "";
}

function isActiveRegistrationStatus(status) {
  const normalized = String(status || "pending").trim().toLowerCase();
  return normalized !== "rejected" && normalized !== "removed";
}

function countRegistrationsForTeamType(rows, teamTypeLabel) {
  if (!Array.isArray(rows)) return 0;
  const targetType = normalizeTeamType(teamTypeLabel);
  if (!targetType) return 0;

  return rows.reduce(function(total, row) {
    if (!isActiveRegistrationStatus(row && row.status)) return total;

    let details = {};
    try {
      details = row && row.playerJson ? JSON.parse(String(row.playerJson)) : {};
    } catch (err) {
      details = {};
    }

    const label = resolveTeamTypeLabel((details && details.teamType) || (row && row.teamType) || "");
    if (normalizeTeamType(label) === targetType) return total + 1;
    return total;
  }, 0);
}

function persistAadhaarPhotosInRegistration(playerJson, teamName, registrationId) {
  const record = playerJson && typeof playerJson === "object" ? playerJson : {};
  const teamFolder = AADHAAR_STORAGE_MODE === "metadata-only"
    ? null
    : getOrCreateTeamRegistrationFolder(teamName, registrationId);

  record.captain = normalizePersonPayload(record.captain);
  record.vc = normalizePersonPayload(record.vc);
  record.mandatoryPlayers = Array.isArray(record.mandatoryPlayers) ? record.mandatoryPlayers : [];
  record.substitutePlayers = Array.isArray(record.substitutePlayers) ? record.substitutePlayers : [];

  record.captain.aadhaarPhoto = persistPersonAadhaarPhoto(record.captain, teamName, "Captain", registrationId, teamFolder);
  record.vc.aadhaarPhoto = persistPersonAadhaarPhoto(record.vc, teamName, "Vice Captain", registrationId, teamFolder);

  record.mandatoryPlayers = record.mandatoryPlayers.map(function(person, index) {
    const normalized = normalizePersonPayload(person);
    const label = normalized.label || ("Player " + (index + 3));
    normalized.label = label;
    normalized.aadhaarPhoto = persistPersonAadhaarPhoto(normalized, teamName, label, registrationId, teamFolder);
    return normalized;
  });

  record.substitutePlayers = record.substitutePlayers.map(function(person, index) {
    const normalized = normalizePersonPayload(person);
    const label = normalized.label || ("Substitute " + (index + 1));
    normalized.label = label;
    normalized.aadhaarPhoto = persistPersonAadhaarPhoto(normalized, teamName, label, registrationId, teamFolder);
    return normalized;
  });

  return record;
}

function normalizePersonPayload(person) {
  const source = person && typeof person === "object" ? person : {};
  return {
    label: String(source.label || "").trim(),
    name: String(source.name || "").trim(),
    phone: String(source.phone || "").trim(),
    aadhaar: String(source.aadhaar || "").trim(),
    aadhaarPhoto: normalizeAadhaarPhotoMeta(source.aadhaarPhoto),
    aadhaarPhotoUpload: source.aadhaarPhotoUpload && typeof source.aadhaarPhotoUpload === "object"
      ? source.aadhaarPhotoUpload
      : null
  };
}

function normalizeAadhaarPhotoMeta(photo) {
  if (!photo || typeof photo !== "object") return null;
  const fileId = String(photo.fileId || "").trim();
  const fileName = String(photo.fileName || "").trim();
  const previewDataUrl = sanitizeAadhaarPreviewDataUrl(photo.previewDataUrl || photo.dataUrl || "");
  const downloadUrl = String(photo.downloadUrl || "").trim() || (fileId
    ? "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(fileId)
    : previewDataUrl);
  if (!fileId && !fileName && !downloadUrl && !previewDataUrl) return null;
  return {
    fileId: fileId,
    fileName: fileName,
    downloadUrl: downloadUrl,
    previewDataUrl: previewDataUrl
  };
}

function persistPersonAadhaarPhoto(person, teamName, label, registrationId, teamFolder) {
  const existingPhoto = normalizeAadhaarPhotoMeta(person.aadhaarPhoto);
  const upload = person.aadhaarPhotoUpload && typeof person.aadhaarPhotoUpload === "object"
    ? person.aadhaarPhotoUpload
    : null;

  delete person.aadhaarPhotoUpload;
  if (!upload) return existingPhoto;

  if (AADHAAR_STORAGE_MODE === "metadata-only") {
    return saveAadhaarPhotoAsMetadata(upload, teamName, person.name || "", label, registrationId);
  }

  return saveAadhaarPhotoToDrive(upload, teamName, person.name || "", label, registrationId, teamFolder);
}

function saveAadhaarPhotoAsMetadata(upload, teamName, playerName, label, registrationId) {
  const normalizedType = normalizeAadhaarContentType(
    String(upload.contentType || "").trim().toLowerCase(),
    "",
    String(upload.fileName || "")
  );
  if (!AADHAAR_ALLOWED_TYPES[normalizedType]) throw new Error("UNSUPPORTED_AADHAAR_IMAGE_TYPE");

  const extension = resolveAadhaarFileExtension(normalizedType, upload.fileName);
  const fileName = buildAadhaarPhotoFileName(teamName, playerName, label, registrationId, extension);
  const previewDataUrl = sanitizeAadhaarPreviewDataUrl(upload.previewDataUrl || upload.dataUrl || "");

  return {
    fileId: "",
    fileName: fileName,
    downloadUrl: "",
    previewDataUrl: previewDataUrl
  };
}

function saveAadhaarPhotoToDrive(upload, teamName, playerName, label, registrationId, teamFolder) {
  const dataUrl = String(upload.dataUrl || "").trim();
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("INVALID_AADHAAR_IMAGE");

  const normalizedType = normalizeAadhaarContentType(
    String(upload.contentType || "").trim().toLowerCase(),
    String(match[1] || "").trim().toLowerCase(),
    String(upload.fileName || "")
  );
  if (!AADHAAR_ALLOWED_TYPES[normalizedType]) throw new Error("UNSUPPORTED_AADHAAR_IMAGE_TYPE");

  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > AADHAAR_MAX_BYTES) throw new Error("AADHAAR_IMAGE_TOO_LARGE");

  const extension = resolveAadhaarFileExtension(normalizedType, upload.fileName);
  const fileName = buildAadhaarPhotoFileName(teamName, playerName, label, registrationId, extension);
  const blob = Utilities.newBlob(bytes, normalizedType, fileName);
  const targetFolder = teamFolder || getOrCreateTeamRegistrationFolder(teamName, registrationId);
  const file = targetFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    fileId: file.getId(),
    fileName: file.getName(),
    downloadUrl: "https://drive.google.com/uc?export=download&id=" + encodeURIComponent(file.getId())
  };
}

function getAadhaarPhotoFolder() {
  if (AADHAAR_DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(AADHAAR_DRIVE_FOLDER_ID);
  }
  return DriveApp.getRootFolder();
}

function getOrCreateTeamRegistrationFolder(teamName, registrationId) {
  const rootFolder = getAadhaarPhotoFolder();
  const teamFolderName = buildTeamFolderName(teamName, registrationId);
  const existing = rootFolder.getFoldersByName(teamFolderName);
  if (existing.hasNext()) return existing.next();
  return rootFolder.createFolder(teamFolderName);
}

function resolveAadhaarFileExtension(contentType, fileName) {
  if (contentType === "image/png") return ".png";
  if (/\.png$/i.test(String(fileName || ""))) return ".png";
  return ".jpg";
}

function normalizeAadhaarContentType(primaryType, dataUrlType, fileName) {
  const first = String(primaryType || "").toLowerCase();
  const second = String(dataUrlType || "").toLowerCase();

  if (AADHAAR_ALLOWED_TYPES[first]) {
    return first === "image/jpg" || first === "image/pjpeg" ? "image/jpeg" : first;
  }
  if (AADHAAR_ALLOWED_TYPES[second]) {
    return second === "image/jpg" || second === "image/pjpeg" ? "image/jpeg" : second;
  }

  if (/\.png$/i.test(String(fileName || ""))) return "image/png";
  if (/\.jpe?g$/i.test(String(fileName || ""))) return "image/jpeg";

  return "";
}

function buildAadhaarPhotoFileName(teamName, playerName, label, registrationId, extension) {
  const safePlayer = sanitizeFileNamePart(playerName || "");
  const safeLabel = sanitizeFileNamePart(label || "player");
  const safeId = sanitizeFileNamePart(registrationId || "registration");
  const preferredName = safePlayer !== "file" ? safePlayer : safeLabel;
  return preferredName + "_" + safeLabel + "_" + safeId + extension;
}

function buildTeamFolderName(teamName, registrationId) {
  const safeTeam = sanitizeFileNamePart(teamName || "team");
  const safeId = sanitizeFileNamePart(registrationId || "registration");
  return safeTeam + "_" + safeId;
}

function sanitizeFileNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
}

function sanitizeAadhaarPreviewDataUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^data:image\/(png|jpeg|jpg);base64,/i.test(text)) return "";
  if (text.length > AADHAAR_PREVIEW_MAX_CHARS) return "";
  return text;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
