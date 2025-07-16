const LIB_PREFIX = "lang_lib_"

function setUserLanguage(curLangName){
  User.setProperty(LIB_PREFIX + "curLangName", curLangName, "string");
}

function getUserLanguage(){
  if(user){
    let lng = User.getProperty(LIB_PREFIX + "curLangName");
    if(lng){ return lng }
  }
  return getDefaultLanguage();
}

function setDefaultLanguage(langName){
  Bot.setProperty(LIB_PREFIX + "default", langName, "string");
}

function getDefaultLanguage(){
  return Bot.getProperty(LIB_PREFIX + "default");
}

function setupLanguage(langName, keys){
  Bot.setProperty(LIB_PREFIX + langName, keys, "json");
  let def = getDefaultLanguage();
  if(!def){ setDefaultLanguage(langName) }
}

function get(lang){
  let curLng;
  if(lang){ curLng = lang }
  else{
    curLng = getUserLanguage();
  }

  let json = Bot.getProperty(LIB_PREFIX + curLng);
  if(!json){
    throw new Error("Language is not configured: " + curLng);
  }

  return json;
}

function get_trans_item(item, lang){
  var result;
  var json = get(lang);
  try{ result = eval("json." + item) }
  catch(err){}

  return result
}

function t(item, lang){
  // for lang
  var result = get_trans_item(item, lang);
  if(result){ return result }

  // for default language
  return get_trans_item(item, getDefaultLanguage());
}

function getCommandByAlias(alias, lang){
  if(!alias){ return }
  var json = get(lang)
  if(!json){ return }
  if(!json.aliases){ return }

  var aliases;
  for(var key in json.aliases){
    // aliases separated with ",". Can have spaces - so remove spaces:
    aliases = key.split(" ,").join(",").split(", ").join(",");
    aliases = aliases.split(",");
    for(var ind in aliases){
      if(aliases[ind].toLowerCase()==alias.toLowerCase()){
        return json.aliases[key]
      }
    }
  }
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
  get: get,
  t: t,
  getCommandByAlias: getCommandByAlias
})