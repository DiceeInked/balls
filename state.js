(function () {
    const CHANNEL_NAME = 'balls-world-state';
    const STORAGE_KEY = 'balls-world-state';

    function createBridge() {
        const channel = typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel(CHANNEL_NAME)
            : null;

        function publish(state) {
            const snapshot = JSON.parse(JSON.stringify(state));

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            } catch (_) {}

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
