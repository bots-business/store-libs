let libPrefix = 'LibQiwiPayment_';

function getPaymentLink(options = {}){
  return 'https://qiwi.com/payment/form/99?' + 
    'extra%5B%27account%27%5D='+ options.account +
    '&amountInteger=' + options.amount +
    '&extra%5B%27comment%27%5D=' + options.comment +
    '&currency=643'+
    '&blocked[0]=account&blocked[1]=comment'
}

function setQiwiApiTokent(token){
  Bot.setProperty(libPrefix + 'ApiToken', token, 'string');
}

function accept(item){
  if(item.status!='SUCCESS'){ return false }
  if(item.type!='IN'){ return false }
  let accepted_payments = Bot.getProperty(libPrefix + 'accepted_payments');
  if(!accepted_payments){ accepted_payments = {} }

  if(accepted_payments[item.txnId]==true){
    /* already accepted */
    return false;
  }

  accepted_payments[item.txnId]=true

  Bot.setProperty(libPrefix + 'accepted_payments', accepted_payments, 'json');
  return true;
}

function onAcceptPayment(){
  if(http_status=='401'){
    Bot.sendMessage('Please verify API token');
    return
  }
  let history = JSON.parse(content).data;
  let prms = params.split(' ');
  let comment = prms[0];
  let onSuccess = prms[1];
  let onNoPaymentYet = prms[2];

  let payment;
  for(it in history){
    if(history[it].comment==comment){
      payment = history[it];
      if(accept(payment)){
        Bot.runCommand(onSuccess + ' ' + String(payment.sum.amount));
        return
      }
    }
  }

  Bot.runCommand(onNoPaymentYet);
}

function acceptPayment(options){
  let apiToken = Bot.getProperty(libPrefix + 'ApiToken');

  let headers = { 'Authorization': 'Bearer ' + apiToken,
                  'Content-type': 'application/json',
                  'Accept': 'application/json'
  }

  let url = 'https://edge.qiwi.com/payment-history/v2/persons/' + 
            options.account + '/payments?'+ 
            'rows=50&operation=IN'

  HTTP.get( {
    url: url,
    success: libPrefix + 'onAcceptPayment ' + 
              options.comment + ' '  +  options.onSuccess + 
              ' ' + options.onNoPaymentYet,
    error: options.onError,
    headers: headers
  } )
}



publish({
  getPaymentLink: getPaymentLink,
  setQiwiApiTokent: setQiwiApiTokent,
  acceptPayment: acceptPayment
})

on(libPrefix + 'onAcceptPayment', onAcceptPayment );