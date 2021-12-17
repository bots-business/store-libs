let LIB_PREFIX = 'REFLIB_';

let trackOptions = {};

function emitEvent(eventName, prms = {}){
  let evenFun = trackOptions[eventName]
  if(evenFun){
    evenFun(prms)
    return true;
  }
}

function getProp(propName){
  return User.getProperty(LIB_PREFIX + propName);
}

function getList(userId){
  let listName = LIB_PREFIX + 'refList' + String(userId);
  return new List({ name: listName, user_id: userId })
}

function getTopList(){
  var list = new List({ name: LIB_PREFIX + 'TopList' });
  if(!list.exist){ list.create() }
  return list;
}

function getRefList(userId){
  if(!userId){ userId = user.id }

  let refList = getList(userId);
  return refList;
}

function addFriendFor(userId){
  // save RefList
  let refList = getList(userId)
  if(!refList.exist){ refList.create() }

  refList.addUser(user);
}

function updateRefsCountFor(userId){
  var topList = getTopList();
  userId = parseInt(userId);

  var refsCount = User.getProperty({
    name: LIB_PREFIX + 'refsCount',
    user_id: userId
  });

  if(!refsCount){ refsCount = 0 }

  User.setProperty({
    name: LIB_PREFIX + 'refsCount',
    value: refsCount + 1,
    list: topList,
    user_id: userId
  });
}

function setReferral(userId){
  addFriendFor(userId);
  updateRefsCountFor(userId);

  let userKey = LIB_PREFIX + 'user' + String(userId);
  let refUser = Bot.getProperty(userKey);

  if(!refUser){ return }

  User.setProperty(LIB_PREFIX + 'attracted_by_user', refUser, 'json');
  
  if(emitEvent('onAtractedByUser', refUser )){ return true }   // Deprecated
  emitEvent('onAttracted', refUser)
}

function isAlreadyAttracted(){
  return getProp('attracted_by_user') || getProp('old_user')
}

function trackRef(){
  let prefix = 'user'

  let uprefix = Bot.getProperty(LIB_PREFIX + 'refList_link_prefix');
  if(uprefix){ prefix = uprefix  }

  let arr = params.split(prefix);
  if(arr[0]!=''){ return }
  let userId=arr[1];
  if(!userId){ return }
  userId = parseInt(userId)

  // own link was touched
  if(userId==user.id){ return emitEvent('onTouchOwnLink') }

  // it is affiliated by another user
  return setReferral(userId);
}

function clearRefList(){
  // TODO
}

function getAttractedBy(){
  var prop = getProp('attracted_by_user');
  if(prop){
    // support for old code
    prop.chatId = prop.telegramid;
  }
  return prop;
}

function getRefLink(botName, prefix){
  if(!prefix){
    prefix = 'user'
  }else{
    Bot.setProperty(LIB_PREFIX + 'refList_' + 'link_prefix', prefix, 'string');
  }

  if(!botName){ botName = bot.name }

  // TODO: we need something like User.get({ user_id, xxx, bot_id: yyy })
  // because this data in database already and we don't need this bot prop 
  let userKey = LIB_PREFIX + 'user' + user.id;
  Bot.setProperty(userKey, user, 'json');

  return 'https://t.me/' + botName + '?start=' + prefix + user.id;
}

function isDeepLink(){
  return (message.split(' ')[0]=='/start')&&params;
}

function track(_trackOptions={}){
  trackOptions = _trackOptions;

  if(isAlreadyAttracted() ){
    return emitEvent('onAlreadyAttracted');
  }

  if(isDeepLink()&&trackRef()){
    return
  }

  return User.setProperty(LIB_PREFIX + 'old_user', true, 'boolean');
}

publish({
  getLink: getRefLink,
  track: track,
  getRefList: getRefList,
  getTopList: getTopList,
  getAttractedBy: getAttractedBy,
  
  // DEPRECATED
  currentUser:{
    getRefLink: getRefLink,
    track: track,
    refList:{
      get: getRefList,
      clear: clearRefList
    },
    attractedByUser: getAttractedBy,
  },
  topList:{
    get: getTopList
  }
})