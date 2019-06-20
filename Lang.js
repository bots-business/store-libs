let LIB_PREFIX = 'lang_lib_'

function setUserLanguage(curLangName){
  User.setProperty(LIB_PREFIX + 'curLangName', curLangName, 'string');
}

function getUserLanguage(){
  let lng = User.getProperty(LIB_PREFIX + 'curLangName');
  if(lng){ return lng }
  return getDefaultLanguage();
}

function setDefaultLanguage(langName){
  Bot.setProperty(LIB_PREFIX + 'default', langName, 'string');
}

function getDefaultLanguage(){
  return Bot.getProperty(LIB_PREFIX + 'default');
}

function setupLanguage(langName, keys){
  Bot.setProperty(LIB_PREFIX + langName, keys, 'json');
  let def = getDefaultLanguage();
  if(!def){ setDefaultLanguage(langName) }
}

function get(lang){
  let curLng
  if(lang){ curLng = lang }
  else{
    curLng = getUserLanguage();
  }

  let json = Bot.getProperty(LIB_PREFIX + curLng);
  if(!json){
    throw 'Language is not setup: ' + curLng;
  }
  return json
}

publish({
  user:{
    setLang: setUserLanguage,
    getCurLang: getUserLanguage
  },
  default:{
    setLang: setDefaultLanguage,
    getCurLang: getDefaultLanguage
  },
  setup: setupLanguage,
  get: get
})