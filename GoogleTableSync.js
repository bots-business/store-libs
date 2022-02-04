//lib id - 32520

var libPrefix = "GoogleSheetSync";

function GACode() {
  var datas = options.gaTableSyncLib.datas;

  var data = null;

  var sheet;
  var headers = [];

  var suncResult = { newCount: 0, updatedCount: 0 };

  var already_filled = {}

  function fillOnExistHeaders(headers, rowIndex) {
    already_filled = {}

    var columnIndex = 1

    headers.forEach(function (column) {
      var value = data[column]
      if (value) {
        sheet.getRange(rowIndex, columnIndex).setValue(value)
        already_filled[column] = true
      }
      columnIndex += 1
    })

    return { lastColumn: columnIndex - 1, lastRow: rowIndex }
  }

  function fillOnNewHeaders(coors) {
    if (coors.lastRow == 1) {
      // we have totally new header
      coors.lastRow = 2
    }

    for (var ind in data) {
      if (already_filled[ind]) {
        continue
      }

      var value = data[ind];
      if(!value){
        continue
      }

      // fill Header
      sheet.getRange(1, coors.lastColumn + 1).setValue(ind)

      // fill value
      sheet.getRange(coors.lastRow, coors.lastColumn + 1).setValue(value)
      coors.lastColumn += 1
    }
  }

  function updateData(headers, rowIndex) {
    var filled = {}

    // fill new data on exists headers
    var coors = fillOnExistHeaders(headers, rowIndex)

    // fill new data on new headers
    fillOnNewHeaders(coors)
  }

  function updateExistData() {
    var values = sheet.getDataRange().getValues()

    var isStart = true

    var alreadyUpdated = false

    // get headers

    var curRowIndex = 1
    values.forEach(function (row) {
      // get headers
      if (isStart) {
        isStart = false
        if (row.length != 1 && row[0] != "") {
          headers = row
        }
      }

      // find row by index
      for(var cellInd in row){
        if (row[cellInd] == data[options.gaTableSyncLib.index]) {
          // finded - need update value
          updateData(headers, curRowIndex)
          alreadyUpdated = true
          return
        }
      }

      curRowIndex += 1
    })

    return alreadyUpdated
  }

  function openSheet(){
    var table;
    var tableID = options.gaTableSyncLib.tableID;
    try{
      table = SpreadsheetApp.openById(tableID)
    }catch(e){
      throw new Error(
        "Table with id: " + tableID + " not found. " +
        "Or you need to add permissions. See: https://help.bots.business/libs/googleapp#permissions")
    }

    sheet = table.getSheetByName(options.gaTableSyncLib.sheetName);
    if(!sheet){
      throw new Error("Can not open sheet with name: " + options.gaTableSyncLib.sheetName);
    }
  }

  function syncData() {
    openSheet();

    if (updateExistData()) {
      suncResult.updatedCount += 1
      return
    }

    var lastRowIndex = sheet.getLastRow()
    updateData(headers, lastRowIndex + 1)
    suncResult.newCount += 1
  }

  function syncDatas() {
    datas.forEach(function (it) {
      data = it;
      syncData();
    })

    return suncResult;
  }

  return syncDatas();
  // end GACode
}

function checkErrors(syncOptions) {
  if (!Libs.GoogleApp) {
    throw new Error(libPrefix + ": need install GoogleApp Lib");
  }

  if (!options) {
    options = {}
  }

  if (!syncOptions) {
    throw new Error(libPrefix + ": need pass options");
  }
  if (!syncOptions.tableID) {
    throw new Error(libPrefix + ": need pass options.tableID");
  }
  if (!syncOptions.sheetName) {
    throw new Error(libPrefix + ": need pass options.sheetName");
  }
  if (!syncOptions.datas) {
    throw new Error(libPrefix + ": need pass array options.datas");
  }
}

function sync(syncOptions) {
  checkErrors(syncOptions);
  options.gaTableSyncLib = syncOptions;

  Libs.GoogleApp.run({
    code: GACode, // Function with Google App code
    onRun: syncOptions.onRun, // Optional. This command will be executed after run
    email: syncOptions.email, // Optional. Email for errors,
    debug: syncOptions.debug // For debug. Default is false
  })
}

publish({
  sync: sync
})







syncOptions = {
  tableID: "YOUR Google Table ID",
  sheetName: "Users",
  index: "tgid",
  datas = [],
  onRun: "/onRun",

  // for debug
  email: "hello@bots.business",
  debug: true
}

// save user data to Google Table with balance "100"
syncOptions.datas[0] = {
  tgid: user.tgid,
  balance: 100,
  any_other_key: "any value"

}

Libs.GoogleSheetSync.sync(syncOptions)

// and update balance again for this user
syncOptions.datas[0] = {
  tgid: user.tgid,
  balance: 250
}

Libs.GoogleSheetSync.sync(syncOptions)


