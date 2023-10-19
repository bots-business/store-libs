var libPrefix = "GoogleAppLib_";

function setUrl(url){
  Bot.setProperty(libPrefix + "AppUrl", url, "string");
}

function getUrl(){
  return Bot.getProperty(libPrefix + "AppUrl");
}

function isWebhookLibInstalled(){
  if(Libs.Webhooks){ return }
  throwError("Please install Webhook Lib. It is required by GoogleApp Lib.")
}

function getWebhookUrl(isDebug){
  var cmd = libPrefix + "onRun";
  if(isDebug){
    Bot.sendMessage("GoogleAppLib: Debug mode - ON");
    cmd = libPrefix + "onDebugRun"
  }
  return Libs.Webhooks.getUrlFor({
    command: cmd,
    user_id: user.id
  })
}

function throwError(title){
  throw new Error("GoogleApp Lib error: " + title);
}

function isOptionsCorrect(options){
  if(!options){
    throwError("on run - need object param")
  }
  if(typeof(options)!="object"){
    throwError("on run - param must be object")
  }
  if(!options.code){
    throwError("on run - need passed code in params")
  }
  if(!options.code.name){
    throwError("on run - code must be function with name")
  }
}

function run(options){
  isWebhookLibInstalled();
  isOptionsCorrect(options)

  var webhookUrl = getWebhookUrl(options.debug);
  var func = options.code;
  var url = getUrl() + "?hl=en";

  if(options.debug){
    Bot.sendMessage(
      "GoogleAppLib: post data to [url](" + url + ")." +
      "\n\nYou can open this link only on incognito mode without Google autorization"
    );
  }

  HTTP.post( {
    url: url,
    // success: "" - no success
    error: libPrefix + "onHttpError",
    body: {
      code: func + ";" + func.name + "()",
      webhookUrl: webhookUrl,
      email: options.email,
      onRun: options.onRun,
      // pass all BJS variables to Google App script
      data: getData()
    },
    folow_redirects: true,
    // headers: { "Content-Type": "text/plain;charset=utf-8" }
  } )
}

function getData(){
  return {
    message: message,
    user: user,
    chat: chat,
    bot: bot,
    params: params,
    options: options,
    admins: admins,
    owner: owner,
    iteration_quota: iteration_quota,
    payment_plan: payment_plan,
    completed_commands_count: completed_commands_count,
    request: request,
    content: content,
    http_status: http_status,
    cookies: cookies,
    http_headers: http_headers,
    command: command,
    BB_API_URL: BB_API_URL
 }
}

function inspectError(json){
  var error = json.error;
  if(!error){ return }

  Bot.sendMessage("Error on Google App script: " +
    inspect(error.name) + "\n\n" + inspect(error.message) );
  Bot.sendMessage("Code: " + inspect(error.code))
  return true
}

function parseContent(){
  if(typeof(content)=="object"){
    return content
  }

  try{
    return JSON.parse(content);
  }catch(e){
    throwError("Error on content parsing: " + content)
  }
}

function doUserOnRun(data){
  if(!data.onRun){ return }
  if(data.onRun==""){ return }
  Bot.run({ command: data.onRun, options: data.result })
}

function onRun(){
  var json = parseContent();
  doUserOnRun(json);
}

function onDebugRun(){
  var json = parseContent();
  if(inspectError(json.result)){ return }
  doUserOnRun(json);
}

function onHttpError(){
  throwError("app error. Please check app url and script installation.")
}

publish({
  setUrl: setUrl,
  run: run
})

on(libPrefix + "onRun", onRun);
on(libPrefix + "onDebugRun", onDebugRun)
on(libPrefix + "onHttpError", onHttpError)
