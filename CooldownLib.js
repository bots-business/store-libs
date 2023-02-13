let LIB_PREFIX = "CooldownLib"
let curCooldown;

function loadCurCooldown(name, chat){
  var resLib = Libs.ResourcesLib;
  var name = LIB_PREFIX + "-" + name
  curCooldown = chat ? resLib.anotherChatRes(name, chat.chatid) : resLib.userRes(name);
  return curCooldown;
}

function resetCooldown(){
  var time = curCooldown.growth.info().max;
  curCooldown.set(time);
}

function setupCooldown(time){
  if(curCooldown.growth.isEnabled()){
    if(curCooldown.growth.info().max == time){
      // already setuped
      return
    }
  }

  curCooldown.set(time);

  curCooldown.growth.add({
    value: -1,  // just add negative value
    interval: 1, // -1 once at 1 sec
    min: 0,
    max: time
  });

  return true;
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

function watch(options, chat){
  checkErrors(options);
  loadCurCooldown(options.name, chat);

  if(setupCooldown(options.time)){
    // just started
    if(options.onStarting){
      options.onStarting();
    }

    return
  }

  if(isCooldown()&&(options.onWaiting)){
    options.onWaiting(curCooldown.value());
  }else{
    let result = options.onEnding();
    if(result){
      resetCooldown();
    }
  }
}


// watching
function watchUserCooldown(options){
  watch(options);
}

function watchChatCooldown(options){
  watch(options, chat);
}

function watchCooldown(options){
  watch(options, { chatid: "global" });
}

// getting
function getUserCooldown(name){
  return loadCurCooldown(name);
}

function getChatCooldown(name){
  return loadCurCooldown(name, chat);
}

function getCooldown(name){
  return loadCurCooldown(name, { chatid: "global" });
}

publish({
  user: {
    watch: watchUserCooldown,
    getCooldown: getUserCooldown
  },
  chat: {
    watch: watchChatCooldown,
    getCooldown: getChatCooldown
  },
  watch: watchCooldown,
  getCooldown: getCooldown
})
