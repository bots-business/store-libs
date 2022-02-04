// this Lib deprecated!
// Use GoogleTableSync Lib!

let libPrefix = "SpreadSheet-Lib-"

function throwError(err){
  throw "Google SpreadSheet Lib: " + err;
}

function setUrlApp(appUrl){
  Bot.sendMessage("This Lib deprecated! Please use GoogleTableSync Lib");

  if(typeof(appUrl)!="string"){
    throwError("Need pass Google App url")
  }

  if(appUrl.indexOf("https://script.google.com/")+1>0){
    return Bot.setProperty(libPrefix + "app-url", appUrl, "string");
  }

  throwError("Seems it is not url for Google App: " + appUrl);
}

function getAppUrl(){
  let result = Bot.getProperty(libPrefix + "app-url");
  if(!result){
    throwError("Need set Google App url before using")
  }
  return result;
}

function checkOptions(options){
  if(!options){ throwError("Need pass options") }
  if(!options.sheetName){ throwError("Need pass sheetName") }
  if(!options.onSuccess){ throwError("Need pass onSuccess command name") }
}

function getCallback(options){
  let onError = " ";
  if(onError){ onError = options.onError }
  
  return libPrefix + "onSuccess " + options.onSuccess + " " + onError;
}

function getErrCallback(options){
  let onError = " ";
  if(onError){ onError = options.onError }

  return libPrefix + "onError " + onError;
}

function getHeader(options){
  let appUrl = getAppUrl();
  checkOptions(options);

  let qrow = ""
  if(options.rowIndex){ qrow = "&rowIndex=" + options.rowIndex }

  HTTP.get({
    url: appUrl + "?sheetName=" + options.sheetName + qrow,
    success: getCallback(options),
    error: getErrCallback(options),
  })
}

function getRow(options){
  getHeader(options);
}

function postRow(options, isEdit){
  let appUrl = getAppUrl();
  checkOptions(options);

  // row: { "User": "Ivan", "Task":"create task", "Desc": "My cool DESC." }
  if(!options.row){ throwError("Need pass table row data") }

  if(isEdit&&(!options.rowIndex)){
    throwError("Need pass rowIndex for editing")
  }

  HTTP.post( {
    url: appUrl,
    success: getCallback(options),
    error: getErrCallback(options),
    body: options
  })
}

function addRow(options){
  postRow(options, false);
}

function editRow(options){
  postRow(options, true)
}

function onSuccess(){
  let callback = params.split(" ")[0];
  let errCalback = params.split(" ")[1];

  var result = content.split("APP-RESULT")[1];

  if(!result){
    // error
    var arr = content.split("width:600px");
    var error = arr[1].split("<")[0]
    return Bot.runCommand(errCalback, {error: error});
  }

  result = decodeURI(result);
  result = JSON.parse(result)
  Bot.runCommand(callback, result);
}

function onError(){
  let errCalback = params;
  Bot.sendMessage("Download error");
  Bot.runCommand(errCalback);
}

publish({
  setUrl: setUrlApp,
  getHeader: getHeader,

  getRow: getRow,
  addRow: addRow,
  editRow: editRow
})

on(libPrefix + "onSuccess", onSuccess );
on(libPrefix + "onError", onError);