let LIB_PREFIX = "CooldownLib"
let curCooldown;

function loadCurCooldown(name, isUser){
  var resLib = Libs.ResourcesLib;
  var name = LIB_PREFIX + "-" + name
  curCooldown = isUser ? resLib.userRes(name) : resLib.chatRes(name);
  return curCooldown;
}

function resetCooldown(){
  var time = curCooldown.growth.info().max;
  curCooldown.set(time);
}

function setupCooldown(time){
  if(curCooldown.growth.isEnabled()){
     // already setupped
     return
  }
  
  curCooldown.set(time);

  curCooldown.growth.add({
    value: -1,  // just add negative value
    interval: 1, // -1 once at 1 sec
    min: 0,
    max: time
  });
}

function isCooldown(){
  return curCooldown.value() > 0;
}

function require(name, value){
  if(!value){
    throw new Error(LIB_PREFIX + ": need param " + name)
  }
}

function checkOptions(options){
  require("name", options.name);
  require("time", options.time);
  require("onEnding", options.onEnding);
}

function checkErrors(options){
  if(!Libs.ResourcesLib){
    throw new Error("Cooldown Lib: Please install ResourcesLib")
  }

  checkOptions(options);
}

function watch(options, isUser){
  checkErrors(options);
  loadCurCooldown(options.name, isUser);

  setupCooldown(options.time);
  if(isCooldown()){
    options.onWaiting(curCooldown.value());
  }else{
    let result = options.onEnding();
    if(result){
      resetCooldown();
    }
  }
}

function watchUserCooldown(options){
  watch(options, true);
}

function watchChatCooldown(options){
  watch(options, false);
}

function getUserCooldown(name){
  return loadCurCooldown(name, true);
}

function getChatCooldown(name){
  return loadCurCooldown(name, false);
}

publish({
  user: {
    watch: watchUserCooldown,
    getCooldown: getUserCooldown
  },
  chat: {
    watch: watchChatCooldown,
    getCooldown: getChatCooldown
  }
})