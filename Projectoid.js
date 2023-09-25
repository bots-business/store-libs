//The Global Variables
let libPrefix = "projectoid";
let API_URL = "https://api.projectoid.site/v1";

// Function to convert JSON to URL query string
function jTQS(jsonData) {
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
 */
function apiCall(options) {
  if (!options) {
    throw libPrefix + ": apiCall: options not found";
  }
  let url = API_URL + "/" + options.path;
  if (options.method.toLowerCase() === "get") {
    url += "?" + jTQS(options.body);
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
function saveToken(access_token) {
  if (!access_token) {
    throw libPrefix + ": Projectoid Access Token Not Found";
  }
  if (access_token.length != 32) {
    throw libPrefix + ": Projectoid Access Token is Wrong";
  }
  Bot.setProperty("Projectoid_AccessToken", access_token);
}

/**
 * addChat() - Adds a chat to Projectoid.
 *
 * @since 1.0.0
 *
 * @param {string|number} chatid - The chat ID to add.
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
    onSuccess: !command ? null : command,
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
 */
function initiateBroadcast(options) {
  if (!options) {
    throw libPrefix + ": initiateBroadcast: options not found";
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

  let text = !options.text ? null : options.text;
  let type = !options.type ? null : options.type;
  let file_id = !options.file_id ? null : options.file_id;
  let caption = !options.caption ? null : options.caption;
  let parseMode = !options.parseMode ? null : options.parseMode;
  let disableWebPreview = !options.disableWebPreview
    ? null
    : options.disableWebPreview;
  let protectContent = !options.protectContent ? false : options.protectContent;
  let webhookUrl = !options.webhookUrl ? null : options.webhookUrl;
  let cmd = !options.command ? null : options.command;

  if (!options.access_token) {
    var access_token = Bot.getProperty("Projectoid_AccessToken");
    if (!access_token) {
      throw libPrefix + ": initiateBroadcast: Bot Access Token Not Found";
    }
  }

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
  let from_chat_id = options.from_chat_id;
  let message_id = options.message_id;

  if (!from_chat_id || !message_id) {    
    throw libPrefix + ": initiateForwardBroadcast: chat id or message id was not found";
  }
  let protectContent = !options.protectContent ? false : options.protectContent;
  let webhookUrl = !options.webhookUrl ? null : options.webhookUrl;
  let cmd = !options.command ? null : options.command;

  if (!options.access_token) {
    var access_token = Bot.getProperty("Projectoid_AccessToken");
    if (!access_token) {
      throw libPrefix + ": initiateForwardBroadcast: Bot Access Token Not Found";
    }
  }

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
    onSuccess: cmd,
  };
  apiCall(requestData);
}

function initiateCopyBroadcast(options) {
  if (!options) {
    throw libPrefix + ": initiateCopyBroadcast: options not found";
  }
  let from_chat_id = options.from_chat_id;
  let message_id = options.message_id;

  if (!from_chat_id || !message_id) {
    throw libPrefix + ": initiateCopyBroadcast: chat id or message id was not found";
  }
  let protectContent = !options.protectContent ? false : options.protectContent;
  let webhookUrl = !options.webhookUrl ? null : options.webhookUrl;
  let cmd = !options.command ? null : options.command;

  if (!options.access_token) {
    var access_token = Bot.getProperty("Projectoid_AccessToken");
    if (!access_token) {
      throw libPrefix + ": initiateCopyBroadcast: Bot Access Token Not Found";
    }
  }

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
    onSuccess: cmd,
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
function onApiAnswer() {
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
function onApiError() {
  throw libPrefix + ": " + content + "\nGet Help at @ProjectoidChat";
}

publish({
  apiCall: apiCall,
  addChat: addChat,
  saveToken: saveToken,
  initiateBroadcast: initiateBroadcast,
  initiateForwardBroadcast: initiateForwardBroadcast,
  initiateCopyBroadcast: initiateCopyBroadcast,
  checkMembership: checkMembership,
});

on(libPrefix + "onApiAnswer", onApiAnswer);
on(libPrefix + "onApiError", onApiError);
