function setupSpreadsheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPendaftaran = spreadsheet.getSheetByName(NAMA_SHEET);
  if (!sheetPendaftaran) throw new Error('Sheet "' + NAMA_SHEET + '" tidak ditemukan.');

  sheetPendaftaran.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheetPendaftaran.setFrozenRows(1);
  sheetPendaftaran.setHiddenGridlines(false);
  sheetPendaftaran.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#1B3A22")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sheetPendaftaran.setRowHeight(1, 42);

  [165, 220, 150, 85, 65, 280, 150, 85, 260, 145, 320].forEach(function (lebar, index) {
    sheetPendaftaran.setColumnWidth(index + 1, lebar);
  });

  const jumlahBaris = Math.max(sheetPendaftaran.getMaxRows() - 1, 1);
  const rangeData = sheetPendaftaran.getRange(2, 1, jumlahBaris, HEADERS.length);
  rangeData.setVerticalAlignment("middle").setFontColor("#202124");
  sheetPendaftaran.getRange(2, 1, jumlahBaris).setNumberFormat("dd/mm/yyyy hh:mm");
  sheetPendaftaran.getRange(2, 2, jumlahBaris).setWrap(true);
  sheetPendaftaran.getRange(2, 3, jumlahBaris).setNumberFormat("@");
  sheetPendaftaran.getRange(2, 4, jumlahBaris).setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 5, jumlahBaris).setNumberFormat("000").setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 6, jumlahBaris).setWrap(true);
  sheetPendaftaran.getRange(2, 7, jumlahBaris).setNumberFormat("dd/mm/yyyy").setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 8, jumlahBaris).setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 9, jumlahBaris).setNumberFormat("@").setFontWeight("bold").setFontColor("#1B5E20").setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 10, jumlahBaris).setHorizontalAlignment("center");
  sheetPendaftaran.getRange(2, 11, jumlahBaris).setWrap(true);

  sheetPendaftaran.getRange(2, 3, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(C2="",REGEXMATCH(TO_TEXT(C2),"^(\\+62|62|0)8[1-9][0-9]{6,11}$"))').setAllowInvalid(false).setHelpText("Gunakan nomor 08, 628, atau +628.").build());
  sheetPendaftaran.getRange(2, 4, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(DUSUN_VALID, true).setAllowInvalid(false).setHelpText("Pilih Dusun dari daftar.").build());
  sheetPendaftaran.getRange(2, 5, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(E2="",REGEXMATCH(E2&"","^[0-9]{1,3}$"))').setAllowInvalid(false).setHelpText("RT harus 1 sampai 3 digit.").build());
  sheetPendaftaran.getRange(2, 6, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LAYANAN_VALID, true).setAllowInvalid(false).setHelpText("Pilih jenis layanan.").build());
  sheetPendaftaran.getRange(2, 7, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(G2="",AND(ISNUMBER(G2),WEEKDAY(G2,2)<6))').setAllowInvalid(false).setHelpText("Pilih Senin sampai Jumat.").build());
  sheetPendaftaran.getRange(2, 8, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(JALUR_VALID, true).setAllowInvalid(false).setHelpText("Pilih Online atau Offline.").build());
  sheetPendaftaran.getRange(2, 9, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=OR(I2="",REGEXMATCH(TO_TEXT(I2),"^JTM-[0-9]{8}-[A-Z0-9]{4}$"))').setAllowInvalid(false).setHelpText("Format kode tracking tidak valid.").build());
  sheetPendaftaran.getRange(2, 10, jumlahBaris).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS_VALID, true).setAllowInvalid(false).setHelpText("Pilih status pelayanan.").build());

  const filterLama = sheetPendaftaran.getFilter();
  if (filterLama) filterLama.remove();
  sheetPendaftaran.getRange(1, 1, sheetPendaftaran.getMaxRows(), HEADERS.length).createFilter();

  const rangeStatus = sheetPendaftaran.getRange(2, 10, jumlahBaris);
  sheetPendaftaran.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Diproses").setBackground("#FFF4CC").setFontColor("#6B4F00").setBold(true).setRanges([rangeStatus]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Siap Diambil").setBackground("#D9EAF7").setFontColor("#0B4F71").setBold(true).setRanges([rangeStatus]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Selesai").setBackground("#DDEFE2").setFontColor("#1B5E20").setBold(true).setRanges([rangeStatus]).build()
  ]);

  let sheetRingkasan = spreadsheet.getSheetByName("Ringkasan");
  if (!sheetRingkasan) sheetRingkasan = spreadsheet.insertSheet("Ringkasan");
  sheetRingkasan.clear();
  sheetRingkasan.setHiddenGridlines(true).setFrozenRows(2);
  sheetRingkasan.getRange("A1:E1").merge().setValue("Ringkasan Pelayanan Desa Jatimulyo")
    .setFontSize(16).setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#1B3A22")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheetRingkasan.setRowHeight(1, 44);
  sheetRingkasan.getRange("A3:B10").setValues([
    ["Indikator", "Jumlah"], ["Total Pendaftaran", "=COUNTA(Pendaftaran!I2:I)"],
    ["Sedang Diproses", '=COUNTIF(Pendaftaran!J2:J,"Diproses")'], ["Siap Diambil", '=COUNTIF(Pendaftaran!J2:J,"Siap Diambil")'],
    ["Selesai", '=COUNTIF(Pendaftaran!J2:J,"Selesai")'], ["Pendaftaran Online", '=COUNTIF(Pendaftaran!H2:H,"Online")'],
    ["Pendaftaran Offline", '=COUNTIF(Pendaftaran!H2:H,"Offline")'], ["Kedatangan Hari Ini", "=COUNTIF(Pendaftaran!G2:G,TODAY())"]
  ]);
  sheetRingkasan.getRange(3, 4, LAYANAN_VALID.length + 1, 2).setValues(
    [["Jenis Layanan", "Jumlah"]].concat(LAYANAN_VALID.map(function (layanan) {
      return [layanan, '=COUNTIF(Pendaftaran!F:F,"' + layanan.replace(/"/g, '""') + '")'];
    }))
  );
  sheetRingkasan.getRange("A3:B3").setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#315C3A");
  sheetRingkasan.getRange("D3:E3").setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#315C3A");
  sheetRingkasan.getRange("B4:B10").setFontWeight("bold").setFontSize(13).setFontColor("#1B5E20").setHorizontalAlignment("center");
  sheetRingkasan.getRange(4, 5, LAYANAN_VALID.length).setFontWeight("bold").setHorizontalAlignment("center");
  [220, 100, 30, 300, 100].forEach(function (lebar, index) { sheetRingkasan.setColumnWidth(index + 1, lebar); });
  sheetRingkasan.getRange("A3:B10").applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);
  sheetRingkasan.getRange(3, 4, LAYANAN_VALID.length + 1, 2).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false);

  return "Spreadsheet siap digunakan.";
}

