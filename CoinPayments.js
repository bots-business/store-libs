let libPrefix = "coinpaymentslib";
let API_URL = "https://www.coinpayments.net/api.php";

function cryptHmacSHA512(body, privateKey){
  return String(CryptoJS.HmacSHA512(body, privateKey));
}

function setPrivateKey(key){
  Bot.setProperty(libPrefix + "privatekey", key, "string");
}

function setPublicKey(key){
  Bot.setProperty(libPrefix + "publickey", key, "string");
}

function setBBApiKey(apiKey){
  Bot.setProperty(libPrefix + "bb_api_key", apiKey, "string");
}

function loadKey(){
  var publicKey = Bot.getProperty(libPrefix + "publickey");
  var privateKey = Bot.getProperty(libPrefix + "privatekey");

  if(!publicKey){ throw new Error("CP lib: no publicKey. You need to setup it") }
  if(!privateKey){ throw new Error("CP lib: no privateKey. You need to setup it") }

  return {
    publicKey: publicKey,
    privateKey: privateKey
  }
}

function getQueryParams(json){
  return Object.keys(json).map(function(key) {
      return encodeURIComponent(key) + "=" +
          encodeURIComponent(json[key]);
  }).join("&");
}

function apiCall(options){
  canCallApi();

  let key = loadKey();
  
  let body = "version=1&format=json&key=" + key.publicKey +
    "&" + getQueryParams(options.fields)
  
  let hmac = cryptHmacSHA512(body, key.privateKey);

  let headers = {
    "Content-type": "application/x-www-form-urlencoded",
    "Accept": "application/json",
    "HMAC": hmac
  }

  params = {
    url: API_URL,
    body: body,
    headers: headers,
    success: libPrefix + "onApiResponse " + options.onSuccess,
    // error: callbacks.onError
  }
 
  HTTP.post( params )
}

function canCallApi(){
  // Bug workaround for:
  // Too many errors in the last two minutes from XXX - please fix your code and try again

  let lastErr = Bot.getProperty(libPrefix + "lastError");
  if(!lastErr){ return true }

  let curTime = Date.now();
  if(curTime-lastErr.time > 300000){
    // 5 minutes have passed
    return true;
  }

  throw new Error(
    "CoinPayments Lib: Can not make Api request because you have error in last 5 minutes. " +
    "Please fix error and try again. Last error on message: " + lastErr.message + ". Last error: " + lastErr.error
  )
}

function saveError(json){
  if(json.error=="ok"){ return }

  Bot.setProperty(
    libPrefix + "lastError",
    {
      time: Date.now(),
      error: json.error,
      message: message
    }
  )
}

function onApiResponse(){
  let json = JSON.parse(content);
  saveError(json)
  Bot.runCommand(params, {body: json} );
}

function haveError(options, errCallback){
  let err = options.body.error;

  if(err=="ok"){ return false }

  saveError(options.body);

  if(errCallback){
    Bot.runCommand(errCallback, {result: result, error: err });
  }else{
    Bot.sendMessage("CoinPaymentsLib error:\n\n" + err);
  }
  return true
}

function runCallbackAndGetResult(){
  let arr = params.split(" ");
  let payment_index = arr[0];

  let callback
  let errCallback;

  if(arr[1]){
    callback = arr[1].split("#==#").join(" ");
  }

  if(arr[2]){
    errCallback = arr[2].split("#==#").join(" ");
  }
  
  if(haveError(options, errCallback)){ return }

  let result = options.body.result;

  if(callback&&(callback!="")){
    Bot.runCommand(callback, {result: result, payment_index: payment_index});
  }

  return { body: result, payment_index: payment_index }
}

function onCreateTransaction(){
  let result = runCallbackAndGetResult();

  if(!result){ return }

  let payments = getPayments();
  payments.list[result.payment_index].txn_id = result.body.txn_id;
  User.setProperty(libPrefix + "_payments", payments, "json");
}

function getJsonFromQuery(query){
  if(!query){
    throw new Error("CP lib: no query in getJsonFromQuery. May be it is GET request? Need post!")
  }
  if(typeof(query)!="string"){ throw new Error("CP lib: query must be string") }

  let arr = query.split("&");
  let result = {}

  let floatItems = ["amount1", "amount2", "fee", "status", "amount", "amounti",
     "feei", "confirms", "fiat_amount", "fiat_amounti", "fiat_fee", "fiat_feei" ]

  let item;
  let value;
  for(let i in arr){
    item = arr[i].split("=")
    value = unescape(item[1]);
    if(floatItems.includes(item[0])){
      value = parseFloat(value);
    }
    result[item[0]] = value;
  }

  return result;
}

function getParsedCustom(result){
  // user.id + ":" + payment_index + ":" + options.onPaymentCompleted
  if(!result.custom){
    throw new Error("CP lib: no result.custom in onIPN")
  }

  let arr = result.custom.split(":");
  let user_id = arr[0];
  let payment_index = arr[1];
  let onPaymentCompletedCallback = arr[2].split("#==#").join(" ");

  return { user_id: user_id, payment_index: payment_index,
           onPaymentCompletedCallback: onPaymentCompletedCallback }
}

