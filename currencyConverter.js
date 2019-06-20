function storeRate(){
  let json = JSON.parse(content);

  if(json.error){
    Bot.sendMessage("Error: " + json.error);
    return
  }

  let rate, key;
  for (var attr in json){
    rate = json[attr].val;
    key = attr.toUpperCase();
    break;
  }

  let amount;
  
  let prms = params.split(' ');
  // possible passing same user params
  // last param - amount
  let cmd = prms.slice(0, prms.length-1).join(' ');
  for(var attr in prms){ amount = prms[attr] }

  let val = { value: rate, updated_at: Date.now()};
  Bot.setProperty(key, val, 'json');

  let result = calcResult(rate, amount);

  Bot.runCommand(cmd + ' ' + result);
};

function calcResult(rate, amount){
  return String(parseFloat(rate) * parseFloat(amount));
}

function isHaveError(query, onSuccess){
  let example_code = 'Libs.CurrencyConverter.convert("USD_EUR", "onconvert")';
  let err_msg;

  if(typeof(query)!='string'){
    err_msg = 'Need currencies! For example: ' + example_code
  }

  else if(query.split('_').length!=2){
    err_msg = 'Need TWO currencies separated with "_". ! For example: EUR_USD'
  }

  else if(typeof(onSuccess)!='string'){
    err_msg = 'Need handler command! For example: ' + example_code;
  }

  if(err_msg){
    Bot.sendMessage(err_msg);
    return true;
  }

  return false;
}

function getApiUrl(query, onSuccess){
  if(isHaveError(query, onSuccess)){ return }

  return 'http://free.currencyconverterapi.com/api/v5/convert?compact=y&q=' + query + 
    "&apiKey=9e878aebb95bf44aba20"
}

publish({
  getApiUrl: getApiUrl,

  convert: function(query, amount, onSuccess){
    if(isHaveError(query, onSuccess)){ return }

    var now = Date.now();
    
    var rate = Bot.getProperty(query.toUpperCase());

    if(rate){
      var minutes = ( now - rate.updated_at ) / 60000;
      if(minutes<30){
        let result = calcResult(rate.value, amount);
        Bot.runCommand(onSuccess + ' ' + result);
        return
      }
    }
    let url = getApiUrl(query, onSuccess);

    HTTP.get( { url: url, success:'_lib_on_http_success ' + onSuccess + ' ' + amount } )
  }
})

on('_lib_on_http_success', storeRate );


