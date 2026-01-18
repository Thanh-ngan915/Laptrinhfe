class WebSocketService {
    constructor() {
        this.ws = null;
        this.url = 'wss://chat.longapp.site/chat/chat';
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;

        this.attemptReconnect = this.attemptReconnect.bind(this);
        this.connect = this.connect.bind(this);
    }
    // kết nối
    connect() {
        return new Promise((resolve, reject) => {
            // tránh tạo trùng
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                resolve();
                return;
            }
            // tạo ws
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('✓ Kết nối WebSocket thành công!');
                this.reconnectAttempts = 0;// đếm số lần reconnect thành công
                resolve();
                if (this.listeners['OPEN']) {
                    this.listeners['OPEN'].forEach(cb => cb());
                }
            };
            this.ws.onmessage = (event) => {
                this.handleMessage(event);// sử lí message
            };

            this.ws.onclose = () => {
                console.log('Kết nối đã đóng. Đang gọi reconnect...');
                if (this.listeners['CLOSE']) {
                    this.listeners['CLOSE'].forEach(cb => cb());// báo cho UI biết đã đóng
                }
                this.attemptReconnect();// tự động reconnect
            };

            this.ws.onerror = (err) => {
                console.error("WS Error", err);
                // reject(err);
            };
        });
    }
    // xử lí message(sẻver gửi về)
    handleMessage(event) {
        try {
            const raw = JSON.parse(event.data);
            // bỏ qua lỗi
            if (raw.action === 'error') return;
            // chuẩn hóa message
            let eventKey = null;
            let normalized = raw;

            // Logic chuẩn hóa message
            if (raw && raw.action === 'onchat' && raw.data && typeof raw.data === 'object' && 'event' in raw.data) {
                eventKey = raw.data.event;
                const payload = (raw.data && typeof raw.data === 'object') ? (raw.data.data ?? raw.data) : raw.data;
                normalized = {
                    event: eventKey,
                    status: raw.status || payload?.status || raw.data?.status,
                    mes: raw.mes || payload?.mes || raw.data?.mes,
                    data: payload?.data ?? payload
                };
            } else if (raw && (raw.event || raw.action)) {
                eventKey = raw.event || raw.action;
            }
            //sk và nhừn cb dk lắng nghe sk
            if (eventKey && this.listeners[eventKey]) {
                this.listeners[eventKey].forEach(cb => {
                    try { cb(normalized); } catch (e) { console.error(e); }
                });
            }
            // lắng nghe tất cả, trả về dl gốc
            if (this.listeners['*']) {
                this.listeners['*'].forEach(cb => cb(raw));
            }
        } catch (error) {
            console.error('Lỗi parse message:', error);
        }
    }

    // tự động reconnect
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
    // gửi message từ client lên server,formart chuẩn
    send(action, data = {}) {
        if (!(this.ws && this.ws.readyState === WebSocket.OPEN)) return;

        const chatEvents = new Set([
            'REGISTER', 'LOGIN', 'RE_LOGIN', 'LOGOUT', 'CREATE_ROOM', 'JOIN_ROOM',
            'GET_ROOM_CHAT_MES', 'GET_PEOPLE_CHAT_MES', 'SEND_CHAT', 'CHECK_USER', 'GET_USER_LIST',
            'CHECK_USER_ONLINE', 'CHECK_USER_EXIST'
        ]);

        let messageToSend; // biến gửi đi , formart để gửi lên server
        if (action === 'onchat') {
            messageToSend = { action: 'onchat', data: data };
        } else if (chatEvents.has(action)) {
            messageToSend = { action: 'onchat', data: { event: action, data: data } };
        } else {
            messageToSend = { action: action, data: data };
        }

        console.log(`📤 Gửi:`, messageToSend);
        this.ws.send(JSON.stringify(messageToSend));//ws chỉ nhấn string
    }
    //dk
    on(action, callback) {
        if (!this.listeners[action]) this.listeners[action] = [];
        this.listeners[action].push(callback);
    }
    //hủy đk
    off(action, callback) {
        if (!this.listeners[action]) return;// k có listeners thì thôi
        if (!callback) delete this.listeners[action];// k truyền callback
        else this.listeners[action] = this.listeners[action].filter(cb => cb !== callback);//chia bỏ callback cụ thể
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }
}

const websocketService = new WebSocketService();
export default websocketService;