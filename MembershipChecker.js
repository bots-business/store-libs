let LIB_PREFIX = "MembershipChecker_";

function getUserData() {
    let userData = User.getProperty(LIB_PREFIX + "Data");
    if (!userData) { userData = { chats: {} } }
    if (!userData.chats) { userData.chats = {} }
    return userData;
}

function saveUserData(userData) {
    User.setProperty(LIB_PREFIX + "Data", userData, "json");
}


function isInternalCommand() {
    if (!message) { return false }

    return (
        message.startsWith(LIB_PREFIX)
    )
}

function isCallbackCommand(callbacks) {
    if (!message) { return false }

    return (
        Object.values(callbacks).some(callbackValue => {
            return typeof callbackValue === "string" && message.startsWith(callbackValue);
        })
    )
}

function isExceptionCommand(exceptions) {
    if (!message) { return false }

    return (
        exceptions.some(exception => {
            return typeof exception === "string" && message.startsWith(exception);
        })
    )
}

function handle(opts) {

    // opts = {
    //     chats: ["@channel1", "@channel2", "@group1"],
    //     callback: {
    //         onJoining: false,
    //         onNeedJoining: false,
    //         onAllJoining: false,
    //         onAllNeedJoining: "onAllNeedJoining"
    //         onError: "onError"
    //     },
    //     delay: "15", //in minutes
    //     except: ["/start", "etc"],
    //     bb_options: {
    //         data: "to",
    //         pass: "any"
    //     }
    // }

    if (!user) { return }  // can check only for user

    if (!opts.callback || Object.keys(opts.callback).length === 0) {
        opts.callback = {}
    }
    opts.callback = {...{ onJoining: null, onNeedJoining: null, onAllJoining: null, onAllNeedJoining: null, onError: null }, ...opts.callback}

    if (!opts.except || opts.except.length === 0) {
        opts.except = []
    }

    if (!opts.delay) {
        opts.delay = 120
    }

    // ignore internal/callback/exception commands
    if (isInternalCommand()) {
        return {
            status: "internal"
        }
    }

    if (isCallbackCommand(opts.callback)) {
        return {
            status: "callback",
        }
    }

    if (isExceptionCommand(opts.except)) {
        return {
            status: "exception",
        }
    }

    if (completed_commands_count > 0) {
        return {
            status: "subCommand",
        }
    }

    let userData = getUserData();
    let lastScheduledAt= userData.scheduledAt;
    if (!canRunHandleAgain(lastScheduledAt, opts.delay)) {
        return {
            status: "delayToCome",
        }
    }

    return check(opts);
}

function canRunHandleAgain(lastScheduledAt, delay) {
    if (!lastScheduledAt) { return false }

    let duration = Date.now() - lastScheduledAt; // in ms
    duration = duration / 1000 / 60; // in minutes

    return duration > parseInt(delay);
}

function isLastCheckFinished(userData) {
    let scheduledAt = userData.scheduledAt;
    let lastFinishedCheckTime = userData.lastFinishedCheckTime;

    return scheduledAt === lastFinishedCheckTime;
}

function check(opts) {

    if (!opts.chats || opts.chats.length === 0) {
        throw new Error("MembershipChecker: No Chats Are Specified");
    }

    let userData = getUserData();

    // avoid multiple checking
    if (!isLastCheckFinished(userData)) {
        return {
            status: "checking"
        }
    }

    // only 1 check per 2 second for one user
    if (userData.scheduledAt) {
        let duration = Date.now() - userData.scheduledAt;
        if (duration < 2000) {
            return {
                status: "tooFast",
            }
        }
    }

    let currentDate = Date.now();
    userData.scheduledAt = currentDate;
    opts.scheduledAt = currentDate;

    saveUserData(userData);

    // create task for checking
    Bot.run({
        command: LIB_PREFIX + "checkMemberships",
        options: opts,
        run_after: 0.01  // just for run in background
    })
    return {
        status: "checkScheduled"
    }
}

function checkMemberships() {
    let chats = options.chats;

    for (let ind in chats) {
        // several chats
        let chat_id = chats[ind];
        Bot.run({
            command: LIB_PREFIX + "checkMembership " + chat_id,
            options: options,          // passed options
            run_after: 0.01,              // just for run in background
        })
    }
}

function checkMembership() {
    let chat_id = params.split(" ")[0];
    if (!chat_id) { return }

    Api.getChatMember({
        chat_id: chat_id,
        user_id: user.telegramid,
        on_result: LIB_PREFIX + "onCheckMembership " + chat_id,
        on_error: LIB_PREFIX + "onError " + chat_id,
        bb_options: options    // here we have all options lib + admin passed_options
    })
}

