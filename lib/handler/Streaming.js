/**
 *
 */
let switchTimerRun = 0;
class StreamingHandler {

    constructor() {
        this._state = false;
        this._stateBox = qs('#stream-status');
        this._statsBox = qs('#stream-infos');
    }

    /**
     * @param {string} scene
     */
    setNextScene(scene) {

    }

    /**
     * TODO: Find a way to get valid next scene
     */
    initTimer() {

        const sceneFields = qsa('input[data-field="scene-timeout"]');

        if (!SW_CONFIG.active || !checkReadyState(false)) {

            clearInterval(switchTimerRun);

            sceneFields.forEach(el => {
                el.removeAttribute("disabled");
            });

            return;
        }

        sceneFields.forEach(el => {
            el.setAttribute("disabled", true);
        });

        const _self = this;
        const startTime = Number(localStorage.getItem('SW_TIMER_START'));

        switchTimerRun = setInterval(function () {

            qsa(`[data-action="timer"]`).forEach(el => {
                el.innerText = '00:00';
            });

            const tNow = getTimestamp();
            const sceneField = qs(`input[data-field="scene-timeout"][data-active="true"]:first-child`);

            const time = sceneField.value * 60;
            const tDiff = time - (tNow - startTime);

            const oTimer = qs(`[data-action="timer"][data-scene="${sceneField.dataset.scene}"]`);
            oTimer.innerText = formatTime(tDiff);

            if(tDiff <= 0) {
                oTimer.innerText = '00:00';
                _self.setNextScene(sceneField.dataset.scene);
            }

        }, 500);
    }

    /**
     * @param {boolean} state
     */
    set state(state) {
        this._state = state;
    }

    /**
     * @returns {boolean}
     */
    get state() {
        return this._state;
    }

    /**
     *
     */
    refresh() {

        obs.call('GetSceneList').then(data => {

            if (!OBS_SCENES.length) {
                SceneBox.set(data);
                SceneBox.draw();
                DragDrop.draw();
            }
        });

        this.refreshStats();
    }

    /**
     * Update Infos like fps, cpuUsage a.s.o
     */
    refreshStats() {
        obs.callBatch([
            {
                requestType: "GetStreamStatus"
            }, {
                requestType: "GetStats"
            }
        ]).then(res => {
            let outData = {
                cpuUsage: 0,
                memoryUsage: 0,
                activeFps: 0,
                outputSkippedFrames: 0,
                numDroppedFrames: 0
            };
            res.forEach(req => {
                if (typeof req.responseData != "undefined") {
                    for (let idx in outData) {
                        if (typeof req.responseData[idx] != "undefined") {
                            outData[idx] = req.responseData[idx];
                        }
                    }
                }
            });
            Streaming.updateInfo(outData);
        });
    }

    /**
     * @param {object} data
     */
    updateInfo(data) {

        if (!this.state) {
            return;
        }

        qsa('[data-type="stream-info"]').forEach(el => {
            let sField = el.getAttribute("data-field");
            if (typeof data[sField] !== "undefined") {
                if (sField === "outputDuration") {
                    // el.innerText = this.formatTime(data[sField]);
                } else if (sField == 'memoryUsage' || sField == 'cpuUsage' || sField == 'activeFps') {
                    el.innerText = Number(data[sField]).toFixed(1) + ((sField === "cpuUsage") ? '%' : '');
                } else {
                    el.innerText = data[sField];
                }
            }
        });
    }

    /**
     *
     */
    update() {

        this._stateBox.innerText = (this.state) ? 'Online' : 'Offline';

        if (this.state) {
            if (!this._stateBox.classList.contains("online")) {
                this._stateBox.classList.remove('offline');
                this._stateBox.classList.add('online');
            }
            this._statsBox.style.display = "block";
        } else {
            if (!this._stateBox.classList.contains("offline")) {
                this._stateBox.classList.remove('online');
                this._stateBox.classList.add('offline');
            }
            this._statsBox.style.display = "none";
        }

        this.initTimer();
    }
}

const Streaming = new StreamingHandler();