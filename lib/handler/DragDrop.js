/**
 *
 */
class DragDropHandler {

    /**
     *
     */
    constructor() {
        this.dragItem = null;
        this.dropZone = null;
    }

    init() {

        const self = this;

        this.dropZone = qs('.dropzone');

        qsa('.draggable').forEach(el => {
            el.addEventListener("dragstart", function (event) {

                event.dataTransfer.effectAllowed = "move";
                self.dragItem = this;

                el.addEventListener("dragend", function () {
                    self.dragItem = null;
                });
            });
        });

        // Important, or drop will not respond
        this.dropZone.addEventListener('dragover', function (event) {
            event.preventDefault();
        });

        this.dropZone.addEventListener('drop', function () {
            if (self.dragItem) {
                const sceneName = self.dragItem.dataset.scene;

                self.addScene({name: sceneName, is_active: 1}, false);
                self.dragItem = null;
            }
        });
    }

    draw() {
        const self = this;

        SW_SWITCH_SCENES = localStorage.getItem('SW_SWITCH_SCENES');
        if (!SW_SWITCH_SCENES) {
            return;
        }

        SW_SWITCH_SCENES = JSON.parse(SW_SWITCH_SCENES);

        if (SW_SWITCH_SCENES.length) {
            SW_SWITCH_SCENES.sort((a, b) => (a.pos < b.pos) ? 1 : -1).forEach(scene => {
                self.addScene(scene, true, false, false);
            });
        }

        SceneBox.setActive();
    }

    rebind() {

        const self = this;

        // Rebind delete buttons
        qsa('.dropzone .sortable [data-action="delete-switch-scene"]').forEach(el => {
            el.addEventListener("click", function deleteHandler() {
                el.removeEventListener("click", deleteHandler);
                DragDrop.deleteScene(el.dataset.scene);
            });
        });
        qsa('.dropzone .sortable [name="is_active[]"]').forEach(el => {
            el.addEventListener("change", function activeChange() {
                el.removeEventListener("change", activeChange);
                self.updateData();
            })
        });
        qsa('.dropzone .sortable [name="timeout[]"]').forEach(el => {
            el.addEventListener("keyup", function timeoutChange() {
                el.removeEventListener("keyup", timeoutChange);
                // const sceneName = el.dataset.scene;
                setSaveButtonState('saveSettings', 'add');
            })
        });
    }

    /**
     *
     */
    updateData() {

        /**
         * @param el
         * @param timeout
         */
        function setActiveState(el, timeout) {
            timeout.dataset.active = el.target.checked;
        }

        (async function () {

            SW_SWITCH_SCENES = [];
            let i = 0;

            qsa('.dropzone .sortable').forEach(el => {

                const sceneName = el.dataset.scene
                    , is_active = qs(`.sortable[data-scene="${sceneName}"] [name="is_active[]"]`)
                ;

                const oTimeout = qs(`.sortable[data-scene="${sceneName}"] .timeout`);
                let timeout = oTimeout.value;

                if (timeout < 1) {
                    timeout = 0;
                } else if (timeout > 120) {
                    timeout = 120;
                }

                SW_SWITCH_SCENES.push({
                    name: el.dataset.scene,
                    timeout: timeout,
                    is_active: (is_active) ? (is_active.checked ? 1 : 0) : 0,
                    pos: i++
                });

                if (is_active) {

                    is_active.removeEventListener("change", function (e) {
                        setActiveState(e, oTimeout);
                    });
                    is_active.addEventListener("change", function (e) {
                        setActiveState(e, oTimeout);
                    });

                    oTimeout.dataset.active = is_active.checked;
                }

            });

        }()).then(() => {
            localStorage.setItem('SW_SWITCH_SCENES', JSON.stringify(SW_SWITCH_SCENES));
        });
    }

    /**
     *
     * @param scene
     * @param bInit
     */
    addScene(scene, bInit) {

        let sceneExists = qs(`.dropzone div[data-scene="${scene.sceneName}"]`);

        if (sceneExists) {
            return;
        }

        const template = new Template('scene-setup');
        template.setMultiple({
            name: scene.name,
            timeout: scene.timeout || 0,
            pos: scene.pos || 0,
            is_active: scene.is_active ? 'checked' : '',
            ttActive: scene.is_active ? 'true' : 'false',
            active: '',
            added_new: (!bInit) ? 'added-new' : '',
            disabled: qs('[name="auto-switch"]').checked ? 'disabled' : ''
        });

        this.dropZone.innerHTML = template.get() + this.dropZone.innerHTML;

        if (!bInit) {
            this.updateData();
            setTimeout(function () {
                const as = qs(`[data-scene="${scene.sceneName}"].added-new`);
                if (as) {
                    as.classList.remove("added-new");
                }
            }, 1490);
        }

        // Make dropzone sortable
        this.enableDragSort();
        this.rebind();

        SceneBox.setActive();
    }

    handleSortDrag(item) {

        const selectedItem = item.target,
            list = selectedItem.parentNode,
            x = item.clientX,
            y = item.clientY;

        selectedItem.classList.add('drag-sort-active');
        let swapItem = document.elementFromPoint(x, y) === null ? selectedItem : document.elementFromPoint(x, y);

        if (list === swapItem.parentNode) {
            swapItem = swapItem !== selectedItem.nextSibling ? swapItem : swapItem.nextSibling;
            list.insertBefore(selectedItem, swapItem);
        }
    }

    handleSortDrop(item) {
        item.target.classList.remove('drag-sort-active');
        DragDrop.updateData();
    }

    enableDragSort() {
        const self = this;
        const sortList = qsa('.sortable');
        if (sortList.length) {
            Array.prototype.map.call(sortList, (item) => {
                item.ondrag = self.handleSortDrag;
                item.ondragend = self.handleSortDrop;
            });
        }
    }

    /**
     * @param sceneName
     */
    deleteScene(sceneName) {
        const scene = qs(`.dropzone .sortable[data-scene="${sceneName}"]`);
        if (scene) {
            scene.remove();
            this.updateData();
        }
    }
}

const DragDrop = new DragDropHandler();