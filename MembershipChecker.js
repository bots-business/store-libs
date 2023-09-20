// 24443 - lib id

let LIB_PREFIX = "MembershipChecker_";

function setupAdminPanel(){

  let panel = {
    // Panel title
    title: "Membership checker options",
    description: "use these options to check your user channel membership",
    icon: "person-add",

    fields: [
      {
        name: "chats",
        title: "Chats or channels for checking",
        description: "must be separated by commas",
        type: "string",
        placeholder: "@myChannel, @myChat",
        icon: "chatbubbles"
      },
      {
        name: "checkTime",
        title: "checking delay in minutes",
        description: "the bot will check the user membership for all incoming messages once at this time",
        type: "integer",
        placeholder: "10",
        value: 20,
        icon: "time"
      },
      {
        name: "onNeedJoining",
        title: "onNeedJoining command",
        description: "if the user does not have a membership, this command will be executed",
        type: "string",
        placeholder: "/onNeedJoining",
        icon: "alert"
      },
      {
        name: "onJoininig",
        title: "onJoininig command",
        description: "if the user just received a membership this command will be executed",
        type: "string",
        placeholder: "/onJoininig",
        icon: "happy"
      },
      {
        name: "onStillJoined",
        title: "onStillJoined command",
        description: "if the user still have membership this command will be executed. Only with check() method",
        type: "string",
        placeholder: "/onStillJoined",
        icon: "checkmark"
      },
      {
        name: "onError",
        title: "onError command",
        description: "if an error occurs during verification, this command will be executed",
        type: "string",
        placeholder: "/onCheckingError",
        icon: "bug"
      },
      {
        name: "debug",
        title: "debug info",
        description: "turn on for debug info",
        type: "checkbox",
        value: false,
        icon: "hammer"
      }
    ]
  }

  AdminPanel.setPanel({
    panel_name: "MembershipChecker",
    data: panel
  });
}

function setup(){
  setupAdminPanel();
  Bot.sendMessage("MembershipChecker Panel: Setup - OK");
}

function getLibOptions(){
  return AdminPanel.getPanelValues("MembershipChecker");
}

function getUserData(){
  let userData = User.getProperty(LIB_PREFIX + "Data");
  if(!userData){ userData = { chats: {} } }
  if(!userData.chats){ userData.chats = {} }
  return userData;
}

function saveUserData(userData){
  debugInfo("saveUserData: " + JSON.stringify(userData));
  User.setProperty(LIB_PREFIX + "Data", userData, "json");
}

function debugInfo(info){
  if(!getLibOptions().debug){ return }
  Api.sendMessage({
    text: "<b>MCLDebug</b>" +
    "\n <i>turn off debug in AdminPanel</i> " +
    "\n  <b>message:</b> " + message +
    "\n\n⚡ " + info,
    parse_mode: "HTML"
  })
}

function msgIncludes(subStr){
  if(!subStr){ return false }
  if(subStr == ""){ return false }

  return message.includes(subStr)
}

function isInternalCommands(opts){
  if(!message){ return false }

  return (
    msgIncludes(LIB_PREFIX)||
    msgIncludes(opts.onJoininig)||
    msgIncludes(opts.onNeedJoining)||
    msgIncludes(opts.onError)
  )
}

function handle(passed_options){
  if(!user){ return }  // can check only for user

  let opts = getLibOptions();
  if(!opts.chats){
    throw new Error("MembershipChecker: please install chats for checking in Admin Panel");
  }

  // ignore internal commands
  if(isInternalCommands(opts)){
    debugInfo("ignore internal commands in handle()")
    return
  }

  if(completed_commands_count > 0){
    debugInfo("handle can not be run on sub commands")
    return
  }

  debugInfo("handle()")

  let lastCheckTime = getUserData().lastCheckTime;
  if(!canRunHandleAgain(lastCheckTime, opts)){
    // check is not needed now
    debugInfo("Checking is not required since the delay time has not come yet.\nCurrent delay: " +
      String(opts.checkTime) + " min" )
    return
  }

  check(passed_options, true);
}

function check(passed_options, noNeedOnStillJoined){
  let userData = getUserData();

  debugInfo("check() for user Data: " + JSON.stringify(userData));

  // only 1 check per 2 second for one user
  if(userData.sheduledAt){
    let duration = Date.now() - userData.sheduledAt;
    if(duration < 2000){ return }
  }

  userData.sheduledAt = Date.now();
  saveUserData(userData);

  debugInfo("create task for checking");

  // create task for checking
  Bot.run({
    command: LIB_PREFIX + "checkMemberships",
    options: {
      time: Date.now(),                                   // current time value for this checking
      needStillJoinedCallback: !noNeedOnStillJoined,      // if true - we need to call still joined callback
      bb_options: passed_options,                         // customized passed options
    },
    run_after: 1                                          // just for run in background
  })
}

function checkMembership(chat_id){
  if(!chat_id){ chat_id = params }

  Api.getChatMember({
    chat_id: chat_id,
    user_id: user.telegramid,
    on_result: LIB_PREFIX + "onCheckMembership " + chat_id,
    on_error: LIB_PREFIX + "onError " + chat_id,
    bb_options: options    // here we have all options lib + admin passed_options
  })
}

function getChats(){
  let options = getLibOptions();
  if(!options.chats){ return }
  return options.chats
}

function getNotJoinedChats(){
  return _getNotJoinedChats().join(", ")
}

