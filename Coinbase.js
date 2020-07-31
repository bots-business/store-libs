let libPrefix = "CoinbaseLib";

let lib = {
  endpoint: "https://api.coinbase.com",
  apiVersion: "/v2/",
  commands: {
    onNotification: libPrefix + "_onNotification",
    onApiCall: libPrefix + "_onApiCall",
    onApiError: libPrefix + "_onApiCallError"
  },
  panelName: libPrefix + 'Options'
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
      }
    ]
  }
  
  AdminPanel.setPanel({
    panel_name: lib.panelName,
    data: panel,
    force: true // default false - save fields values
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

  if(!Libs.CryptoJS){
    return sendNoLibMessage("CryptoJS Lib");
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
  if(options.body){ body = options.body }
  let sign = options.timestamp + options.method + options.path + body;
  let key = options.secretApiKey || getOptions().SecretAPIKey;
  let hmac = CryptoJS.HmacSHA256(sign, key);

  return String(hmac);
}

function getCredentials(options){
  // SEE: https://developers.coinbase.com/docs/wallet/api-key-authentication
  options.timestamp = timestamp();
  return {
    "CB-ACCESS-KEY": options.apiKey || getOptions().APIKey,
    "CB-ACCESS-SIGN": generateSIGN(options),
    "CB-ACCESS-TIMESTAMP": options.timestamp
  }
}

function buildQueryParams(options){
  options.path = lib.apiVersion + options.path;
  let headers = getCredentials(options);

  url = lib.endpoint + options.path;

  return {
    url: url,
    success: lib.commands.onApiCall + " " + options.onSuccess,
    error: lib.commands.onApiCallError + " " + options.onError,
    background: options.background, // if you have timeout error
    headers: headers,
    body: options.body
  }
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
    throw new Error("Coinbase Lib: need pass API options.path for Api Call")
  }

  let reqParams = buildQueryParams(options);

  if(options.method == "GET"){
    return HTTP.get(reqParams)
  }

  if(options.method == "POST"){
    return HTTP.post(reqParams)
  }
}

function onApiCall(){
  let cmd = params;
  Bot.run({ command: cmd, options: { content: content } })
}

function onApiCallError(){
  let cmd = params;
  Bot.run({ command: cmd, options: { content: content } })
}

function onNotification(){
  // TODO
}

publish({
  setup: setup,
  apiCall: apiCall
})


on(lib.commands.onNotification, onNotification)
on(lib.commands.onApiCall, onApiCall)
on(lib.commands.onApiCallError, onApiCallError)