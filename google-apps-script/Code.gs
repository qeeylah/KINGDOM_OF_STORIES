/**
 * Kingdom of Stories - Google Apps Script Web App (Fasa 2)
 * Fail: Code.gs
 *
 * Cara Penyediaan di Google Apps Script:
 * 1. Buka Google Sheets baharu atau sedia ada -> Extensions -> Apps Script.
 * 2. Salin keseluruhan kod ini ke dalam fail `Code.gs` dan simpan (Ctrl+S).
 * 3. Buka Project Settings (ikon gear) -> Script Properties -> Add script property:
 *    - `APPS_SCRIPT_SECRET_TOKEN` : <Masukkan token rahsia yang panjang dan rawak, sama seperti dalam .env pelayan Express>
 *    - `SPREADSHEET_ID`           : <Pilihan jika skrip bukan container-bound; masukkan ID Google Sheet anda>
 * 4. Klik Deploy -> New deployment -> Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone (supaya pelayan Express dapat menghantar POST JSON server-to-server; keselamatan dikawal oleh secretToken)
 * 5. Salin Web App URL yang dijana ke dalam pemboleh ubah persekitaran pelayan:
 *    `GOOGLE_APPS_SCRIPT_WEBAPP_URL`
 */

var SHEET_SCHEMAS = {
  Data_Murid: {
    primaryKey: 'ID_Murid',
    headers: [
      'ID_Murid',
      'Nama_Pengguna',
      'Nama_Penuh',
      'Kelas',
      'Peranan',
      'Wira_Pilihan',
      'Mod_Pembelajaran',
      'Tahap_Adaptif',
      'Tarikh_Daftar',
      'Log_Masuk_Terakhir',
      'Bilangan_Log_Masuk',
      'Masa_Segerak',
    ],
  },
  Kemajuan_Murid: {
    primaryKey: 'ID_Murid',
    headers: [
      'ID_Murid',
      'Nama_Penuh',
      'Kelas',
      'Status_Pembelajaran_Keseluruhan',
      'Lokasi_Semasa',
      'Misi_1_Status',
      'Misi_2_Status',
      'Misi_3_Status',
      'Misi_4_Status',
      'Misi_5_Status',
      'Bilangan_Misi_Selesai',
      'Peratus_Kemajuan',
      'Festival_Cahaya_Dibuka',
      'Main_Terakhir',
      'Kemas_Kini_Terakhir',
      'Masa_Segerak',
    ],
  },
  Markah_Misi: {
    primaryKey: 'ID_Murid',
    headers: [
      'ID_Murid',
      'Nama_Penuh',
      'Kelas',
      'Misi_1_Markah',
      'Misi_1_Markah_Penuh',
      'Misi_1_Percubaan',
      'Misi_2_Serpihan_Ditemui',
      'Misi_2_Cubaan_Susunan',
      'Misi_3_Skrip_Disunting',
      'Misi_3_Status_AI_Mentor',
      'Misi_3_Bilangan_Isu_AI',
      'Misi_4_Bilangan_Rakaman',
      'Misi_5_Jenis_Penyerahan',
      'Lencana_Dibuka',
      'Jumlah_Lencana',
      'Tahap_Penguasaan_Guru',
      'Ulasan_Guru',
      'Disemak_Oleh',
      'Tarikh_Semakan_Guru',
      'Masa_Segerak',
    ],
  },
  Rekod_Log_Masuk: {
    primaryKey: 'ID_Log',
    headers: [
      'ID_Log',
      'ID_Murid',
      'Nama_Pengguna',
      'Nama_Penuh',
      'Kelas',
      'Peranan',
      'Jenis_Tindakan',
      'Masa_Log_Masuk',
      'Masa_Segerak',
    ],
  },
  Rakaman_Misi4: {
    primaryKey: 'ID_Rujukan_Rekod',
    headers: [
      'ID_Rujukan_Rekod',
      'ID_Murid',
      'Nama_Pengguna',
      'Nama_Penuh',
      'Kelas',
      'ID_Media',
      'Rujukan_Fail_Pelayan',
      'Nama_Fail_Asal',
      'Jenis_MIME',
      'Saiz_Bait',
      'Cubaan_Ke',
      'Tempoh_Saat',
      'Status_Penghantaran',
      'Tahap_Kejelasan',
      'Anggaran_PSM',
      'Ringkasan_Transkripsi',
      'Tarikh_Rakaman',
      'Masa_Segerak',
    ],
  },
  Laporan_Keseluruhan: {
    primaryKey: 'ID_Murid',
    headers: [
      'ID_Murid',
      'Nama_Pengguna',
      'Nama_Penuh',
      'Kelas',
      'Kategori_Penglibatan',
      'Misi_Selesai',
      'Peratus_Pencapaian',
      'Markah_Misi_1',
      'Status_Misi_1',
      'Status_Misi_2',
      'Status_Misi_3',
      'Status_Misi_4',
      'Status_Misi_5',
      'Bilangan_Rakaman_Misi4',
      'Lencana_Dibuka',
      'Penilaian_Guru',
      'Log_Masuk_Terakhir',
      'Masa_Segerak',
    ],
  },
};

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'Kingdom of Stories · Google Sheets Sync Web App',
    timestamp: new Date().toISOString(),
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return jsonResponse({
      ok: false,
      error: 'Pelayan Google Sheets sedang sibuk (LockService timeout). Sila cuba sebentar lagi.',
    });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: 'Tiada muatan JSON diterima.' });
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ ok: false, error: 'Format JSON tidak sah.' });
    }

    var props = PropertiesService.getScriptProperties();
    var expectedToken = props.getProperty('APPS_SCRIPT_SECRET_TOKEN') || '';
    if (!expectedToken) {
      return jsonResponse({
        ok: false,
        error: 'APPS_SCRIPT_SECRET_TOKEN belum ditetapkan dalam Script Properties.',
      });
    }

    var receivedToken = typeof payload.secretToken === 'string' ? payload.secretToken : '';
    if (!constantTimeEqual(receivedToken, expectedToken)) {
      return jsonResponse({
        ok: false,
        error: 'Token rahsia penyegerakan tidak sah.',
      });
    }

    var spreadsheet = resolveSpreadsheet(props);
    if (!spreadsheet) {
      return jsonResponse({
        ok: false,
        error:
          'Google Spreadsheet tidak ditemui. Tetapkan SPREADSHEET_ID dalam Script Properties atau gunakan skrip terikat pada Spreadsheet.',
      });
    }

    var syncedAt = new Date().toISOString();
    var sheetsPayload = payload.sheets || {};
    var summary = {
      totalProcessed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      sheetCounts: {},
    };
    var failedRecords = [];

    var sheetNames = Object.keys(SHEET_SCHEMAS);
    for (var i = 0; i < sheetNames.length; i++) {
      var sheetName = sheetNames[i];
      var schema = SHEET_SCHEMAS[sheetName];
      var rows = Array.isArray(sheetsPayload[sheetName]) ? sheetsPayload[sheetName] : [];
      var sheet = ensureSheetWithHeaders(spreadsheet, sheetName, schema.headers);

      if (rows.length === 0) {
        summary.sheetCounts[sheetName] = { processed: 0, inserted: 0, updated: 0, failed: 0 };
        continue;
      }

      var result = upsertSheetRows(sheet, schema.headers, schema.primaryKey, rows, syncedAt);
      summary.totalProcessed += result.processed;
      summary.inserted += result.inserted;
      summary.updated += result.updated;
      summary.failed += result.failed;
      summary.sheetCounts[sheetName] = {
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        failed: result.failed,
      };
      if (result.errors.length > 0) {
        for (var j = 0; j < result.errors.length; j++) {
          failedRecords.push(result.errors[j]);
        }
      }
    }

    return jsonResponse({
      ok: summary.failed === 0,
      mode: payload.mode || 'full',
      syncedAt: syncedAt,
      summary: summary,
      failedRecords: failedRecords,
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err && err.message ? String(err.message) : 'Ralat dalaman Google Apps Script.',
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // Abaikan jika lock telah dilepaskan
    }
  }
}

