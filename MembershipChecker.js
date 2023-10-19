// 24443 - lib id

const LIB_PREFIX = "MembershipChecker_";

function _setupAdminPanel(){
  const panel = {
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
        description: "if the user does not have a membership to ANY chat or channel, this command will be executed",
        type: "string",
        placeholder: "/onNeedJoining",
        icon: "warning"
      },
      {
        name: "onNeedAllJoining",
        title: "onNeedAllJoining command",
        description: "if the user does not have a membership to ALL chats and channels, this command will be executed",
        type: "string",
        placeholder: "/onNeedAllJoining",
        icon: "alert"
      },
      {
        name: "onJoining",
        title: "onJoining command",
        description: "if the user just received a membership for ANY chat or channel this command will be executed",
        type: "string",
        placeholder: "/onJoining",
        icon: "person-add"
      },
      {
        name: "onAllJoining",
        title: "onAllJoining command",
        description: "if the user just received a membership for ALL chats and channels this command will be executed",
        type: "string",
        placeholder: "/onAllJoining",
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
  _setupAdminPanel();
  Bot.sendMessage("MembershipChecker Panel: Setup - OK");
}

function _getLibOptions(){
  return AdminPanel.getPanelValues("MembershipChecker");
}

function _getUserData(){
  let userData = User.getProperty(LIB_PREFIX + "Data");
  if(!userData){ userData = { chats: {} } }
  if(!userData.chats){ userData.chats = {} }
  return userData;
}

function _saveUserData(userData){
  _debugInfo("_saveUserData: " + JSON.stringify(userData));
  User.setProperty(LIB_PREFIX + "Data", userData, "json");
}

function _debugInfo(info){
  if(!_getLibOptions().debug){ return }
  Api.sendMessage({
    text: "<b>MCLDebug</b>" +
    "\n <i>turn off debug in AdminPanel</i> " +
    "\n  <b>message:</b> " + message +
    "\n\n⚡ " + info,
    parse_mode: "HTML"
  })
}

function _msgIncludes(subStr){
  if(!subStr){ return false }
  if(subStr == ""){ return false }

  return message.includes(subStr)
}

function _isInternalCommands(opts){
  if(!message){ return false }

  return (
    _msgIncludes(LIB_PREFIX)||
    _msgIncludes(opts.onJoining)||
    _msgIncludes(opts.onAllJoining)||
    _msgIncludes(opts.onNeedJoining)||
    _msgIncludes(opts.onNeedAllJoining)||
    _msgIncludes(opts.onError)
  )
}

function _isHandleNeeded(){
  if(!user){ return }  // can check only for user

  let opts = _getLibOptions();
  if(!opts.chats){
    throw new Error("MembershipChecker: please install chats for checking in Admin Panel");
  }

  // ignore internal commands
  if(_isInternalCommands(opts)){
    _debugInfo("ignore internal commands in handle()")
    return
  }

  if(completed_commands_count > 0){
    _debugInfo("handle can not be run on sub commands")
    return
  }

  return true;
}

function handle(passed_options){
  if(!_isHandleNeeded()){ return }

  _debugInfo("handle()")

  let lastCheckTime = _getUserData().lastCheckTime;
  const opts = _getLibOptions();
  if(_canRunHandleAgain(lastCheckTime, opts)){
    return check(passed_options, true);
  }

  // check is not needed now
  _debugInfo(
    "Checking is not required since the delay time has not come yet.\nCurrent delay: " +
      String(opts.checkTime) + " min"
  )
}

function _isItSpamCall(lastCheckTime){
  // only 1 check per 2 second for one user
  if(lastCheckTime){
    let duration = Date.now() - lastCheckTime;
    return duration < 2000
  }
  return false
}

function check(passed_options, noNeedOnStillJoined){
  let userData = _getUserData();

  _debugInfo("check() for user Data: " + JSON.stringify(userData));

  if(_isItSpamCall(userData.lastCheckTime)){ return }

  userData.lastCheckTime = Date.now();
  _saveUserData(userData);

  _debugInfo("create task for checking");

  // create task for checking
  Bot.run({
    command: LIB_PREFIX + "checkMemberships",
    options: {
      time: userData.lastCheckTime,                       // current time value for this checking
      needStillJoinedCallback: !noNeedOnStillJoined,      // if true - we need to call still joined callback
      bb_options: passed_options,                         // customized passed options
    },
    // TODO: need decrease this time to 0.01
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
  return _getLibOptions().chats;
}

function getNotJoinedChats(){
  return _getNotJoinedChats().join(", ");
}

function checkMemberships(){
  let chats = _getChatsArr();
  _debugInfo("run checking for " + JSON.stringify(chats));

  for(let ind in chats){
    // several chats
    let chat_id = chats[ind];
    Bot.run({
      command: LIB_PREFIX + "checkMembership " + chat_id,
      options: options,          // passed options
      // TODO: need decrease this time to 0.01
      run_after: 1              // just for run in background
    })
  }
}

// need remove?
function _isJoined(response){
  let status = response.result.status;
  return ["member", "administrator", "creator"].includes(status);
}


function _isSameChatsCheckingTime(chats, needNegative){
  let lastCheckTime = options.bb_options.time;
  if(needNegative){ lastCheckTime = -lastCheckTime }
  const sameTime = Object.values(chats).every(
    value => value === lastCheckTime
  );

  return sameTime;
}

function _needStillJoinedCallback(userData) {
  // we need callback only with check() method not in handle()
  if(!options.bb_options.needStillJoinedCallback){ return false }
  // callback must be installed
  if(!_getLibOptions().onStillJoined){ return false }

  return _isSameChatsCheckingTime(userData.chats);
}

function _runCallback(callbackName, chat_id){
  const opts = _getLibOptions();
  const command = opts[callbackName];

  if(!command){
    _debugInfo("callback is not installed: " + callbackName + ". Chat: " + chat_id +
    "\n\n> " + JSON.stringify(options));
    return false;
  }

  _debugInfo(
    "run callback: " + callbackName + ">" + command + ", for chat: " + chat_id +
    "\n\n> " + JSON.stringify(options)
  );

  Bot.run({
    command: command,
    options: {
      result: options.result,
      bb_options: options.bb_options.passed_options,
      chat_id: chat_id
    }
  })
  return true;
}

function _proccessOldChat(userData){
  // it is still joined chat
  _debugInfo("skip old chat");

  const needCallback = _needStillJoinedCallback(userData);

  if(!needCallback){
    _debugInfo("still joined callback is not needed: " + JSON.stringify(options));
    return true
  }

  return _runCallback("onStillJoined");
}

function handleMembership(chat_id, userData){
  const checkTime = userData.chats[chat_id];
  // we have negative time - it is not joined chat
  const isOld = ( checkTime && checkTime > 0 );

  // we use same time - because need to track still joined callback
  userData.chats[chat_id] = options.bb_options.time;

  // skip old chats
  if(isOld){
    _proccessOldChat(userData)
    _saveUserData(userData);
    return
  }

  // we do not need stillJoinedCallback on new chat
  // set different time for new chat
  userData.chats[chat_id]+= 10;
  _saveUserData(userData);

  let opts = _getLibOptions();
  const needCallback = ( !isOld && opts.onJoining);

  if(!needCallback){
    _debugInfo(
      "on Joining callbacks is not needed: it is old joining in: " + chat_id +
      "\n\n> " + JSON.stringify(userData)
    );
    return
  }

  _runCallback("onJoining", chat_id);

  // is all chats joined?
  if(isMember()){
    return _runCallback("onAllJoining");
  }
}

function _handleNoneMembership(chat_id, userData){
  userData.chats[chat_id] = -options.bb_options.time  // we use negative time for not joined chats
  _saveUserData(userData);
  _runCallback("onNeedJoining", chat_id);

  if(_needToJoinAll(userData.chats)){
    _runCallback("onNeedAllJoining");
  }
}

function onCheckMembership(){
  let chat_id = params.split(" ")[0];

  let userData = _getUserData();
  userData.lastCheckTime = options.bb_options.time;

  _debugInfo("check response: " + JSON.stringify(options) + "\n\n> " + JSON.stringify(userData));

  if(_isJoined(options)){
    _debugInfo("user is (still?) joined to " + chat_id + " chat")
    return handleMembership(chat_id, userData)
  }

  return _handleNoneMembership(chat_id, userData)
}

function onError(){
  _debugInfo("onError for " + params + " >" + JSON.stringify(options))

  let opts = _getLibOptions();
  if(!opts.onError){ return }  // no action
  opts.chat_id = params;
  Bot.run({ command: opts.onError, options: options })
}

function _canRunHandleAgain(curTime){
  if(!curTime){ return false }

  let options = _getLibOptions();
  if(!options.checkTime){
    throw new Error("MembershipChecker: please install checking delay time in Admin Panel");
  }

  let duration = Date.now() - curTime; // in ms
  duration = duration / 1000 / 60; // in minutes

  return duration > parseInt(options.checkTime);
}

function _isActualMembership(chat_id){
  if(!chat_id){ return false }

  let userData = _getUserData()
  return userData.chats[chat_id] > 0
}

function _getNotJoinedChats(){
  let result;
  let notJoined = [];
  const chats = _getChatsArr();

  for(let ind in chats){
    result = _isActualMembership(chats[ind]);
    if(!result){
      notJoined.push(chats[ind])
    }
  }
  return notJoined
}

function _needToJoinAll(chats){
  let result;
  for(let ind in chats){
    result = _isActualMembership(chats[ind]);
    if(result){
      return false;
    }
  }

  // same negative time for all chats
  // we use negative time for not joined chats
  // it will be in the end checking only
  return _isSameChatsCheckingTime(chats, true);
}

function _throwErrorIfNoChats(){
  if(_getLibOptions().chats){ return }

  throw new Error("MembershipChecker: please install chats for checking in Admin Panel");
}

function _getChatsArr(needError){
  let options = _getLibOptions();

  if(!options.chats){ return [] }

  let chats = options.chats.split(" ").join(""); // remove spaces
  chats = chats.split(",");

  if(!chats[0]){ throw new Error(error) }
  return chats
}

// is member of all chats?
function isMember(chat_id){
  if(chat_id){
    return _isActualMembership(chat_id);
  }

  _throwErrorIfNoChats();

  // for all chats
  return ( _getNotJoinedChats().length == 0 )
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
