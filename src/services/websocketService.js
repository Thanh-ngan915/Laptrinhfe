class WebSocketService {
    constructor() {
        this.ws = null;
        this.url = 'wss://chat.longapp.site/chat/chat';
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.attemptReconnect = this.attemptReconnect.bind(this);
        this.connect = this.connect.bind(this);
        // --------------------------------
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                resolve();
                return;
            }

            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('✓ Kết nối WebSocket thành công!');
                this.reconnectAttempts = 0;
                resolve();
                // --- THÊM ĐOẠN NÀY: Báo ra ngoài là đã OPEN ---
                if (this.listeners['OPEN']) {
                    this.listeners['OPEN'].forEach(cb => cb());
                }
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event);
            };

            this.ws.onclose = () => {
                console.log('Kết nối đã đóng. Đang gọi reconnect...');
                if (this.listeners['CLOSE']) {
                    this.listeners['CLOSE'].forEach(cb => cb());
                }
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error("WS Error", err);
                // reject(err);
            };
        });
    }

    handleMessage(event) {
        try {
            const raw = JSON.parse(event.data);

            if (raw.action === 'error') return;

            let eventKey = null;
            let normalized = raw;

            if (raw && raw.action === 'onchat' && raw.data && typeof raw.data === 'object' && 'event' in raw.data) {
                eventKey = raw.data.event;
                normalized = {
                    event: eventKey,
                    status: raw.status || raw.data.status,
                    mes: raw.mes || raw.data.mes,
                    data: raw.data.data
                };
            } else if (raw && (raw.event || raw.action)) {
                eventKey = raw.event || raw.action;
            }

            if (eventKey && this.listeners[eventKey]) {
                this.listeners[eventKey].forEach(cb => {
                    try { cb(normalized); } catch (e) { console.error(e); }
                });
            }

            if (this.listeners['*']) {
                this.listeners['*'].forEach(cb => cb(raw));
            }
        } catch (error) {
            console.error('Lỗi parse message:', error);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Thử kết nối lại... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect().catch(err => console.log("Reconnect failed:", err));
            }, 3000);
        } else {
            console.log("Đã thử kết nối lại quá số lần quy định.");
        }
    }

    send(action, data = {}) {
        if (!(this.ws && this.ws.readyState === WebSocket.OPEN)) return;

        const chatEvents = new Set([
            'REGISTER', 'LOGIN', 'RE_LOGIN', 'LOGOUT', 'CREATE_ROOM', 'JOIN_ROOM',
            'GET_ROOM_CHAT_MES', 'GET_PEOPLE_CHAT_MES', 'SEND_CHAT', 'CHECK_USER', 'GET_USER_LIST',
            'CHECK_USER_ONLINE', 'CHECK_USER_EXIST'
        ]);

        let messageToSend;
        if (action === 'onchat') {
            messageToSend = { action: 'onchat', data: data };
        } else if (chatEvents.has(action)) {
            messageToSend = { action: 'onchat', data: { event: action, data: data } };
        } else {
            messageToSend = { action: action, data: data };
        }

        console.log(`📤 Gửi:`, messageToSend);
        this.ws.send(JSON.stringify(messageToSend));
    }

    on(action, callback) {
        if (!this.listeners[action]) this.listeners[action] = [];
        this.listeners[action].push(callback);
    }

    off(action, callback) {
        if (!this.listeners[action]) return;
        if (!callback) delete this.listeners[action];
        else this.listeners[action] = this.listeners[action].filter(cb => cb !== callback);
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

const websocketService = new WebSocketService();
export default websocketService;