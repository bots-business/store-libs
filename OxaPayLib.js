// Declare variables for the library prefix and the API URL
let libPrefix = "oxapaylib";
let API_URL = "https://api.oxapay.com/";

// Functions to set and get the merchant key 
function setMerchantKey(key) {
  Bot.setProperty(libPrefix + "merchantkey", key, "string");
}

function getMerchantKey() {
  var merchantKey = Bot.getProperty(libPrefix + "merchantkey");
  if (!merchantKey) { throw new Error("OxaPay lib: no merchantKey. You need to setup it") }

  return merchantKey
}

// Functions to set and get the payment api key 
function setPaymentApiKey(key) {
  Bot.setProperty(libPrefix + "paymentapikey", key, "string");
}

function getPaymentApiKey() {
  var paymentApiKey = Bot.getProperty(libPrefix + "paymentapikey");
  if (!paymentApiKey) { throw new Error("OxaPay lib: no paymentApiKey. You need to setup it") }

  return paymentApiKey
}

// Function to make an API call
function apiCall(options) {

  // Set the headers for the API request
  let headers = {
    "cache-control": "no-cache",
    "Content-type": "application/json",
    "Accept": "application/json",
  }

  // Define parameters for the HTTP request
  params = {
    url: API_URL + options.url,
    body: options.fields,
    headers: headers,

    // Set success and error callback functions for the API call
    success: libPrefix + "onApiResponse " + options.onSuccess,
    error: libPrefix + "onApiResponseError"
  }

  HTTP.post(params)
}

// Function called when an API response is received
function onApiResponse() {

  // Parse the content of the response, which is in JSON format
  let options = JSON.parse(content);

  // Execute the request onSuccess command and pass "options" objects as arguments
  Bot.runCommand(params, options);
}

// Function called when an API request results in an error
function onApiResponseError() {
  throw content
}

function createTransaction(options) {

  // Throw an error if no options are passed or if there are no fields specified in the options
  if (!options) { throw "OxaPayLib: createTransaction need options" }
  if (!options.fields) { throw "OxaPayLib: createTransaction need options.fields" }

  // Get the merchant key from the "getMerchantKey" function and add it to the options object
  let merchantKey = getMerchantKey();
  options.fields.merchant = merchantKey

  // Define the callback URL for the transaction
  let callbackUrl = Libs.Webhooks.getUrlFor({
    command: libPrefix + "onCallback",
    user_id: user.id,
  })

  // Add the callback URL to the fields in the options
  options.fields.callbackUrl = callbackUrl;

  // Set the URL for the API request and the success callback function
  options.url = "merchants/request"
  options.onSuccess = options.onCreatePayment;

  // Make the API call using the "apiCall" function
  apiCall(options);
}

// Function called when a transaction status is updated
function onCallback() {

  // Parse the JSON data contained in the callback content
  let data = JSON.parse(content);

  // If the transaction status is 2
  if (data.status == 2) {
    // Call the "verifyPayment" function with an options object that includes "fields.trackId", using the trackId from the callback data
    verifyPayment({ fields: { trackId: data.trackId } });
  }
}

function verifyPayment(options) {

  // Throw an error if no options are passed or if there are no fields specified in the options or if the trackId field is missing
  if (!options) { throw "OxaPayLib: verifyPayment need options" }
  if (!options.fields) { throw "OxaPayLib: verifyPayment need options.fields" }
  if (!options.fields.trackId) { throw "OxaPayLib: verifyPayment need options.fields.trackId" }

  // Get the merchant key from the "getMerchantKey" function and add it to the options object
  let merchantKey = getMerchantKey();
  options.fields.merchant = merchantKey

  // Set the URL for the API request and the success callback function
  options.url = "merchants/verify"
  options.onSuccess = libPrefix + "onVerifyPayment " + options.fields.trackId;

  // Make the API call using the "apiCall" function
  apiCall(options);
}

// Function called when a payment is successfully verified
function onVerifyPayment() {

  // If the status property of the response object equals 1
  if (options.result == 100 && options.status == 1) {

    // Call the "runCommand" function on the "Bot" object to execute the specified command and pass the "params" and "options" objects as arguments
    Bot.runCommand("/onCompletePayment", options);
  }
}


function transfer(options) {

  // Throw an error if no options are passed or if there are no fields specified in the options
  if (!options) { throw "OxaPayLib: transfer need options" }
  if (!options.fields) { throw "OxaPayLib: transfer need options.fields" }
  if (!options.fields.currency) { throw "OxaPayLib: transfer need options.fields.currency" }
  if (!options.fields.amount) { throw "OxaPayLib: transfer need options.fields.amount" }
  if (!options.fields.address) { throw "OxaPayLib: transfer need options.fields.address" }

  // Get the payment api key from the "getPaymentApiKey" function and add it to the options object
  let key = getPaymentApiKey();
  options.fields.key = key

  // Set the URL for the API request and the success callback function
  options.url = "api/send"
  options.onSuccess = options.onTransfer;

  // Make the API call using the "apiCall" function
  apiCall(options);
}

// Function to get information about a transaction using the trackId
function getTxInfo(options) {

  // Throw an error if no options are passed or if there are no fields specified in the options or if the trackId field is missing
  if (!options) { throw "OxaPayLib: getTxInfo need options" }
  if (!options.fields) { throw "OxaPayLib: getTxInfo need options.fields" }
  if (!options.fields.trackId) { throw "OxaPayLib: getTxInfo need options.fields.trackId" }

  // Get the merchant key from the "getMerchantKey" function and add it to the options object
  let merchantKey = getMerchantKey();
  options.fields.merchant = merchantKey

  // Set the URL for the API request
  options.url = "merchants/inquiry"

  // Make the API call using the "apiCall" function
  apiCall(options);
}

// Function to get a list of accepted coins
function getAcceptedCoins(options) {

  // If no options are passed, set options to an empty object
  if (!options) options = {}

  // Get the merchant key from the "getMerchantKey" function and add it to the options object
  let merchantKey = getMerchantKey();
  if (!options.fields) options.fields = {}
  options.fields.merchant = merchantKey

  // Set the URL for the API request
  options.url = "merchants/allowedCoins"

  // Make the API call using the "apiCall" function
  apiCall(options);
}

// Export functions to be used elsewhere
publish({

  // These lines of code are defining properties for an object, named "setMerchantKey" and "setPaymentApiKey" respectively.
  // These two functions set some sort of API key for a payment processing system.
  // These functions should only be called by admin

  setMerchantKey: setMerchantKey,

  setPaymentApiKey: setPaymentApiKey,

  // This function can call all api
  // It is not clear what this nested "apiCall" object or function does based on this code alone.
  apiCall: apiCall,

  // This function creates a new transaction.
  // This means that when createTransaction is called, it will send order information and register it in the OxaPay system.
  createTransaction: createTransaction,

  // This function send the assets in your wallet balance to another OxaPay account with zero fees.
  transfer: transfer,

  // This function retrieves information about a particular transaction.
  // This means that when getTxInfo is called with a transaction trackId as a parameter,
  // it will inquire about payment and receive a report of a payment session.
  getTxInfo: getTxInfo,

  // This function retrieves the list of all coins that are accepted for payment.
  // This means that when getAcceptedCoins is called, it will get the list of your merchant"s accepted coins.
  getAcceptedCoins: getAcceptedCoins
})

// Set up event listeners for various events
on(libPrefix + "onApiResponse", onApiResponse);
on(libPrefix + "onApiResponseError", onApiResponseError);
on(libPrefix + "onCallback", onCallback);
on(libPrefix + "onVerifyPayment", onVerifyPayment);
