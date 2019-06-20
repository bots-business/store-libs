let libPrefix = 'LibAMO_CRM_'

let setUserLogin = function(login){
  Bot.setProperty( libPrefix + 'userLogin', login, 'string');
}

let setApiKey = function(hash){
  Bot.setProperty( libPrefix + 'apiKey', hash, 'string');
}

let setSubDomain = function(subDomain){
  Bot.setProperty( libPrefix + 'subDomain', subDomain, 'string');
}

let loadOptions = function(){
  return {
    user: { 
      USER_LOGIN: Bot.getProperty( libPrefix + 'userLogin'),
      USER_HASH: Bot.getProperty( libPrefix + 'apiKey' )
    },
    subDomain: Bot.getProperty( libPrefix + 'subDomain')
  }
}

let loadCRMCredentials = function(){
  // need cookie loading...
  let credentials = loadOptions();
  credentials.cookies = Bot.getProperty( libPrefix + 'cookies');

  return credentials;
}

function verifyCallback(prms){
  if(typeof(prms.onSuccess)!='string'){
    throw 'Need handler callback command';
  }
  return true
}

function apiCallAs(apiMethod, options){
 // if(!verifyCallback(prms)){ return }

  let credentials = loadCRMCredentials();

  let url = 'https://' + credentials.subDomain + '.amocrm.ru/api/v2/' + 
      options.method;
  

  let body = options.params;
  if(!body){ body = "" }

  params = {
    url: url,
    body: body,
    cookies: credentials.cookies,
    success: libPrefix + 'onApiResponse ' + options.onSuccess,
    // error: callbacks.onError
  }

  if(apiMethod=="get"){ return HTTP.get( params ) }
  HTTP.post( params )
}

function apiGet(options = {}){
  apiCallAs("get", options)
}

function apiPost(options = {}){
  apiCallAs("post", options)
}


function onApiResponse(){
  let json = JSON.parse(content);
  Bot.runCommand(params, {body: json} );
}


function auth(){
  let options = loadOptions();

  let url = 'https://' + options.subDomain + '.amocrm.ru/private/api/auth.php?type=json'

  HTTP.post( {
    url: url,
    body: options.user,
    success: libPrefix + "SaveCookies",
    // error: callbacks.onError
  } )

}

function onSaveCookies(){
  let json = JSON.parse(content);

  if(json.response.auth){
    Bot.setProperty( libPrefix + 'cookies', cookies, 'text');
  }else{
    Bot.sendMessage( "Error with autorization to AmoCRM. Invalid credentials?" );
  }
}

publish({
  setUserLogin: setUserLogin,
  setApiKey: setApiKey,
  setSubDomain: setSubDomain,
  auth: auth,

  apiGet: apiGet,
  apiPost: apiPost
})

on(libPrefix + "SaveCookies", onSaveCookies);

on(libPrefix + 'onApiResponse', onApiResponse);