function onCheckMembership() {
    let chat_id = params.split(" ")[0];
    let userData = getUserData();

    if (isJoined(options)) {
        handleMembership(chat_id, userData)
    } else {
        handleNoneMembership(chat_id, userData)
    }

    handleAllJoiningOrNeedJoining(userData);
}

function isJoined(response) {
    let status = response.result.status;
    return ["member", "administrator", "creator"].includes(status);
}

function handleMembership(chat_id, userData) {
    let chats = userData.chats;
    chats[chat_id] = {
        joined: true,
        lastCheckTime: options.bb_options.scheduledAt
    };
    saveUserData(userData);

    if (options.bb_options.callback.onJoining) {
        Bot.run({
            command: options.bb_options.callback.onJoining,
            options: {
                'MCL': {
                    chats: [chat_id],
                    user_id: user.telegramid,
                    status: true
                },
                bb_options: options.bb_options.bb_options
            },
            run_after: 1
        })
    }
}

function handleNoneMembership(chat_id, userData) {
    let chats = userData.chats;
    chats[chat_id] = {
        joined: false,
        lastCheckTime: options.bb_options.scheduledAt
    };
    saveUserData(userData);

    if (options.bb_options.callback.onNeedJoining) {
        Bot.run({
            command: options.bb_options.callback.onNeedJoining,
            options: {
                'MCL': {
                    chats: [chat_id],
                    user_id: user.telegramid,
                    status: false
                },
                bb_options: options.bb_options.bb_options
            },
            run_after: 1
        })
    }
}

function handleAllJoiningOrNeedJoining() {
    let userData = getUserData();
    let chats = options.bb_options.chats;
    let joinedList = [];
    let needJoiningList = [];
    let lastCheckTime = options.bb_options.scheduledAt;

    chats.forEach(chat_id => {
        if (!userData.chats[chat_id]) {
            return;
        }
        if (userData.chats[chat_id].lastCheckTime !== lastCheckTime) {
            return;
        }

        if (userData.chats[chat_id].joined) {
            joinedList.push(chat_id);
        } else {
            needJoiningList.push(chat_id);
        }
    });

    if (joinedList.length + needJoiningList.length == chats.length) {

        if (joinedList.length === chats.length) {
            if (options.bb_options.callback.onAllJoining) {
                Bot.run({
                    command: options.bb_options.callback.onAllJoining,
                    options: {
                        'MCL': {
                            chats: chats,
                            user_id: user.telegramid,
                            status: true,
                            joinedList: joinedList,
                            needJoiningList: needJoiningList
                        },
                        bb_options: options.bb_options.bb_options
                    },
                    run_after: 1
                })
            }
        } else {
            if (options.bb_options.callback.onAllNeedJoining) {
                Bot.run({
                    command: options.bb_options.callback.onAllNeedJoining,
                    options: {
                        'MCL': {
                            chats: chats,
                            user_id: user.telegramid,
                            status: false,
                            joinedList: joinedList,
                            needJoiningList: needJoiningList
                        },
                        bb_options: options.bb_options.bb_options
                    },
                    run_after: 1
                })
            }
        }

        userData.lastFinishedCheckTime = lastCheckTime;
        saveUserData(userData);
    }
}

function onError() {
    if (options.bb_options.callback.onError) {
        Bot.run({
            command: options.bb_options.callback.onError,
            options: {
                bb_options: options.bb_options.bb_options
            },
            run_after: 1
        })
    }
}

function isMember(chats) {
    let userData = getUserData();
    let joinedList = [];
    let needJoiningList = [];
    let nonCheckedList = [];


    chats.forEach(chat_id => {
        if (!userData.chats[chat_id]) {
            nonCheckedList.push(chat_id);
        } else if (userData.chats[chat_id].joined) {
            joinedList.push(chat_id);
        } else {
            needJoiningList.push(chat_id);
        }
    });

    return {
        status: needJoiningList.length === 0 && nonCheckedList.length === 0,
        joinedList: joinedList,
        needJoiningList: needJoiningList,
        nonCheckedList: nonCheckedList,
    }
}

publish({
    check: check,                             // manual checking without time delay
    handle: handle,                           // use on @ command - checking with time delay
    isMember: isMember,                       // is member for all chats?
})

on(LIB_PREFIX + "checkMemberships", checkMemberships);
on(LIB_PREFIX + "checkMembership", checkMembership);
on(LIB_PREFIX + "onCheckMembership", onCheckMembership);
on(LIB_PREFIX + "onError", onError);
