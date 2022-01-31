// Bots.Business 2020
// Use this code to connect Bots.Business BJS with Google App Script
// https://help.bots.business/libs/googleapp

// BJS data;
var message, chat, bot, params, options, statistics, admins, owner, iteration_quota, payment_plan, completed_commands_count, request, content, http_status, cookies, http_headers, user;

function debug(){ run() }

function run(data){
  var is_debug = false;
  if(!data){
    data = loadData();
    is_debug = true;
  }
  data = JSON.parse(data);
  if(!data){ return }
  setBJSData(data.data);
  
  var result = {};
  
  try {
     result = eval(data.code);
  }catch (e){
    result.error = { name: e.name, message: e.message, stack: e.stack, code: data.code}
    if(is_debug){ sendMail(data, result) }
  }
  
  if(is_debug&&(result=={})){ sendMail(data, result) }
  
  
  result = { result: result, onRun: data.onRun};
  
  callWebhook(result, data);
}

//this is a function that fires when the webapp receives a POST request
function doPost(e){
  var data = e.postData.contents;
  saveData(data);
  
  run(data);
}

function setBJSData(data){  
  message = data.message;
  chat = data.chat;
  bot = data.bot;
  params = data.params;
  options = data.options;
  admins = data.admins;
  owner = data.owner;
  iteration_quota = data.iteration_quota;
  payment_plan = data.payment_plan;
  completed_commands_count = data.completed_commands_count;
  request = data.request;
  content = data.content;
  http_status = data.http_status;
  cookies = data.cookies;
  http_headers = data.http_header;
  user = data.user;
  command = command;
  BB_API_URL = BB_API_URL;
}

function sendMail(data, result){
  if(!data.email){ return }
  MailApp.sendEmail({
    to: data.email,
    subject: "Google App Script Error",
    htmlBody: "<b>code:</b>" +
     "<br>" + JSON.stringify(data.code)  + 
     "<br><br><b>result:</b>" +
     "<br>" + JSON.stringify(result) 
  });
}

function sendWebhookErrorMail(data, result){
  if(!data.email){ return }
  MailApp.sendEmail({
    to: data.email,
    subject: "Google App Script Error",
    htmlBody: "<b>Try call webhook:</b>" +
     "<br>" + data.webhookUrl  + 
     "<br><br><b>result:</b>" +
     "<br>" + JSON.stringify(result) 
  });
}

function saveData(data){
  CacheService.getScriptCache().put("LastData", data); 
}

function loadData(){
  return CacheService.getScriptCache().get("LastData");
}

function doGet(e){
  var html = response.getContentText();
  return HtmlService.createHtmlOutput("<h1>Google App Sync: installed</h1>");
}

function callWebhook(result, data){
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(result)
  };
  
  try{
    UrlFetchApp.fetch(data.webhookUrl, options);
  }catch(e){
     result.error = { name: e.name, message: e.message, stack: e.stack, code: data.code}
     sendWebhookErrorMail(data, result)
  }
}