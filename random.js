function verifyMinAndMax(min, max){
  if(!min||!max){
    Bot.sendMessage('Need pass min and max for random value');
    return
  }
  if((typeof(min)!='number')||(typeof(max)!='number')){
    Bot.sendMessage('Min and max must be Number type');
    return
  }
  if(min>max){
    Bot.sendMessage('Max must be creater then min');
    return
  }
  return true;
}

function rndFloat(min, max){
  if(!verifyMinAndMax(min, max)){ return }
  return (Math.random() * (max - min + 1)) + min
}

function rndInt(min, max){
  if(!verifyMinAndMax(min, max)){ return }
  return Math.floor(rndFloat(min, max))
}

function rndString(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function rndMessage(message){
  var err_msg = 'need pass messages array. E.g: [\"Hello\", \"Hi!\"]';
  if(!messages){
    Bot.sendMessage(err_msg); 
  }
  if(!messages.length || messages.length==0){     
    Bot.sendMessage(err_msg);
  }

  let random_int = rndInt(0, messages.length-1);

  Bot.sendMessage(messages[random_int]);
  }
  
publish({ 
  sendMessage: rndMessage,
  randomInt: rndInt,
  randomString: rndString,
  randomFloat: rndFloat
})
