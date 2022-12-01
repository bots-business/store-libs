const PANEL_NAME = "AdminGuardSettings";
const IDS_FIELD_NAME = "adminIds";
const FOLDER_FIELD_NAME = "adminFolder";
const UNAUTHORIZED_COMMAND_NAME = "unauthorizedAccessCommand";

let guardSettings;

function setup(){
  if (AdminPanel.getPanel(PANEL_NAME)){
    return Bot.sendMessage(
      "Guard Lib: You have already activated the panel. To make changes, go to the admin panel on the bot page.");
  }

  let panelData = {
    title: "Guard",
    description: "",
    index: 0,
    icon: "person",
    button_title: "SAVE",
    fields: [
      {
        name: IDS_FIELD_NAME,
        title: "Admin IDs",
        description: "A list of authorized users (you can specify multiple user BB IDs separated by commas).",
        type: "string",
        value: user.id
      },
      {
        name: "adminIdsDiscr",
        description: "Information about BB ID is stored in user.id."
      },
      {
        name: FOLDER_FIELD_NAME,
        title: "Commands folder",
        description: "The folder for commands is only for authorized users (whose BB IDs are listed above).",
        type: "string",
        placeholder: "admins",
        value: "admins"
      },
      {
        name: UNAUTHORIZED_COMMAND_NAME,
        title: "Command in case of unauthorized access",
        description: "If, when attempting unauthorized access, you want to output a message to the user or execute some other code.",
        type: "string",
        placeholder: "/unauthorized_access",
      }
    ]
  };

  AdminPanel.setPanel({ panel_name: PANEL_NAME, data: panelData });

  Bot.sendMessage("Guard Lib: The admin panel has been successfully activated.");
};

function getPanelSettings(){
  if (guardSettings) return;
  guardSettings = AdminPanel.getPanelValues(PANEL_NAME);
  return;
};

function isAdmin(userId){
  getPanelSettings();
  
  if (!guardSettings) return;
  if (!guardSettings[IDS_FIELD_NAME]) return ;
  if (isNaN(userId)) return ;

  let adminIdsList = guardSettings[IDS_FIELD_NAME].toString().replace(/\s/g, "").split(",");
  let adminIds = [];
  for (let adminId of adminIdsList){
    if (adminId == userId) return true;
  };
  return false;
};

function isAdminFolder(){
  if (!guardSettings[FOLDER_FIELD_NAME]) return;
  
  let adminFolder = guardSettings[FOLDER_FIELD_NAME];
  if (command.folder == adminFolder) return true ;
  return;
};

function unauthorizedAccess(){
  if (!guardSettings[UNAUTHORIZED_COMMAND_NAME]) return;
  
  Bot.run({ command: guardSettings[UNAUTHORIZED_COMMAND_NAME] });
};

function verifyAccess(){
  getPanelSettings();
  
  if (!guardSettings) return true;

  if(!isAdminFolder()) return true;
  if(!isAdmin(user.id)){
    unauthorizedAccess();
    return;
  };
  return true;
};

publish({
  setup: setup,
  isAdmin: isAdmin,
  verifyAccess: verifyAccess
});