let trackOptions = {};

LIB_PREFIX = "REFLIB_";

function emitEvent(eventName, prms = {}){
  let evenFun = trackOptions[eventName]
  if(evenFun){ evenFun(prms) }
}

function getProperty(propName){
  return Bot.getProperty(LIB_PREFIX + propName);
}

function saveRefListFor(userId){
  // save RefList - JSON
  let propName = LIB_PREFIX + 'refList' + userId;
  let refList = Bot.getProperty(propName);

  if(!refList){ refList = { count: 0, users:[] } };
  
  refList.count = refList.count + 1;
  
  refList.users.push(user);
  Bot.setProperty(propName, refList, 'json');
}

function saveActiveUsers(userKey, refUser){
  // Top active users - activityList
  let activityList = Bot.getProperty(LIB_PREFIX + 'activityList');
  if(!activityList){ activityList = {} }
  
  let activity = activityList[userKey];
  if(!activity){
    activityList[userKey] = { count:0, username: refUser.username }
  }
  activityList[userKey].count+= 1;
  Bot.setProperty(LIB_PREFIX + 'activityList', activityList, 'json');
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
  saveActiveUsers(userKey, refUser);

  // refUser - it is JSON
  User.setProperty(LIB_PREFIX + 'attracted_by_user', refUser, 'json');
  emitEvent('onAtractedByUser', refUser );
}

function isAlreadyAttracted(){
  return User.getProperty(LIB_PREFIX + 'attracted_by_user') ||
          User.getProperty(LIB_PREFIX + 'attracted_by_channel') ||
          User.getProperty(LIB_PREFIX + 'old_user')
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

function doSort(a, b){
  if(a.count>b.count) return -1;
  if(a.count<b.count) return 1;
}

function getTopList(top_count=10){
  var activityList = Bot.getProperty(LIB_PREFIX + 'activityList');

  let sortedList = [];

  let count, username

  for(var key in activityList){
    count =  activityList[key].count;
    username = activityList[key].username;
    sortedList.push(
      { count: count, userKey: key, username:username }
    );
  }

  sortedList.sort(doSort);

  let result = [];

  for(var i=0; i<(top_count-1); i++){
    let item = sortedList[i];
    if(!item){ break }
    result.push(item);
  }

  return result;
}

function clearTopList(){
  Bot.setProperty(LIB_PREFIX + 'activityList', {}, 'json');
  return true;
}

function getRefList(){
  let refList = Bot.getProperty(LIB_PREFIX + 'refList' + user.id);
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
  return User.getProperty(LIB_PREFIX + 'attracted_by_user')
}

function attractedByChannel(){
  return User.getProperty(LIB_PREFIX + 'attracted_by_channel')
}

function getRefLink(botName, prefix){
  if(!prefix){
    prefix = 'user'
  }else{
    Bot.setProperty(LIB_PREFIX + 'refList_' + 'link_prefix', prefix, 'string');
  }

  let aff_link='https://t.me/' + botName + 
    '?start=' + prefix + user.id;

  let userKey = 'user' + user.id;
  user.chatId = chat.chatid;
  Bot.setProperty(LIB_PREFIX + userKey, user, 'json');
  return aff_link;
}

function track(_trackOptions={}){
  let need_track = (message.split(' ')[0]=='/start')&&params;
  if(!need_track){
    User.setProperty(LIB_PREFIX + 'old_user', true, 'boolean');
    return
  }

  trackOptions = _trackOptions;

  if(isAlreadyAttracted() ){
    emitEvent('onAlreadyAttracted');
  }else{
    trackRef(trackOptions);
  }
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