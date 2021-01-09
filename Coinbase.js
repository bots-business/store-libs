let libPrefix = "CoinbaseLib";

let lib = {
  endpoint: "https://api.coinbase.com",
  apiVersion: "/v2/",
  commands: {
    onNotification: libPrefix + "_onNotification",
    onApiCall: libPrefix + "_onApiCall",
    onApiError: libPrefix + "_onApiCallError"
  },
  panelName: libPrefix + "Options"
}

function setupAdminPanel(){
  var webhookUrl = Libs.Webhooks.getUrlFor({
    command: lib.commands.onNotification
  })

  var panel = {
    title: "Coinbase options",
    description: "Options for Coinbase Lib",
    icon: "logo-bitcoin",

    fields: [
      {
        name: "APIKey",
        title: "API Key",
        description: "you can get your API key in https://www.coinbase.com/settings/api",
        type: "password",
        placeholder: "API Key",
        icon: "key"
      },
      {
        name: "SecretAPIKey",
        title: "Secret API Key",
        description: "you can get your Secret API key in https://www.coinbase.com/settings/api",
        type: "password",
        placeholder: "Secret API Key",
        icon: "key"
      },
      {
        name: "WebhookUrl",
        title: "Notifications url. Fill this notifications url on API key creation",
        description: webhookUrl,
        icon: "flash"
      },
      {
        name: "OnNotification",
        title: "Command to be called on notifications",
        description: "this command will be executed on notification",
        type: "string",
        placeholder: "/onCoinbaseNotify",
        icon: "notifications"
      },
    ]
  }
  
  AdminPanel.setPanel({
    panel_name: lib.panelName,
    data: panel,
    force: false // default false - save fields values
  });
}

function sendNoLibMessage(libName){
  Bot.sendMessage("Please install " + libName +
    " from the Store. It is required by CoinbaseLib");
}

function setup(){
  if(!Libs.Webhooks){
    return sendNoLibMessage("Webhook Lib");
  }

  setupAdminPanel();
}

function getOptions(){
  return AdminPanel.getPanelValues(lib.panelName);
}

function timestamp(){
  const now = new Date()  
  return Math.round(now.getTime() / 1000)  
}

function generateSIGN(options){
  // timestamp + method + requestPath + body
  let body = "";
  if(options.body){
    body = JSON.stringify(options.body);
  }

  let sign = options.timestamp + options.method + options.path + body;

  let key = options.secretApiKey || getOptions().SecretAPIKey;
  if(!key){
    throw new Error(libPrefix + 
      ": Please setup secretApiKey https://help.bots.business/libs/coinbase#initial-setup");
  }

  let hmac = CryptoJS.HmacSHA256(sign, key);

  return String(hmac);
}

function getCredentials(options){
  // SEE: https://developers.coinbase.com/docs/wallet/api-key-authentication
  options.timestamp = timestamp();
  var apiKey = options.apiKey || getOptions().APIKey;

  if(!apiKey){
    throw new Error(libPrefix + 
      ": Please setup ApiKey https://help.bots.business/libs/coinbase#initial-setup");
  }

  return {
    "CB-ACCESS-KEY": apiKey,
    "CB-ACCESS-SIGN": generateSIGN(options),
    "CB-ACCESS-TIMESTAMP": options.timestamp,
    "CB-VERSION": "2019-11-15"
  }
}

function withSupportForParams(command){
  if(!command){ return "" }
  // user can pass params here
  return command.split(" ").join("%%");
}

function buildQueryParams(options){
  options.path = lib.apiVersion + options.path;
  let headers = getCredentials(options);

  let url = lib.endpoint + options.path;

  let onSuccess = withSupportForParams(options.onSuccess);
  let onError = withSupportForParams(options.onError);

  return {
    url: url,
    success: lib.commands.onApiCall + " " + onSuccess + " " + onError,
    error: lib.commands.onApiCallError + " " + onError,
    background: options.background, // if you have timeout error
    headers: headers,
    body: options.body
  }
}

