/**
 *
 */
class SceneBoxHandler {

    /**
     *
     */
    constructor() {
        this.scenesBlock = qs('#scenes');
        this._lastGameBox = null;
    }

    /**
     * @param {object} data
     */
    set(data) {
        if (data) {
            this.data = data;
            OBS_CURRENT_SCENE = data["currentProgramSceneName"];
        }
    }

    /**
     * @param {object} data
     * @param {string} current
     */
    add(data, current) {

        const template = new Template('scene-box');

        template.setMultiple({
            'name': data.name,
            'game_id': parseInt(data.game_id) || "",
            'game': data.game || "",
            'title': data.title || "",
            'active': (data.name === current) ? 'active' : '',
            'game_placeholder': (data.game_id > 0) ? `${data.game} (ID: ${data.game_id})` : 'Optional: Spiel',
            'has_entry': (data.game_id > 0) ? `has-entry` : ''
        });

        this.scenesBlock.innerHTML += template.get();
    }

    /**
     * @param {string} content
     */
    setContent(content) {
        this.scenesBlock.innerHTML = content;
    }

    draw() {

        const self = this;

        let currentData = JSON.parse(localStorage.getItem('OBS_DATA'));

        this.scenesBlock.innerHTML = "";
        this.scenesBlock.classList.remove("error");

        this.data.scenes.forEach(scene => {
            if (currentData && typeof currentData[scene.sceneName] != "undefined") {
                OBS_SCENES[scene.sceneName] = currentData[scene.sceneName];
            } else {
                OBS_SCENES[scene.sceneName] = {
                    name: scene.sceneName,
                    title: "",
                    game: "",
                    game_id: ""
                };
            }
            this.add(OBS_SCENES[scene.sceneName], this.data["currentProgramSceneName"]);
        });

        DragDrop.init();

        qsa('input[name="title[]"]').forEach(el => {
            el.addEventListener("change", () => {
                setSaveButtonState('saveSettings', 'add');
            });
        });

        function twitchGameHandler(event) {
            Twitch.getGameList(event);
        }

        qsa('input[name="game[]"]').forEach((el) => {

            el.removeEventListener("keyup", twitchGameHandler);
            el.addEventListener("keyup", twitchGameHandler);

            el.addEventListener("focus", (e) => {

                if (self._lastGameBox && self._lastGameBox.getAttribute("game-data-id") === "") {
                    self._lastGameBox.value = "";
                }

                GameBox.remove();

                self._lastGameBox = e.target;
            });
        });
    }

    // Set active css class
    setActive() {
        qsa('.item-box[data-scene]').forEach(el => {
            el.classList[el.dataset.scene === OBS_CURRENT_SCENE ? 'add' : 'remove']('active');
        });
    }

    update() {

        // Set active css class
        this.setActive();

        const scene = OBS_SCENES[OBS_CURRENT_SCENE];

        if (SW_CONFIG.active && (scene.title !== "" || scene.game_id)) {
            Twitch.update(scene.game_id, scene.game, scene.title);
        }
    }

    /**
     * @param {boolean} bState
     */
    setReady(bState) {

        qsa('.formElements').forEach(el => {
            el.style.display = (bState) ? "block" : 'none';
        });

        this.scenesBlock.classList[bState ? "add" : "remove"]("list-grid");

        Loader.hide();
    }
}

SceneBox = new SceneBoxHandler();