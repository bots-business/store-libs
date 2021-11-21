let LIB_PREFIX = 'REFLIB_';

let trackOptions = {};

function emitEvent(eventName, prms = {}){
  let evenFun = trackOptions[eventName]
  if(evenFun){ evenFun(prms) }
}

function getProp(propName){
  return User.getProperty(LIB_PREFIX + propName);
}

function getJsonRefList(userId){
  let propName = LIB_PREFIX + 'refList' + userId;
  let refList = Bot.getProperty(propName);

  if(!refList){ refList = { count: 0, users:[] } };
  return refList;
}

function saveRefListFor(userId){
  // save RefList - JSON
  let refList = getJsonRefList(userId);
  
  refList.count = refList.count + 1;
  
  refList.users.push(user);

  let propName = LIB_PREFIX + 'refList' + userId;
  Bot.setProperty(propName, refList, 'json');
}

function setReferralByAnotherUser(userId){
  let userKey = LIB_PREFIX + 'user' + userId;
  // it is for secure reason. User can pass any params to start!
  let refUser = Bot.getProperty(userKey);

  if(!refUser){ return }

  if(refUser.telegramid==user.telegramid){
    // own link was touched
    emitEvent('onTouchOwnLink');
    return;
  }

  saveRefListFor(userId);

  // refUser - it is JSON
  User.setProperty(LIB_PREFIX + 'attracted_by_user', refUser, 'json');
  emitEvent('onAtractedByUser', refUser );
}

function isAlreadyAttracted(){
  return getProp('attracted_by_user') ||
          getProp('attracted_by_channel') ||
          getProp('old_user')
}

function trackRef(){
  let prefix = 'user'

  let uprefix = Bot.getProperty(LIB_PREFIX + 'refList_link_prefix');
  if(uprefix){ prefix = uprefix  }

  let arr = params.split(prefix);
  if((arr[0]=='')&&(arr[1])){
    // it is affiliated by another user
    let userId=arr[1];
    setReferralByAnotherUser(userId);
  }else{
    let channel = params;
    User.setProperty(LIB_PREFIX + 'attracted_by_channel', channel, 'string');
    emitEvent('onAttracted', channel);
  }
}

function getTopList(top_count=10){
  // TODO: make add quickly TopList
  return []
}

function getRefList(){
  let refList = getJsonRefList(user.id)

  let result = []
  if((refList)&&(refList.count>0)){
    result = refList.users;
  }
  return result;
}

function clearRefList(){
  propName = LIB_PREFIX + 'refList' + user.id;
  Bot.setProperty(propName, { users:[], count:0 }, 'json');
  return true;
}

function attractedByUser(){
  return getProp('attracted_by_user')
}

function attractedByChannel(){
  return getProp('attracted_by_channel')
}

function getRefLink(botName, prefix){
  if(!prefix){
    prefix = 'user'
  }else{
    Bot.setProperty(LIB_PREFIX + 'refList_' + 'link_prefix', prefix, 'string');
  }

  if(!botName){ botName = bot.name }

  let aff_link = 'https://t.me/' + botName + '?start=' + prefix + user.id;

  let userKey = 'user' + user.id;
  user.chatId = chat.chatid;
  Bot.setProperty(LIB_PREFIX + userKey, user, 'json');
  return aff_link;
}

function isDeepLink(){
  return (message.split(' ')[0]=='/start')&&params;
}

function track(_trackOptions={}){
  trackOptions = _trackOptions;

  if(isAlreadyAttracted() ){
    return emitEvent('onAlreadyAttracted');
  }

  if(!isDeepLink()){
    return User.setProperty(LIB_PREFIX + 'old_user', true, 'boolean');
  }

  trackRef();
}

publish({
  currentUser:{
    getRefLink: getRefLink,
    track: track,
    refList:{
      get: getRefList,
      clear: clearRefList
    },
    attractedByUser: attractedByUser,
    attractedByChannel: attractedByChannel
  },
  topList:{
    get: getTopList,
    clear: clearTopList
  }
})