// Init websocket for obs
/**
 * @function OBSWebSocket
 * @type {OBSWebSocket}
 */

const obs = new OBSWebSocket();

/**
 * @param authError
 */
function showLoadingError(authError) {

    let sError;

    if (authError) {
        sError = `
            Bitte vergewissere dich, dass die Daten in /lib/config.js auch deinen von dir eingetragenen 
            im Plugin <strong>OBS-Websockets</strong> entsprechen.
        `;
    } else {
        sError = `Keine Verbindung zu OBS erkannt.`;
    }

    sError += `
        Bitte starte OBS, prüfe die im Plugin eingetragenen Daten und lade die Seite hier neu. Stelle zudem sicher, 
        dass das Plugin <strong>OBS-Websockets</strong> aktiviert ist.
    `;

    SceneBox.setContent(sError);
    qs('#scenes').classList.add("error");

    SceneBox.setReady(false);
}

/**
 * @param {string} btnId
 * @param {string} state (add|remove)
 */
function setSaveButtonState(btnId, state) {
    const btn = qs('#' + btnId);
    if (btn) {
        btn.classList[state]('updated');
    }
}

/**
 *
 */
function saveSettings() {

    Loader.show("Speichere Einstellungen...");

    (async function () {

        const broadcaster = qs('input[name="broadcaster"]'),
            token = qs('input[name="token"]').value.trim(),
            active = qs('input[name="active"]')
        ;

        if (broadcaster) {
            const broadCasterId = broadcaster.getAttribute("data-id"),
                broadCasterName = broadcaster.getAttribute("data-name");
            if (broadCasterName && broadCasterId) {
                SW_CONFIG.broadcaster = {
                    id: parseInt(broadCasterId.trim()),
                    name: broadCasterName.trim()
                };
            }
        }
        if (token) {
            SW_CONFIG.token = token;
        }
        SW_CONFIG.active = (!active.disabled && active.checked) ? 1 : 0;

        qsa('input[name="game[]"], input[name="title[]"]').forEach((e) => {

            const sceneName = e.dataset.scene;

            if (OBS_SCENES[sceneName]) {

                const sField = e.name === "game[]" ? 'game' : 'title';

                if (sField === "game") {

                    const game_id = parseInt(e.getAttribute("data-game-id")),
                        game_name = e.getAttribute("data-game-name"),
                        game_real_name = e.value.trim()
                    ;

                    if (game_real_name !== "" && !isNaN(game_id) && game_name !== "" && game_name === game_real_name) {
                        OBS_SCENES[sceneName].game_id = e.getAttribute("data-game-id");
                        OBS_SCENES[sceneName].game = e.getAttribute("data-game-name");
                    } else {
                        OBS_SCENES[sceneName].game_id = '';
                        OBS_SCENES[sceneName].game = '';
                    }
                } else {
                    OBS_SCENES[sceneName][sField] = e.value.trim();
                }
            }
        });

        DragDrop.updateData();

    }()).then(() => {

        if (SW_CONFIG) {
            localStorage.setItem('SW_CONFIG', JSON.stringify(SW_CONFIG));
        }
        if (OBS_SCENES) {
            localStorage.setItem('OBS_DATA', JSON.stringify(OBS_SCENES));
        }

        showInfo("Erfolg", "Einstellungen gespeichert", "success");
        setSaveButtonState('saveSettings', 'remove');

        Loader.hide();

        Streaming.initTimer();
    });
}

/**
 * @param {boolean} bIgnoreLive
 * @returns {boolean}
 */
function checkReadyState(bIgnoreLive) {

    if (!SW_CONFIG.token) {
        showInfo('Fehler', 'Du benötigst einen Token. Klicke dazu auf "Token ermitteln" und kopiere anschließen "access_token=<strong>Diesen Wert</strong>&scope" aus der URL. ', 'error');
        return false;
    }

    if (!SW_CONFIG.broadcaster || !SW_CONFIG.broadcaster.id) {
        showInfo('Fehler', 'Du musst deinen Twitch-Account als Broadcaster angeben, bevor die Funktion aktiv wird.', 'error');
        return false;
    }

    if (!bIgnoreLive && !Streaming.state) {
        showInfo('Fehler', 'Dein Stream ist momentan nicht live.', 'error');
        return false;
    }

    return true;
}

