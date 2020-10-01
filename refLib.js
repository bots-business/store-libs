let trackOptions = {};

function emitEvent(eventName, prms = {}){
  let evenFun = trackOptions[eventName]
  if(evenFun){ evenFun(prms) }
}

function saveRefListFor(userId){
  // save RefList - JSON
  let propName = 'REFLIB_refList' + userId;
  let refList = Bot.getProperty(propName);

  if(!refList){ refList = { count: 0, users:[] } };
  
  refList.count = refList.count + 1;
  
  refList.users.push(user);
  Bot.setProperty(propName, refList, 'json');
}

function saveActiveUsers(userKey, refUser){
  // Top active users - activityList
  let activityList = Bot.getProperty('REFLIB_activityList');
  if(!activityList){ activityList = {} }
  
  let activity = activityList[userKey];
  if(!activity){
    activityList[userKey] = { count:0, username: refUser.username }
  }
  activityList[userKey].count+= 1;
  Bot.setProperty('REFLIB_activityList', activityList, 'json');
}

function setReferralByAnotherUser(userId){
  let userKey = 'REFLIB_user' + userId;
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
  User.setProperty('REFLIB_attracted_by_user', refUser, 'json');
  emitEvent('onAtractedByUser', refUser );
}

function isAlreadyAttracted(){
  return User.getProperty('REFLIB_attracted_by_user') ||
          User.getProperty('REFLIB_attracted_by_channel') ||
          User.getProperty('REFLIB_old_user')
}

function trackRef(){
  let prefix = 'user'

  let uprefix = Bot.getProperty('REFLIB_refList_link_prefix');
  if(uprefix){ prefix = uprefix  }

  let arr = params.split(prefix);
  if((arr[0]=='')&&(arr[1])){
    // it is affiliated by another user
    let userId=arr[1];
    setReferralByAnotherUser(userId);
  }else{
    let channel = params;
    User.setProperty('REFLIB_attracted_by_channel', channel, 'string');
    emitEvent('onAttracted', channel);
  }
}

function doSort(a, b){
  if(a.count>b.count) return -1;
  if(a.count<b.count) return 1;
}

function getTopList(top_count=10){
  var activityList = Bot.getProperty('REFLIB_activityList');

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
  Bot.setProperty('REFLIB_activityList', {}, 'json');
  return true;
}

function getRefList(){
  let refList = Bot.getProperty('REFLIB_refList' + user.id);
  let result = []
  if((refList)&&(refList.count>0)){
    result = refList.users;
  }
  return result;
}

function clearRefList(){
  propName = 'REFLIB_refList' + user.id;
  Bot.setProperty(propName, { users:[], count:0 }, 'json');
  return true;
}

function attractedByUser(){
  return User.getProperty('REFLIB_attracted_by_user')
}

function attractedByChannel(){
  return User.getProperty('REFLIB_attracted_by_channel')
}

function getRefLink(botName, prefix){
  if(!prefix){
    prefix = 'user'
  }else{
    Bot.setProperty('REFLIB_refList_' + 'link_prefix', prefix, 'string');
  }

  let aff_link='https://t.me/' + botName + 
    '?start=' + prefix + user.id;

  let userKey = 'user' + user.id;
  user.chatId = chat.chatid;
  Bot.setProperty('REFLIB_' + userKey, user, 'json');
  return aff_link;
}

function track(_trackOptions={}){
  let need_track = (message.split(' ')[0]=='/start')&&params;
  if(!need_track){
    User.setProperty('REFLIB_old_user', true, 'boolean');
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