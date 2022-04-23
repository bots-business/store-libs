let LIB_PREFIX = 'MembershipChecker_';

function setupAdminPanel(){

  var panel = {
    // Panel title
    title: "Membership checker options",
    description: "use these options to check your user’s channel membership",
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
        description: "the bot will check the user's membership for all incoming messages once at this time",
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

function setup(options){
  setupAdminPanel();

  Bot.sendMessage("Setup: OK");
}

function getLibOptions(){
  return AdminPanel.getPanelValues("MembershipChecker");
}

function getUserData(){
  var data = User.getProperty(LIB_PREFIX + "Data");
  if(!data){ data = {} }
  return data;
}

function saveUserData(data){
  User.setProperty(LIB_PREFIX + "Data", data, "json");
}

function debugInfo(msg){
  if(!getLibOptions().debug){ return }
  Bot.sendMessage(
    LIB_PREFIX + " Debug: " + 
    "\n  message: " + message +
    "\n" + msg
  )
}

function handleAll(){
  if(!user){ return }  // can check only for user

  if(message&&(message.indexOf(LIB_PREFIX) + 1)){
    return // do not handle internal Lib's commands
  }

  var opts = getLibOptions();
  if(!opts.chats){ return }

  if(isFreshTime(getUserData().lastCheckTime, opts)){
    // check is not needed now
    debugInfo("checking is not required since the delay time has not come yet")
    return
  }

  check();
}

function check(){
  var data = getUserData();
  // only 1 check per 2 second for one user
  if(data.sheduledAt){
    var duration = Date.now() - data.sheduledAt;
    if(duration < 2000){ return }
  }

  data.sheduledAt = Date.now();
  saveUserData(data)

  debugInfo("create task for checking")

  Bot.run({
    command: LIB_PREFIX + "checkMemberships",
    run_after: 1  // just for run in background
  })
}

function checkMembership(chat_id){
  if(!chat_id){
    chat_id = params;
  }

  Api.getChatMember({
    chat_id: chat_id,
    user_id: user.telegramid,
    on_result: LIB_PREFIX + "onCheckMembership " + chat_id,
    on_error: LIB_PREFIX + "onError " + chat_id
  })
}

function checkMemberships(){
  var options = getLibOptions();
  if(!options.chats){ return }
  var chats = options.chats.split(",");

  debugInfo("run checking for " + JSON.stringify(chats));

  for(var ind in chats){
    // several chats
    var chat_id = chats[ind].split(" ").join("");

    Bot.run({
      command: LIB_PREFIX + "checkMembership " + chat_id,
      run_after: 1,  // just for run in background
    })
  }
}

function isJoined(response){
  var status = response.result.status;
  return (
    (status == "member")||
    (status == "administrator")||
    (status == "creator")
  )
}

function handleMembership(chat_id, data, opts){
  if(!data[chat_id]&&opts.onJoininig){
    // run on just Joined
    Bot.run({ command: opts.onJoininig, options: { chat_id: chat_id, result: options.result } })
  }
  data[chat_id] = Date.now();
  saveUserData(data);
}

function handleNoneMembership(chat_id, data, opts){
  data[chat_id] = false
  if(opts.onNeedJoining){
    Bot.run({ command: opts.onNeedJoining, options: { chat_id: chat_id, result: options.result } })
  }
  saveUserData(data);
}

function onCheckMembership(){
  var opts = getLibOptions();
  var chat_id = params;

  data = getUserData();
  data.lastCheckTime = Date.now();

  debugInfo("check response: " + JSON.stringify(options));

  if(isJoined(options)){
    handleMembership(chat_id, data, opts)
  }else{
    handleNoneMembership(chat_id, data, opts)
  }
}

function onError(){
  debugInfo("onError for " + params + " >" + JSON.stringify(options))

  var opts = getLibOptions();
  if(!opts.onError){ return }  // no action
  opts.chat_id = params;
  Bot.run({ command: opts.onError, options: options })
}

function isFreshTime(curTime, options){
  if(!curTime){ return false }
  var duration = Date.now() - curTime; // in ms
  duration = duration / 1000 / 60; // in minutes

  return duration < parseInt(options.checkTime);
}

function isActualMembership(userData, chat_id, options){
  if(!chat_id){ return false }
  if(!userData[chat_id]){ return false }

  return isFreshTime(userData[chat_id], options)
}

function isMember(chat_id){
  var options = getLibOptions();
  var userData = getUserData()

  if(chat_id){
    return isActualMembership(userData, chat_id, options);
  }

  // for all chats

  var result = true;

  if(!options.chats){ return }

  var chats = options.chats.split(",");

  if(chats){
    for(var ind in chats){
      result = isActualMembership(
        userData,
        chats[ind].split(" ").join(""),
        options
      );
    }
  }

  return result;
}

publish({
  setup: setup,
  check: check,
  isMember: isMember
})

on(LIB_PREFIX + "checkMemberships", checkMemberships);
on(LIB_PREFIX + "checkMembership", checkMembership);
on(LIB_PREFIX + "onCheckMembership", onCheckMembership);
on(LIB_PREFIX + "onError", onError);
on("@", handleAll );
