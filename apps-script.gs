
const SHEET_NAME = 'Data';

// Fungsi utama — simpan data dari GET request
function doGet(e) {
  if (e.parameter.action === 'getWishes') {
    return getWishes();
  }
  return saveData(e);
}

// Tetap support POST juga
function doPost(e) {
  return saveData(e);
}

function getWishes() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const wishes = [];
    
    // Mulai dari index 1 untuk skip header
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] && data[i][4]) { // Pastikan ada nama dan pesan
        wishes.push({
          name: data[i][1],
          text: data[i][4]
        });
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', data: wishes }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveData(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Fallback: gunakan sheet pertama jika nama tidak cocok
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    // Ambil data dari request parameter
    const params     = e.parameter;
    const name       = params.name       || '';
    const attendance = params.attendance || '';
    const guests     = params.guests     || '';
    const message    = params.message    || '';
    const timestamp  = params.timestamp  || new Date().toLocaleString('id-ID');

    // Buat header jika sheet kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['TANGGAL', 'NAMA', 'KEHADIRAN', 'JML TAMU', 'PESAN & DOA']);
      const headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#de8c99ff');
      headerRange.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // Simpan data baru
    sheet.appendRow([timestamp, name, attendance, guests, message]);

    // Auto-resize kolom
    sheet.autoResizeColumns(1, 5);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', name: name }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
