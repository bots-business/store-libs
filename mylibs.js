let now = new Date().toLocaleString("en-US", {

  timeZone: "Asia/kolkata"

})

Bot.sendMessage(now)

publish({

  sayHello: indiadatetimeformate,

  sayGoodbyeTo: goodbye     

})
