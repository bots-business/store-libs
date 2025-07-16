// Declare variables for the library prefix and the API URL
let libPrefix = 'oxapaylibv1';
let API_URL = 'https://api.oxapay.com/v1';

// Functions to set and get the merchant api key 
function setMerchantApiKey(key) {
  Bot.setProperty(libPrefix + 'merchantapikey', key, 'string');
}

function getMerchantApiKey() {
  var merchantApiKey = Bot.getProperty(libPrefix + 'merchantapikey');
  if (!merchantApiKey) { throw new Error('OxaPay Lib V1: no Merchant API Key. You need to setup it') }

  return merchantApiKey
}

// Functions to set and get the payout api key 
function setPayoutApiKey(key) {
  Bot.setProperty(libPrefix + 'payoutapikey', key, 'string');
}

function getPayoutApiKey() {
  var payoutApiKey = Bot.getProperty(libPrefix + 'payoutapikey');
  if (!payoutApiKey) { throw new Error('OxaPay Lib V1: no Payout Api Key. You need to setup it') }

  return payoutApiKey
}

// Functions to set and get the general api key 
function setGeneralApiKey(key) {
  Bot.setProperty(libPrefix + 'generalapikey', key, 'string');
}

function getGeneralApiKey() {
  var generalapikey = Bot.getProperty(libPrefix + 'generalapikey');
  if (!generalapikey) { throw new Error('OxaPay Lib V1: no General Api Key. You need to setup it') }

  return generalapikey
}

// Function to make an API call
function apiCall(options) {
  if (!options) throw 'OxaPay Lib V1: apiCall need options';
  if (!options.url) throw 'OxaPay Lib V1: apiCall need options.url';
  if (!options.fields) options.fields = {};
  if (!options.method) options.method = 'post';

  // Initialize default headers for the API request
  let headers = {
    'cache-control': 'no-cache',
    'Content-type': 'application/json',
    'Accept': 'application/json',
  }

  if (options.url.includes('payment')) {
    // Get the merchant api key from the 'getMerchantApiKey' function and add it to the options object
    let merchantApiKey = getMerchantApiKey();
    headers['merchant_api_key'] = merchantApiKey;
  }
  else if (options.url.includes('payout')) {
    // Get the Payout Api key from the 'getPayoutApiKey' function and add it to the options object
    let payoutApiKey = getPayoutApiKey();
    headers['payout_api_key'] = payoutApiKey;
  }
  else if (options.url.includes('general')) {
    // Get the General Api key from the 'getGeneralApiKey' function and add it to the options object
    let generalApiKey = getGeneralApiKey();
    headers['general_api_key'] = generalApiKey;
  }

  // Define the callback URL for payments (not needed for general)
  if ( options.fields.on_callback && !options.fields.callback_url && !options.url.includes('general')) 
  {
    options.fields.callback_url = Libs.Webhooks.getUrlFor({
      command: libPrefix + 'onCallback ' + options.fields.on_callback,
      user_id: user.id,
    });
  }

  let method = options.method;

  // Define parameters for the HTTP request
  let params = {
    url: API_URL + options.url,
    body: options.fields,
    headers: headers,

    // Set success and error callback functions for the API call
    success: libPrefix + 'onApiResponse ' + options.on_success,
    error: libPrefix + 'onApiResponseError'
  }

  if (method === 'post') {
    HTTP.post(params);
  } else {
    HTTP.get(params);
  }
}

// Function called when an API response is received
function onApiResponse() {

  // Parse the content of the response, which is in JSON format
  let json = JSON.parse(content);

  // Execute the request onSuccess command and pass 'options' objects as arguments
  Bot.runCommand(params, json);
}

// Function called when an API request results in an error
function onApiResponseError() {
  throw content
}

// Function called when a transaction status is updated
function onCallback(e) {
  // Parse the JSON data contained in the callback content
  let data = JSON.parse(content);
  const merchantTypes = ['invoice', 'white_label', 'static_address'];
  const apiSecretKey = merchantTypes.includes(data.type) ? getMerchantApiKey() : getPayoutApiKey();
  const calculatedHmac = CryptoJS.HmacSHA512(content, apiSecretKey).toString(CryptoJS.enc.Hex);
  const receivedHmac = options.headers.Hmac;

  if (calculatedHmac !== receivedHmac) {
    throw 'OxaPay Lib V1: Invalid HMAC signature!';
  }

  Bot.run({ command: params, options: data })
}

// Export functions to be used elsewhere
publish({

  // These lines of code are defining properties for an object, named 'setMerchantApiKey' , 'setPayoutApiKey' and 'setGeneralApiKey' respectively.
  // These two functions set some sort of API key for a payment processing system.
  // These functions should only be called by admin

  setMerchantApiKey: setMerchantApiKey,

  setPayoutApiKey: setPayoutApiKey,

  setGeneralApiKey: setGeneralApiKey,

  // This function can call all api
  // It is not clear what this nested 'apiCall' object or function does based on this code alone.
  apiCall: apiCall,
})

// Set up event listeners for various events
on(libPrefix + 'onApiResponse', onApiResponse);
on(libPrefix + 'onApiResponseError', onApiResponseError);
on(libPrefix + 'onCallback', onCallback);