function resolveSpreadsheet(props) {
  var configuredId = (props.getProperty('SPREADSHEET_ID') || '').trim();
  if (configuredId) {
    return SpreadsheetApp.openById(configuredId);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheetWithHeaders(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
    return sheet;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needsHeaderUpdate = false;
  for (var i = 0; i < headers.length; i++) {
    if (String(currentHeaders[i] || '').trim() !== headers[i]) {
      needsHeaderUpdate = true;
      break;
    }
  }

  if (needsHeaderUpdate) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function styleHeaderRow(sheet, columnCount) {
  var headerRange = sheet.getRange(1, 1, 1, columnCount);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#162038');
  headerRange.setFontColor('#FAF6EE');
  sheet.setFrozenRows(1);
}

function upsertSheetRows(sheet, headers, primaryKey, rows, syncedAt) {
  var pkIndex = headers.indexOf(primaryKey);
  if (pkIndex === -1) {
    return {
      processed: rows.length,
      inserted: 0,
      updated: 0,
      failed: rows.length,
      errors: [{ sheet: sheet.getName(), error: 'Kunci utama tidak ditemui: ' + primaryKey }],
    };
  }

  var lastRow = sheet.getLastRow();
  var keyToRowIndex = {};
  if (lastRow > 1) {
    var existingKeys = sheet.getRange(2, pkIndex + 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < existingKeys.length; r++) {
      var existingKey = String(existingKeys[r][0] || '').trim();
      if (existingKey) {
        keyToRowIndex[existingKey] = r + 2;
      }
    }
  }

  var rowsToAppend = [];
  var inserted = 0;
  var updated = 0;
  var failed = 0;
  var errors = [];

  for (var i = 0; i < rows.length; i++) {
    var record = rows[i];
    if (!record || typeof record !== 'object') {
      failed++;
      errors.push({ sheet: sheet.getName(), index: i, error: 'Rekod bukan objek sah.' });
      continue;
    }

    var keyVal = String(record[primaryKey] || '').trim();
    if (!keyVal) {
      failed++;
      errors.push({
        sheet: sheet.getName(),
        index: i,
        error: 'Nilai kunci utama kosong (' + primaryKey + ').',
      });
      continue;
    }

    var rowArray = buildRowArray(headers, record, syncedAt);
    var targetRow = keyToRowIndex[keyVal];

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowArray]);
      updated++;
    } else {
      rowsToAppend.push(rowArray);
      // Tandakan kunci dalam peta supaya rekod berulang dalam muatan sama tidak menduplikasi baris
      keyToRowIndex[keyVal] = lastRow + rowsToAppend.length;
      inserted++;
    }
  }

  if (rowsToAppend.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }

  return {
    processed: rows.length,
    inserted: inserted,
    updated: updated,
    failed: failed,
    errors: errors,
  };
}

function buildRowArray(headers, record, syncedAt) {
  var row = [];
  for (var c = 0; c < headers.length; c++) {
    var colName = headers[c];
    if (colName === 'Masa_Segerak') {
      row.push(syncedAt);
    } else {
      var val = record[colName];
      if (val === undefined || val === null) {
        row.push('');
      } else if (typeof val === 'boolean') {
        row.push(val ? 'Ya' : 'Tidak');
      } else {
        row.push(val);
      }
    }
  }
  return row;
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
