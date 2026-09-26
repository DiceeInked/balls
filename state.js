(function () {
    const CHANNEL_NAME = 'balls-world-state';
    const STORAGE_KEY = 'balls-world-state';
    const STORAGE_INTERVAL_MS = 250;
    let lastStorageWrite = 0;

    function createBridge() {
        const channel = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel(CHANNEL_NAME)
            : null;

        function publish(state) {
            const snapshot = JSON.parse(JSON.stringify(state));
            const now = Date.now();

            if (now - lastStorageWrite >= STORAGE_INTERVAL_MS) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
                    lastStorageWrite = now;
                } catch (_) {}
            }

            if (channel) {
                channel.postMessage(snapshot);
            }
        }

        function subscribe(handler) {
            if (!channel) return () => {};
            const listener = event => handler(event.data);
            channel.addEventListener('message', listener);
            return () => channel.removeEventListener('message', listener);
        }

        function getLastSnapshot() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (_) {
                return null;
            }
        }

        return { publish, subscribe, getLastSnapshot };
    }

    window.WorldStateBridge = createBridge();
})();