function callPaymentCompleted(result, callback){
  if(!callback){
    throw new Error("CP lib: onIPN - onPaymentCompleted is undefined")
  }

  Bot.runCommand(callback, result);
}

function acceptPaymentIfNeed(payments, result, opts){
  // accept payment
  let cur_status = payments.list[opts.payment_index].status;
  if(cur_status=="paid"){ return }

  let new_status = parseInt(result.status)

  if(new_status>=100){
    // payment done
    payments.list[opts.payment_index].status="paid"
    User.setProperty(libPrefix + "_payments", payments, "json");

    callPaymentCompleted(result, opts.onPaymentCompletedCallback);
  }
}

function onIPN(){
  let result = getJsonFromQuery(content);
  let opts = getParsedCustom(result);

  if(String(opts.user_id)!=String(user.id)){ return }

  let payments = getPayments();
  
  payments.list[opts.payment_index].status_text = result.status_text
  User.setProperty(libPrefix + "_payments", payments, "json");

  // IPN bot callback
  Bot.runCommand(params, result);

  acceptPaymentIfNeed(payments, result, opts);
}

function callTestPaymentCompleted(options){
  let result = getTestIPNResult(options);
  let opts = getParsedCustom(result);

  callPaymentCompleted(result, opts.onPaymentCompletedCallback);
}

function getTestIPNResult(options){
  return {
    ipn_version :"1.0",
    ipn_id :"230c6ea3eb116716b79914a3b9ee19f4",
    ipn_mode :"hmac",
    merchant :"5418303a5fc165090ee8a9177a3982de",
    ipn_type :"api",
    txn_id :"CPDF3OEBF2FBBABD8WQMBQS368",
    status :"100",
    status_text :"Complete",
    currency1 : ( options.currency1 || "USD" ),
    currency2 : ( options.currency1 || "BTC" ),
    amount1 :  ( options.amount || "0.75" ),
    amount2 :  ( options.amount || "0.29721357" ),
    fee :"0.00148607",
    net :"0.2947275",
    send_tx :"39rCRQWzX4ZxvQJuQYLXELzp2YCbrcnXg6A1xeGcHkgE",
    buyer_name :"CoinPayments API",
    email :"test@example.com",
    custom : user.id + ":5:" + options.onPaymentCompleted,
    received_amount :"0.29721357",
    received_confirms :"4"
  }
}

function getTestIPNContentForPermanentWallet(options){
  let amount = "0.01000000" || options.amount;

  // Generate random txn_id
  let txn_id = "5rRdg9Urrems6V" + parseInt(Math.random(1) * 5000000000) + "pYMQh1dVxcufjfUQYhCP"
  if(options.txn_id){ txn_id = options.txn_id }

  return "ipn_version=1.0&"+
    "ipn_id=aaf82c3063db89b55dd9505b6bd62648&" +
    "ipn_mode=hmac&" +
    "merchant=5418303a5fc165090ee8a9177a3982de&" +
    "ipn_type=deposit&" +
    "address=3P6kW4BEy9vwn3bPCtnDjpzAkJcJj3amExT&" +
    "txn_id=" + txn_id + "&" +
    "label=myLabel&" +
    "status=100&" +
    "status_text=Deposit confirmed&" +
    "currency=WAVES&" +
    "amount=" + amount + "&" +
    "amounti=1000000&" +
    "fee=0.00005000&" +
    "feei=5000&" +
    "confirms=5&" +
    "fiat_coin=USD&" +
    "fiat_amount=0.02365218&" +
    "fiat_amounti=2365218&" +
    "fiat_fee=0.00011826&" +
    "fiat_feei=11826"
}

function onTxInfo(){
  let result = runCallbackAndGetResult();
  
  let payments = getPayments();
  payments.list[result.payment_index].status_text = result.body.status_text;
  
  User.setProperty(libPrefix + "_payments", payments, "json");
}

function getWebhookUrl(command){
  let apiKey = Bot.getProperty(libPrefix + "bb_api_key");
  if(!apiKey){
    throw "BB Api Key is not defined. Need define it with function setBBApiKey."
  }

  let url = "https://" + BB_API_URL + "/v1/bots/" + String(bot.id) + 
      "/new-webhook?api_key=" + apiKey + "&command=" +
      encodeURIComponent(command) +
      "&user_id=" + user.id;

  return url;
}

function getPayments(){
  return User.getProperty(libPrefix + "_payments");
}

function getNewPaymentIndex(){
  let payments = getPayments();
  if(!payments){ payments = { count: 0, list:{} } };

  let payment_index = payments.count + 1;
  
  payments.count = payment_index;
  payments.list[payment_index] = { status: "new" }
  User.setProperty(libPrefix + "_payments", payments, "json");

  return payment_index
}

function getUserCallback(options){
  let userCallback = "";
  if(!options.onSuccess){ options.onSuccess = "" }

  if(options.onSuccess){
    userCallback = options.onSuccess.split(" ").join("#==#");
  }

  if(options.onError){
    userCallback+= options.onError.split(" ").join("#==#");
  }

  return userCallback;
}

