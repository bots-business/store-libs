let API_URL = 'https://block.io/api/v2/';
let libPrefix = 'libblockio_'

function getCredential(options, prms){
  let apiKey = ( prms.api_key ? prms.api_key : 
    Bot.getProperty( libPrefix + options.coin.toLowerCase() + 'apikey')
  );
  
  let pin = '';
  if(options.method.indexOf('withdraw') + 1) {

    pin = (prms.pin ? prms.pin :
      Bot.getProperty( libPrefix + 'secretpin')
    )

    if(pin!=''){ pin = '&pin=' + pin }
  }
  return 'api_key=' + apiKey + pin;
}

function apiGet(options = {}, prms){
  if(!verifyCallback(prms)){ return }

  let callbacks = getCallbacks(prms, 'on_' + options.method);
  let credential = getCredential(options, prms);

  let url = API_URL + options.method + '?' + credential + 
    '&' + options.query;
  
  HTTP.get( {
    url: url,
    success: callbacks.onSuccess,
    error: callbacks.onError
  } )
}

function onApiResponse(){
  let json
  try{
    json = JSON.parse(content);
  }catch(err){
    throw 'Error with downloaded JSON content: ' + content
  }

  let arr = params.split(' ');
  if(json.status=='success'){
    let user_callback_cmd = arr[1];
    Bot.runCommand(user_callback_cmd, json.data);
  }else{
    let user_callback_err_cmd = arr[arr.length-1];
    Bot.runCommand(user_callback_err_cmd, json);
  }
}

function onApiError(){
  let json;
  let user_callback_cmd = params.split(' ')[0];

  if(content){
    json = JSON.parse(content);

    if(json.status=='fail'){
      Bot.runCommand(
        user_callback_cmd + ' ' + json.data.error_message
      );
      return
    }
  }else

  Bot.runCommand(user_callback_cmd);
}

function verifyCallback(prms){
  if(typeof(prms.onSuccess)!='string'){
    throw 'Need handler callback command';
  }
  return true
}

function getCallbacks(prms, successKey){
  return { 
    onSuccess: (libPrefix + 'callback ' + successKey +
        ' ' + prms.onSuccess + ' ' + prms.onError),
    onError: (libPrefix + 'callback ' + 'on_api_error ' + prms.onError)
  }
}

function snakeToCamel(string) {
  return string.replace(/(_\w)/g, function(m){
      return m[1].toUpperCase();
  });
}

function doApiGetFor(coin, method, prms){
  let query = '';
  let i = 0;
  let keys = Object.keys(prms);
  for(let ind in prms){
    query+= keys[i] + '=' + prms[ind] + '&' 
    i+=1;
  }

  apiGet( { method: method, coin: coin, query: query}, prms);
}

function getApiFunctions(coin, funcs_names){
  let result = {};
  let funcName;
  
  for(let ind in funcs_names){
    funcName = snakeToCamel(funcs_names[ind]);
    result[funcName] = function(prms){ doApiGetFor(coin, funcs_names[ind], prms) }
  }
  return result;
}

function getMethodsForCoin(coin){
  let result = getApiFunctions(coin, [
    'get_new_address',
    'get_balance',  
    'get_address_balance',
    'get_my_addresses',
    'get_address_by_label',
    'is_valid_address',
    'is_green_transaction',
    'archive_addresses',
    'unarchive_addresses',
    'get_my_archived_addresses',
    'get_transactions',
    'get_raw_transaction',
    'get_network_fee_estimate',
    'get_current_price',
    'withdraw',
    'withdraw_from_addresses',
    'withdraw_from_labels'
  ]);

  result['setApiKey'] = function(apiKey){
      Bot.setProperty( libPrefix + coin.toLowerCase() + 'apikey', apiKey, 'string');
      return coin;
  }

  return result;
}

let setSecretPin = function(pin){
  Bot.setProperty( libPrefix + 'secretpin', pin, 'string');
}

publish({
  setSecretPin: setSecretPin,
  testNet: {
    Bitcoin: getMethodsForCoin('TestNetBitcoin'),
    Litecoin: getMethodsForCoin('TestNetLitecoin'),
    Dogecoin: getMethodsForCoin('TestNetDogecoin'),
  },
  Bitcoin: getMethodsForCoin('Bitcoin'),
  Litecoin: getMethodsForCoin('Litecoin'),
  Dogecoin: getMethodsForCoin('Dogecoin'),
})

on(libPrefix + 'callback', onApiResponse);