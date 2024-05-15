const
    SW_TOOL_NAME = 'Auto Switch-Tool',
    SW_VERSION = 2200000,
    SW_VERSION_F = formatVersion("" + SW_VERSION),
    SW_PATCH_URL = 'https://stuff.noobgrotte.de/switcher/patch.js',
    SW_CONFIG = getSettings(''),

    TW_API_URL = 'https://api.twitch.tv/helix',
    TW_CLIENT_ID = 'k5gej9s769fvwr0syqotwmltnjp4rj',
    TW_TOKEN_REQUEST_URL = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${TW_CLIENT_ID}&redirect_uri=http://localhost&scope=channel%3Amanage%3Abroadcast`,
    OBS_PLUGIN_URL = 'https://obsproject.com/forum/resources/obs-websocket-remote-control-obs-studio-from-websockets.466/'
;

let SW_SWITCH_SCENES = [],
    OBS_CONNECTED = false,
    OBS_SCENES = {},
    OBS_CURRENT_SCENE = "",
    TW_GAMES = {},
    TW_GAMES_SEARCHING = null
;