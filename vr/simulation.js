/* Authoritative VR simulation foundation.
 * Step 1 owns world state only. Rendering and input must treat this state as the source of truth.
 */
(function () {
    class VRWorldState {
        constructor() {
            this.version = 1;
            this.worldTime = 0;
            this.nextEntityId = 1;

            this.entities = new Map();
            this.metaballs = [];
            this.spikes = [];
            this.glitches = [];

            this.player = {
                id: this.allocateEntityId(),
                type: 'player',
                x: 0,
                y: 0,
                z: 0,
                heading: 0,
                xp: 16,
                captured: false
            };

            this.bounds = {
                width: 0,
                height: 0
            };

            this.dirty = false;
            this.lastMutation = 0;
            this.entities.set(this.player.id, this.player);
        }

        allocateEntityId() {
            return this.nextEntityId++;
        }

        register(entity, type) {
            if (!entity.id) entity.id = this.allocateEntityId();
            entity.type = type;
            entity.remove = false;
            this.entities.set(entity.id, entity);
            this.dirty = true;
            return entity;
        }

        unregister(entity) {
            if (!entity || !entity.id) return;
            this.entities.delete(entity.id);
            this.dirty = true;
        }

        setBounds(width, height) {
            this.bounds.width = Math.max(0, width);
            this.bounds.height = Math.max(0, height);
        }

        advanceTime(deltaSeconds) {
            if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
            this.worldTime += deltaSeconds;
        }

        markDirty() {
            this.dirty = true;
        }

        snapshot() {
            return {
                version: this.version,
                worldTime: this.worldTime,
                nextEntityId: this.nextEntityId,
                bounds: { ...this.bounds },
                player: { ...this.player },
                entityCount: this.entities.size
            };
        }
    }

    window.VRWorldState = VRWorldState;
    window.VRWorld = new VRWorldState();
})();
