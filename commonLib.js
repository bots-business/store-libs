function getNameFor(member){
  let haveAnyNames = member.username||member.first_name||member.last_name;
  if(!haveAnyNames){ return ""}

  if(member.username){
    return "@" + member.username
  }

  return member.first_name ? member.first_name : member.last_name
}

function getLinkFor(member){
  let name = getNameFor(member);
  if(name==""){
    name = member.telegramid;
  }

  return "[" + name + "](tg://user?id=" + member.telegramid + ")";
}

publish({
    getNameFor: getNameFor,
    getLinkFor: getLinkFor
})