/**
 * @returns {boolean}
 */
function checkTimerStates() {

    const sceneTimeouts = qsa('input[data-field="scene-timeout"]');

    let toReturn = true;

    sceneTimeouts.forEach(el => {
        if (qs(`input[name="is_active[]"][data-scene="${el.dataset.scene}"]`).checked) {
            if (el.value == 0) {
                toReturn = false;
            }
        }
    });

    if (!toReturn) {
        showInfo('Fehler', 'Alle aktiven Timer-Felder benötigen einen Zeitwert!', 'error');
    }

    return toReturn;
}

/**
 * @param {object} element
 * @returns {boolean}
 */
function toggleActiveButton(element) {

    const actBox = qs('input[name="active"]');

    if (!checkReadyState(false) || !checkTimerStates()) {
        actBox.removeAttribute("checked");
        actBox.checked = false;
        Streaming.initTimer();
        return false;
    }

    if (element !== actBox) {
        actBox.checked = !actBox.checked;
    }

    SW_CONFIG.active = actBox.checked;
    localStorage.setItem('SW_CONFIG', JSON.stringify(SW_CONFIG));

    if (SW_CONFIG.active) {
        localStorage.setItem('SW_TIMER_START', "" + getTimestamp());
    }

    Streaming.initTimer();

    return true;
}


/**
 * @type {{hide(): void, change(string): void, show(string): void, setText(string): void}}
 */
const Loader = {
    /**
     * @param {string} text
     */
    show(text) {
        this.change('block');
        if (text) {
            this.setText(text);
        }
    },
    hide() {
        this.change('none');
        this.setText("");
    },
    /**
     * @param {string} text
     */
    setText(text) {
        qs('.loader.loader-text').dataset.text = "" + text;
    },
    /**
     * @param {string} state (block|none)
     */
    change(state) {
        qsa('.loader').forEach(el => {
            el.style.display = state;
        });
    }
}

/**
 *
 */
class Template {

    /**
     * @param {string} container
     */
    constructor(container) {

        this.template = qs(`template#${container}`);

        if (!this.template) {
            showInfo("Fehler", `Template "${container}" nicht gefunden.`, 'error');
            console.error(`Template "${container}" not found.`);
            return;
        }

        this.parsed = false;
        this.placeholder = {};
        this.content = this.template.innerHTML;
    }

    /**
     * @param {string} field
     * @param {string} value
     * @returns {Template}
     */
    set(field, value) {
        this.placeholder[field] = value;
        return this;
    }

    /**
     * @param {object} values
     * @returns {Template}
     */
    setMultiple(values) {
        let f;
        for (f in values) {
            this.set(f, values[f]);
        }
    }

    /**
     *
     */
    parse() {
        if (!this.parsed && Object.keys(this.placeholder).length) {
            replaceElementVars(this, 'content', this.placeholder);
            this.parsed = true;
        }
    }

    /**
     * @returns {string}
     */
    get() {
        this.parse();
        return this.content;
    }

}

let isLiveCheck;

/**
 * @returns {Promise<void>}
 */