function createTransaction(options){
  if(!options){ throw "CoinPaymentsLib: need options" }
  if(!options.fields){ throw "CoinPaymentsLib: need options.fields" }

  if(options.fields.currency){
    options.fields.currency1 = options.fields.currency;
    options.fields.currency2 = options.fields.currency;
  }

  let payment_index = getNewPaymentIndex();
  if(!payment_index){ throw "CoinPaymentsLib: LIB error" }

  options.fields.cmd = "create_transaction";

  if(!options.onIPN){ options.onIPN = "" }
  options.fields.ipn_url = getWebhookUrl(libPrefix + "onIPN " + options.onIPN);

  let userCompletedCallback = ""
  if(options.onPaymentCompleted){
    userCompletedCallback = options.onPaymentCompleted.split(" ").join("#==#");  // bug workaround with params 
  }

  options.fields.custom = user.id + ":" + payment_index + ":" + userCompletedCallback;

  let userCallback = getUserCallback(options);

  options.onSuccess = libPrefix + "onCreateTransaction " + payment_index + " " + userCallback;
  
  apiCall(options);
}

function getTxInfo(options){
  if(!options){ throw "CoinPaymentsLib: need options" }
  if(!options.payment_index){ throw "CoinPaymentsLib: need options.payment_index" }

  let payment_index = options.payment_index;

  let txn_id = getPayments().list[payment_index].txn_id;
  
  apiCall({
    fields: {
     cmd: "get_tx_info",
     txid: txn_id
    },
    onSuccess: libPrefix + "onTxInfo " + payment_index + " " +  options.onSuccess
  })
}

function createPermanentWallet(options){
  if(!options){ throw "CoinPaymentsLib: need options" }
  if(!options.currency){ throw "CoinPaymentsLib: need options.currency" }
  if(!options.user_id){ options.user_id = user.id }

  if(!options.onIPN){ options.onIPN="" }
  if(!options.onIncome){ options.onIncome="" }
  let ipn_url = getWebhookUrl(libPrefix + "onPermanentWalletIPN " + options.onIPN + "%%%" + options.onIncome);

  let userCallback = getUserCallback(options);

  apiCall({
    fields: {
     cmd: "get_callback_address",
     currency: options.currency,
     label: options.label,
     ipn_url: ipn_url
    },
    onSuccess: libPrefix + "onGetCallbackAddress " + userCallback
  })
}

function onGetCallbackAddress(){
  let arr = params.split(" ");
  let callback
  let errCallback;

  if(arr[0]){
    callback = arr[0].split("#==#").join(" ");
  }

  if(arr[1]){
    errCallback = arr[1].split("#==#").join(" ");
  }
  
  if(haveError(options, errCallback)){ return }

  let result = options.body.result;

  if(callback&&(callback!="")){
    Bot.runCommand(callback, {result: result});
  }

  if(!result){ return }
  // TODO - is need stored in prop?
}

function acceptPaymentForPermanentWalletIfNeed(result, incomeCallback){
  // accept payment

  let payments = Bot.getProperty(libPrefix + "_permanentWallets");
  if(!payments){ payments = { list: {} } }

  let item = payments.list[result.txn_id];
  
  if(item&&(item.status == "completed")){
    return
  }

  let new_status = parseInt(result.status)

  if(new_status>=100){
    // payment done
    payments.list[result.txn_id] = { status: "completed" }
    User.setProperty(libPrefix + "_permanentWallets", payments, "json");

    callPaymentCompleted(result, incomeCallback);
  }
}

function onPermanentWalletIPN(){
  let result = getJsonFromQuery(content);

  let arr = params.split("%%%")
  let calbackIPN = arr[0]
  let incomeCallback = arr[1]

  // IPN bot callback
  Bot.runCommand(calbackIPN, result);

  acceptPaymentForPermanentWalletIfNeed(result, incomeCallback);
}

function callTestPermanentWalletIncome(options){
  content = getTestIPNContentForPermanentWallet(options);
  params = (options.onIPN || "") + "%%%" + ( options.onIncome || "")

  onPermanentWalletIPN();
}

publish({
  setPrivateKey: setPrivateKey,
  setPublicKey: setPublicKey,
  setBBApiKey: setBBApiKey,   // API key from Bots.Business
  
  apiCall: apiCall,
  getIpnUrl: getWebhookUrl,

  createTransaction: createTransaction,
  createPermanentWallet: createPermanentWallet,

  getTxInfo: getTxInfo,

  callTestPaymentCompleted: callTestPaymentCompleted,
  callTestPermanentWalletIncome: callTestPermanentWalletIncome
})

on(libPrefix + "onApiResponse", onApiResponse);
on(libPrefix + "onCreateTransaction", onCreateTransaction);
on(libPrefix + "onIPN", onIPN);
on(libPrefix + "onTxInfo", onTxInfo);
on(libPrefix + "onGetCallbackAddress", onGetCallbackAddress);
on(libPrefix + "onPermanentWalletIPN", onPermanentWalletIPN);