
/**
 *
 */
class TwitchHandler {

    constructor() {
        this.lastSearch = "";
    }

    /**
     * @returns {*}
     * @private
     */
    _getHeaders() {
        return {
            'Authorization': 'Bearer ' + SW_CONFIG.token,
            'Client-Id': TW_CLIENT_ID,
            'Content-Type': 'application/json'
        };
    }

    /**
     * @param {object} data
     * @returns {boolean}
     * @private
     */
    _authError(data) {
        if (data.error && data.status === 401) {
            Loader.hide();
            showInfo("Fehler", "Offenbar ist das TOKEN abgelaufen. Fordere bitte ein neues an.", "error");
            return true;
        }
        return false;
    }

    /**
     * @param {Element} el
     * @param {string} query
     * @private
     */
    _searchGame(el, query) {

        if (!checkReadyState(true)) {
            Loader.hide();
            return;
        }

        const self = this,
            params = `query=${encodeURIComponent(query)}&first=5`;

        fetch(`${TW_API_URL}/search/categories?${params}`, {
            method: 'GET',
            headers: this._getHeaders()
        }).then(function (response) {
            return response.text();
        }).then(function (data) {
            if (data) {
                data = JSON.parse(data);
                if (self._authError(data)) {
                    return;
                }
                if (data.data && data.data.length) {
                    data.data.forEach(game => {
                        TW_GAMES[game.name] = game.id;
                    });
                    GameBox.show(el, data.data);
                }
                Loader.hide();
            }
        });
    }

    /**
     * @param {object} event
     */
    getGameList(event) {

        if (TW_GAMES_SEARCHING) {
            clearTimeout(TW_GAMES_SEARCHING);
        }

        if (event.key === 'Tab' || event.key === "Enter" || event.key === " ") {
            return;
        }

        const self = this;

        TW_GAMES_SEARCHING = setTimeout(function () {
            const query = event.target.value.trim();
            if (query.length > 2 && query !== self.lastSearch) {
                Loader.show("Suche Spiel...");
                self._searchGame(event.target, query);
                self.lastSearch = query;
            }
        }, 800);
    }

    /**
     * @param {string} name
     */
    getBroadcaster(name) {

        if (!name || name.length < 3 || /[^a-z0-9\-_]/ig.test(name)) {
            showInfo('Fehler', 'Ungültiger Twitch-name', 'error');
            return;
        }

        const self = this;

        Loader.show("Ermittle Twitch-Userdaten...");

        fetch(`${TW_API_URL}/users?login=` + encodeURIComponent(name), {
            method: 'GET',
            headers: this._getHeaders()
        }).then(function (response) {
            Loader.hide();
            return response.text();
        }).then(function (data) {
            if (data) {
                data = JSON.parse(data);

                if (self._authError(data)) {
                    return;
                }

                if (!data.data || !data.data[0] || !data.data[0].id) {
                    showInfo("Fehler", "Twitch-User nicht gefunden.", "error");
                    return;
                }
                data = {
                    id: parseInt(data.data[0].id),
                    name: data.data[0]["display_name"].trim()
                };

                setConfigField("broadcaster", data);
                setSaveButtonState('saveSettings', 'add');
            }
        });
    }

    /**
     *
     * @param {int} game_id
     * @param {string} game
     * @param {string} title
     */
    update(game_id, game, title) {

        // Do nothing if streaming is offline
        if (!Streaming.state || !SW_CONFIG.active || !SW_CONFIG.broadcaster || !SW_CONFIG.broadcaster.id) {
            return;
        }

        let postData = {
            game_id: game_id,
            broadcaster_language: "de"
        };

        if (title && title.length > 0) {
            postData.title = title.substring(0, 140);
        }

        fetch(`${TW_API_URL}/channels?broadcaster_id=${SW_CONFIG.broadcaster.id}`, {
            method: 'PATCH',
            headers: this._getHeaders(),
            body: JSON.stringify(postData)
        }).then(() => {

            let sText = 'Szenenwechsel erkannt';

            if (game_id) {
                sText += `. Kategorie: "${game}"`
            }
            if (title) {
                sText += `. Titel: "${title}"`
            }

            showInfo('Info', `${sText}.`, 'info');
        });
    }

}

const Twitch = new TwitchHandler();