function checkMemberships(){
  let chats = _getChats();
  debugInfo("run checking for " + JSON.stringify(chats));

  for(let ind in chats){
    // several chats
    let chat_id = chats[ind];
    Bot.run({
      command: LIB_PREFIX + "checkMembership " + chat_id,
      options: options,          // passed options
      run_after: 1,              // just for run in background
    })
  }
}

function isJoined(response){
  let status = response.result.status;
  return ["member", "administrator", "creator"].includes(status);
}


function needStillJoinedCallback(userData) {
  // all chats have same time - lastCheckTime
  const lastCheckTime = options.bb_options.time;
  return Object.values(userData.chats).every(
    value => value === lastCheckTime
  );
}

function proccessOldChat(userData){
  // it is still joined chat
  debugInfo("skip old chat");

  let opts = getLibOptions();

  const needCallback = (
    // we need callback only with check() method not in handle()
    options.bb_options.needStillJoinedCallback&&
    // all chats have same time - lastCheckTime
    needStillJoinedCallback(userData)&&
    // callback is installed
    opts.onStillJoined
  );

  if(!needCallback){
    debugInfo("still joined callback is not needed: " + JSON.stringify(options));
    return true
  }

  debugInfo("run still joined callback: " + opts.onStillJoined);

  Bot.run({
    command: opts.onStillJoined,
    options: {
      bb_options: options.bb_options.passed_options
    }
  })

  return true
}

function handleMembership(chat_id, userData){
  const isOld = userData.chats[chat_id];

  // we use same time - because need to track still joined callback
  userData.chats[chat_id] = options.bb_options.time;

  // skip old chats
  if(isOld){
    proccessOldChat(userData)
    saveUserData(userData);
    return
  }

  // we do not need stillJoinedCallback on new chat
  // set different time for new chat
  userData.chats[chat_id]+= 10;
  saveUserData(userData);

  let opts = getLibOptions();
  const needCallback = ( !isOld && opts.onJoininig);

  if(!needCallback){
    debugInfo(
      "onJoininig callback is not needed: it is old joining in: " + chat_id +
      "\n\n> " + JSON.stringify(userData)
    );
    return
  }

  debugInfo("run onJoininig callback: " + opts.onJoininig + " for " + chat_id +
    "\n\n> " + JSON.stringify(userData) + "\n\n> " + JSON.stringify(options)
  );

  Bot.run({
    command: opts.onJoininig,
    options: {
      bb_options: options.bb_options.passed_options
    }
  })
}

function handleNoneMembership(chat_id, userData){
  let opts = getLibOptions();

  userData.chats[chat_id] = false
  saveUserData(userData);

  if(!opts.onNeedJoining){ return }  // no action

  Bot.run({
    command: opts.onNeedJoining,
    options: {
      chat_id: chat_id,
      result: options.result,
      bb_options: options.bb_options.passed_options
    }
  })
}

function onCheckMembership(){
  let chat_id = params.split(" ")[0];

  let userData = getUserData();
  userData.lastCheckTime = options.bb_options.time;

  debugInfo("check response: " + JSON.stringify(options) + "\n\n> " + JSON.stringify(userData));

  if(isJoined(options)){
    debugInfo("user is (still?) joined to " + chat_id + " chat")
    return handleMembership(chat_id, userData)
  }

  return handleNoneMembership(chat_id, userData)
}

function onError(){
  debugInfo("onError for " + params + " >" + JSON.stringify(options))

  let opts = getLibOptions();
  if(!opts.onError){ return }  // no action
  opts.chat_id = params;
  Bot.run({ command: opts.onError, options: options })
}

function canRunHandleAgain(curTime){
  if(!curTime){ return false }

  let options = getLibOptions();
  if(!options.checkTime){
    throw new Error("MembershipChecker: please install checking delay time in Admin Panel");
  }

  let duration = Date.now() - curTime; // in ms
  duration = duration / 1000 / 60; // in minutes

  return duration > parseInt(options.checkTime);
}

function isActualMembership(chat_id){
  if(!chat_id){ return false }

  let userData = getUserData()
  return userData.chats[chat_id]
}

function _getNotJoinedChats(){
  let result;
  let notJoined = [];
  let chats = _getChats();

  for(let ind in chats){
    result = isActualMembership(chats[ind]);
    if(!result){
      notJoined.push(chats[ind])
    }
  }
  return notJoined
}

function _getChats(needError){
  let options = getLibOptions();

  const error = "MembershipChecker: no chats for checking";
  if(!options.chats){
    if(needError){ throw new Error(error) }
  }

  let chats = options.chats.split(" ").join(""); // remove spaces
  chats = chats.split(",");

  if(!chats[0]){ throw new Error(error) }
  return chats
}

function _isChatsMember(){
  _getChats(true)  // with error if no chats
  return ( _getNotJoinedChats().length == 0 )
}

// is member of all chats?
function isMember(chat_id){
  if(chat_id){
    return isActualMembership(chat_id);
  }

  // for all chats
  return _isChatsMember()
}

publish({
  setup: setup,                             // setup admin panel
  check: check,                             // manual checking without time delay
  handle: handle,                           // use on @ command - checking with time delay
  isMember: isMember,                       // is member for all chats?
  getChats: getChats,                       // get all chats for checking
  getNotJoinedChats: getNotJoinedChats      // get not joined chats for this user
})

on(LIB_PREFIX + "checkMemberships", checkMemberships);
on(LIB_PREFIX + "checkMembership", checkMembership);
on(LIB_PREFIX + "onCheckMembership", onCheckMembership);
on(LIB_PREFIX + "onError", onError);
