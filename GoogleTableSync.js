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
    var rows = sheet.getDataRange().getValues()
    var alreadyUpdated = false

    // get headers
    headers = rows[0];

    var curRowIndex = 1;
    rows.forEach(function (row) {
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

  // READING
  function buildData(headers, item){
    var new_item = {};
    for(var key in item){
      new_item[headers[key]] = item[key]
    }
    return new_item;
  }
  
  function findData(data, rows){
    var item = null;
    for(var indRow in rows){
      var row = rows[indRow]
      // find row by index
      for(var cellInd in row){
        var key = data[options.gaTableSyncLib.index];
        var tableValue = row[cellInd];
        if (tableValue == key) {
          item = row;
          break;
        }
      }
      if(item){
        return buildData(headers, item);
      }
    }
  }
  
  function readData(){
    var rows = sheet.getDataRange().getValues()
    var result = [];
  
    // get headers
    headers = rows[0];
  
    datas.forEach(function (data) {
      var item = findData(data, rows);
      if(item){
        result.push(item)
      }
    })
  
    return result;
  }
  // end READING

  openSheet();
  
  if(options.gaTableSyncLib.isRead){
    return readData()
  }else{
    return syncDatas();
  }
  
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

function sync(syncOptions, reading) {
  checkErrors(syncOptions);
  options.gaTableSyncLib = syncOptions;
  options.gaTableSyncLib.isRead = reading;

  Libs.GoogleApp.run({
    code: GACode, // Function with Google App code
    onRun: syncOptions.onRun, // Optional. This command will be executed after run
    email: syncOptions.email, // Optional. Email for errors,
    debug: syncOptions.debug // For debug. Default is false
  })
}

function read(readOptions){
  sync(readOptions, true)
}

publish({
  sync: sync,
  read: read
})