function getCorrectedPath(path){
  if(path[0]=="/"){
    path = path.substring(1, path.length)
  }
  if(path[path.length-1]=="/"){
    path = path.substring(0, path.length - 1)
  }

  return path
}

function apiCall(options){
  // options:
  //    method - GET, POST. GET is default
  //    path -  is the full path and query parameters of the URL, e.g.: exchange-rates?currency=USD
  //    body - The body is the request body string. It is omitted if there is no request body (typically for GET requests).
  //    background - perform request in background for more timeout
  //    onSuccess - commnad onSuccess
  //    onError - commnad onError
  //    apiKey - if you need custom Api Key
  //    secretApiKey - if you need custom Api Key
  if(!options.method){
    options.method = "GET" // by default
  }

  options.method = options.method.toUpperCase();

  if(!options.path){
    throw new Error(libPrefix + ": need pass API options.path for Api Call")
  }

  options.path = getCorrectedPath(options.path);

  let reqParams = buildQueryParams(options);

  if(options.method == "GET"){
    return HTTP.get(reqParams)
  }

  if(options.method == "POST"){
    return HTTP.post(reqParams)
  }
}

function getError(code){
  code = parseInt(code);
  var errors = [
    {id: "two_factor_required", code: 402, description: "When sending money over 2fa limit"},
    {id: "param_required", code: 400, description: "Missing parameter"},
    {id: "validation_error", code: 400, description: "Unable to validate POST/PUT"},
    {id: "invalid_request", code: 400, description: "Invalid request"},
    {id: "personal_details_required", code: 400, description: "User’s personal detail required to complete this request"},
    {id: "identity_verification_required", code: 400, description: "Identity verification is required to complete this request"},
    {id: "jumio_verification_required", code: 400, description: "Document verification is required to complete this request"},
    {id: "jumio_face_match_verification_required", code: 400, description: "Document verification including face match is required to complete this request"},
    {id: "unverified_email", code: 400, description: "User has not verified their email"},
    {id: "authentication_error", code: 401, description: "Invalid auth (generic)"},
    {id: "invalid_scope", code: 403, description: "User hasn’t authenticated necessary scope"},
    {id: "not_found", code: 404, description: "Resource not found"},
    {id: "rate_limit_exceeded", code: 429, description: "Rate limit exceeded"},
    {id: "internal_server_error", code: 500, description: "Internal server error"}
  ];

  var err_msg = "";
  var err;
  for(var ind in errors){
    err = errors[ind];
    if(err.code==code){
      err_msg += err.id + ": " + err.description + "; "
    }
  }
  return err_msg;
}

function getCommandFromParam(param){
  if(!param){ return }
  return param.split("%%").join(" ");
}

function getResultOptions(){
  return ( {
    result: JSON.parse(content),
    http_status: http_status
  } )
}

function onApiCall(){
  var cmds = params.split(" ");
  var onSuccess = getCommandFromParam(cmds[0]);
  var onError = getCommandFromParam(cmds[1]);
  
  if(!http_status){ http_status = 0 }
  http_status = parseInt(http_status);

  if((http_status>299)||(http_status<200)){
    var error = libPrefix + " Api error. " + getError(http_status);
    if(!onError){ throw new Error(error) }

    return onApiCallError(onError, error);
  }

  Bot.run({ command: onSuccess, options: getResultOptions() })
}

function onApiCallError(onError, error){
  if(!onError){ onError = params }
  var opts = getResultOptions();
  opts.error = error;
  Bot.run({ command: onError, options: opts })
}

function onNotification(){
  var onNotify = getOptions().OnNotification;
  if(!onNotify){ return }
  Bot.run({ command: onNotify, options: getResultOptions() })
}

publish({
  setup: setup,
  apiCall: apiCall
})


on(lib.commands.onNotification, onNotification)
on(lib.commands.onApiCall, onApiCall)
on(lib.commands.onApiError, onApiCallError)