function developmentOnlyEraseAllData() {
  const sheetPendaftaran = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET);
  if (!sheetPendaftaran) throw new Error('Sheet "' + NAMA_SHEET + '" tidak ditemukan.');
  const jumlahBarisData = sheetPendaftaran.getLastRow() - 1;
  if (jumlahBarisData > 0) sheetPendaftaran.getRange(2, 1, jumlahBarisData, HEADERS.length).clearContent();
  return "PERINGATAN: " + Math.max(0, jumlahBarisData) + " baris dihapus permanen.";
}
