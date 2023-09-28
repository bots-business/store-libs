//The Global Variables
const libPrefix = "projectoid";
const API_URL = "https://api.projectoid.site/v1";

// Function to convert JSON to URL query string
function convertJsonToQueryString(jsonData) {
  let queryString = Object.keys(jsonData)
    .map(function (key) {
      return encodeURIComponent(key) + "=" + encodeURIComponent(jsonData[key]);
    })
    .join("&");
  return queryString;
}

/**
 * apiCall() - Makes an API call to Projectoid.
 *
 * @since 1.0.0
 *
 * @param {object} options - The API call options.
 * Example options:
 * {
 *   path: "example/endpoint",
 *   method: "post",
 *   body: { key1: "value1", key2: "value2" },
 *   onSuccess: "handleSuccess",
 *   onError: "handleError"
 * }
 */
function apiCall(options) {
  if (!options) {
    throw libPrefix + ": apiCall: parameters not found";
  }
  let url = API_URL + "/" + options.path;
  if (options.method.toLowerCase() === "get") {
    url += "?" + convertJsonToQueryString(options.body);
  }
  let apiData = {
    url: url,
    headers: {
      ...(options.method.toLowerCase() === "get"
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body: options.body,
    folow_redirects: true,
    success: libPrefix + "onApiAnswer " + options.onSuccess,
    error: libPrefix + "onApiError",
  };

  // Check the method and use the corresponding HTTP function
  if (options.method.toLowerCase() === "get") {
    HTTP.get(apiData);
  } else if (options.method.toLowerCase() === "post") {
    HTTP.post(apiData);
  } else {
    throw "Unsupported HTTP method: " + options.method;
  }
}

/**
 * saveToken() - Saves the Projectoid access token.
 *
 * @since 1.0.0
 *
 * @param {string} access_token - The Projectoid access token to save.
 */
function saveAccessToken(access_token) {
  if (!access_token) {
    throw libPrefix + ": Projectoid Access Token Not Found";
  }
  if (access_token.length != 32) {
    throw libPrefix + ": Projectoid Access Token is Wrong";
  }
  Bot.setProperty("Projectoid_AccessToken", access_token);
}

function getAccessToken(){
  const access_token = Bot.getProperty("Projectoid_AccessToken");
  if(!access_token){
    throw libPrefix + ': Bot Access Token Not Found';
  }
  return access_token;
}
/**
 * addChat() - Adds a chat to Projectoid.
 *
 * @since 1.0.0
 *
 * @param {number} chatid - The chat ID to add.
 * @param {string} access_token - The Projectoid access token.
 * @param {string} command - The command to execute on success.
 */
function addChat(chatid, access_token, command) {
  if (isNaN(parseInt(chatid))) {
    throw libPrefix + ": addChat: incorrect chat id";
  }

  if (!access_token) {
    var access_token = Bot.getProperty("Projectoid_AccessToken");
    if (!access_token) {
      throw libPrefix + ": addChat: Access Token Not Found";
    }
  }

  let requestData = {
    method: "post",
    path: "telegram/botpanel/adduser.php",
    body: {
      bot_id: bot.token.split(":")[0],
      user_id: chatid,
      access_token,
    },
    onSuccess: command ? command : null,
  };
  apiCall(requestData);
}

//---------------------Broadcast Functions Starts----------------------------
/**
 * initiateBroadcast() // initiateForwardBroadcast() // initiateCopyBroadcast() - Broadcasts a message to multiple chats.
 *
 * @since 1.0.0
 *
 * @param {object} options - The broadcast options.
 * Example options: 
 * {
 *  method: "sendMessage",
 *  text: "Hello, world!",
 *  type: "text",
 *  file_id: null,
 *  caption: "This is a caption",
 *  message_id: 12, //for forwardBroadcast or copyBroadcast
 *  from_chat_id: 10967486043, //for forwardBroadcast or copyBroadcast
 *  parseMode: "HTML",
 *  disableWebPreview: false,
 *  protectContent: true,
 *  webhookUrl: "https://example.com/webhook",
 *  command: "handleSuccessCommand",
 *  access_token: "your_access_token_here", // Optional, if not provided, it will use the saved access token.
 * };
 */
function initiateBroadcast(options) {
  if (!options) {
    throw libPrefix + ": initiateBroadcast: parameters not found";
  }
  if (!options.method) {
    throw libPrefix + ": initiateBroadcast: broadcast method not found";
  }
  if (options.method == "forwardMessage") {
    initiateForwardBroadcast(options);
    return;
  }
  if (options.method == "copyMessage") {
    initiateCopyBroadcast(options);
    return;
  }
  
  const {
    text = null, type = null, file_id = null, caption = null, 
    parseMode = null, disableWebPreview = null, 
    protectContent = false, webhookUrl = null, command = null 
  } = options;

  const access_token = options.access_token ?? getAccessToken();

  let requestData = {
    path: "telegram/botpanel/broadcast.php",
    method: "post",
    body: {
      bot: bot.name,
      bot_token: bot.token,
      access_token,
      admin: user.telegramid,
      method: options.method,
      text,
      type,
      file_id,
      caption,
      parseMode,
      disableWebPreview,
      protectContent,
      webhookUrl,
    },
    onSuccess: cmd,
  };
  apiCall(requestData);
}

function initiateForwardBroadcast(options) {
  if (!options) {
    throw libPrefix + ": initiateForwardBroadcast: options not found";
  }
  const { from_chat_id, message_id, protectContent = false, webhookUrl = null, command = null } = options;

  if (!from_chat_id || !message_id) {
    throw libPrefix + ": initiateForwardBroadcast: chat id or message id was not found";
  }

  const access_token = options.access_token ?? getAccessToken();

  let requestData = {
    path: "telegram/botpanel/broadcast.php",
    method: "post",
    body: {
      access_token,
      bot_token: bot.token,
      admin: user.telegramid,
      method: "forwardMessage",
      from_chat_id,
      message_id,
      protectContent,
      webhookUrl,
    },
    onSuccess: command,
  };
  apiCall(requestData);
}

function initiateCopyBroadcast(options) {
  if (!options) {
    throw libPrefix + ": initiateCopyBroadcast: options not found";
  }
  const { from_chat_id, message_id, protectContent = false, webhookUrl = null, command = null } = options;
  
  if (!from_chat_id || !message_id) {
    throw libPrefix + ": initiateCopyBroadcast: chat id or message id was not found";
  }
  
  const access_token = options.access_token ?? getAccessToken();

  let requestData = {
    path: "telegram/botpanel/broadcast.php",
    method: "post",
    body: {
      access_token,
      bot_token: bot.token,
      method: "copyMessage",
      admin: user.telegramid,
      from_chat_id,
      message_id,
      protectContent,
      webhookUrl,
    },
    onSuccess: command,
  };
  apiCall(requestData);
}
//---------------------Broadcast Functions Ends------------------------------

/**
 * checkMembership() - Checks membership of users in chats.
 *
 * @since 1.0.0
 *
 * @param {object} options - The membership check options.
 */
function checkMembership(options) {
  if (!options) {
    throw libPrefix + ": checkMembership: params not found";
  }
  if (!options.userId) {
    throw libPrefix + ": checkMembership: User id Not Found";
  }
  if (!options.chats) {
    throw libPrefix + ": checkMembership: Chat IDs Not Found";
  }
  if (!options.command) {
    throw libPrefix + ": checkMembership: command not found to return response";
  }

  let requestData = {
    path: "telegram/membership/index.php",
    method: "post",
    body: {
      token: bot.token,
      userId: options.userId,
      chatIds: options.chats,
    },
    onSuccess: options.command,
  };
  apiCall(requestData);
}

// Function called when an API answer is received
function _onApiAnswer() {
  // Parse the content of the response, which is in JSON format
  let options = content;
  try {
    options = JSON.parse(options);
  } catch (error) {}

  if (!params || params === null || params === "null") {
  } else {
    Bot.runCommand(params, options);
  }
}

// Function called when an API request results in an error
function _onApiError() {
  throw libPrefix + ": " + content + "\nGet Help at @ProjectoidChat";
}

/** 
* saveAccessToken() - Saves the Projectoid access token.
* saveAccessToken() - Saves the Projectoid access token to use in functions when not declared.
* addChat() - Attempts to Add a chat to Projectoid Database.
* initiateForwardBroadcast() - Forwards a message to multiple chats.
* initiateCopyBroadcast() - Copies a message to multiple chats.
* checkMembership() - Checks membership of users in chats.
*/
publish({
  apiCall: apiCall,
  addChat: addChat,
  saveAccessToken: saveAccessToken,
  initiateBroadcast: initiateBroadcast,
  initiateForwardBroadcast: initiateForwardBroadcast,
  initiateCopyBroadcast: initiateCopyBroadcast,
  checkMembership: checkMembership,
});

on(libPrefix + "_onApiAnswer", onApiAnswer);
on(libPrefix + "_onApiError", onApiError);