async function init() {

    Loader.show(`Lade ${SW_TOOL_NAME} v${SW_VERSION_F}`);

    await obs.on("ExitStarted", () => {
        SceneBox.setReady(false);
        showLoadingError(true);
        clearInterval(isLiveCheck);
        obs.disconnect();
    });

    await obs.on("AuthenticationFailure", () => {
        showLoadingError(true);
    });

    await obs.on("CurrentProgramSceneChanged", data => {
        if (data.sceneName !== OBS_CURRENT_SCENE) {
            OBS_CURRENT_SCENE = data.sceneName;
            SceneBox.update();
        }
    });

    await obs.on("StreamStateChanged", data => {

        if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STARTED' && data.outputActive) {
            Streaming.state = true;
            Streaming.update();
        }
        if (data.outputState == 'OBS_WEBSOCKET_OUTPUT_STOPPED' && !data.outputActive) {
            Streaming.state = false;
            Streaming.update();

            SW_CONFIG.active = false;
            localStorage.setItem('SW_CONFIG', JSON.stringify(SW_CONFIG));

            qs('input[name="active"]').checked = false;
        }
    });

    await obs.on('Identified', () => {

        SceneBox.setReady(true);

        obs.on('SwitchScenes', (e) => {
            if (e["scene-name"] !== OBS_CURRENT_SCENE) {
                OBS_CURRENT_SCENE = e['scene-name'];
                SceneBox.update();
            }
        });

        obs.call('GetStreamStatus').then((data) => {
            if (data.outputActive) {
                Streaming.state = true;
                Streaming.update();
            }
        });

        isLiveCheck = setInterval(() => {
            Streaming.refreshStats();
        }, 3000);
        Streaming.refresh();

        OBS_CONNECTED = true;

    });

    await obs.on("SceneCreated", () => {
        Streaming.refresh();
    });

    try {
        await obs.connect(`ws://${switcher_config.host || 'localhost'}:${switcher_config.port}`, switcher_config.password.trim(), {
            rpcVersion: 1
        });
    } catch (error) {
        showLoadingError();
    }

    qsa('[data-action]').forEach(el => {
        return el.addEventListener(el.dataset.action, () => {
            switch (el.dataset.event) {
                default:
                    break;
                case 'auto-switch':
                    const sortables = qsa('.item-box.sortable input');
                    sortables.forEach(inp => {
                        if (el.checked) {
                            inp.setAttribute("disabled", true);
                        } else {
                            inp.removeAttribute("disabled");
                        }
                    });
                    break;
                case 'save-settings':
                    saveSettings();
                    break;
                case 'get-broadcaster':
                    if (!SW_CONFIG.token) {
                        showInfo('Fehler', 'Bitte erst einen Token eingeben.', 'error');
                        return;
                    }
                    let twName = prompt('Gib deinen Twitch-Usernamen ein');
                    if (twName && twName.length > 2) {
                        Twitch.getBroadcaster(twName);
                    }
                    break;
                case 'get-token':
                    open(TW_TOKEN_REQUEST_URL, '_blank');
                    break;
                case 'check-ready-state':
                    return toggleActiveButton(el);
                case 'clear-all':
                    if (confirm('Möchtest du alle Einstellungen, inklusive aller Angaben zu Spielen und Titel löschen?')) {
                        localStorage.clear();
                        showInfo('Erfolg', 'Alle Daten gelöscht', "success");
                        setTimeout(() => {
                            location.reload();
                        }, 3000);
                    }
                    break;
            }
        });
    });

    let sField;
    for (sField in SW_CONFIG) {
        setConfigField(sField, SW_CONFIG[sField]);
    }

    qsa('form').forEach(el => {
        el.addEventListener("submit", (e) => {
            e.preventDefault();
            return false;
        });
    });

    qs('input[name="token"]').addEventListener("change", function () {
        setSaveButtonState('saveSettings', 'add');
    });

    // Include patcher
    /*
    const pScript = ce('script', {
        src: `${SW_PATCH_URL}?` + Math.random(),
        async: true
    });
    const pScriptTarget = qsa("script")[0];
    pScriptTarget.parentNode.insertBefore(pScript, pScriptTarget);
     */
}

init().then(() => {
    setTimeout(Streaming.initTimer, 10);
});

// Replace html info (Title, Copyright, Date)
(function () {
    replaceElementVars(document, 'title', {tool_name: SW_TOOL_NAME, version: "v" + SW_VERSION_F});
    replaceElementVars(qs('header h3'), 'innerHTML', {
        tool_name: SW_TOOL_NAME,
        version: "v" + SW_VERSION_F
    });
    replaceElementVars(qs("footer .inner"), 'innerHTML', {year: "" + new Date().getFullYear()});

    // Debug
    document.querySelector('input[name="auto-switch"]').disabled = true;
    document.querySelector('input[name="auto-timeout"]').disabled = true;

}());

// if ( obs ) obs.disconnect();