/**
 * WebSocket Service - Quản lý kết nối và giao tiếp với server
 * 
 * Cách hoạt động:
 * 1. Khởi tạo kết nối WebSocket tới server
 * 2. Gửi/nhận các events (đăng ký, tạo room, gửi tin nhắn, v.v.)
 * 3. Lắng nghe các sự kiện từ server
 */

class WebSocketService {
    constructor() {
        this.ws = null;
        this.url = 'wss://chat.longapp.site/chat/chat';
        this.listeners = {}; // Lưu các hàm callback
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Kết nối WebSocket và setup listeners
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // If already connected, resolve immediately
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    console.log('WebSocket already connected');
                    resolve();
                    return;
                }

                this.ws = new WebSocket(this.url);

                // Khi kết nối thành công
                this.ws.onopen = () => {
                    console.log('✓ Kết nối WebSocket thành công!');
                    this.reconnectAttempts = 0;
                    resolve();
                };

                // Khi nhận được message từ server
                this.ws.onmessage = (event) => {
                    try {
                        const raw = JSON.parse(event.data);
                        console.log('📨 Nhận từ server:', raw);

                        // Normalize server message formats:
                        // 1) Wrapped: { action: 'onchat', data: { event: 'EVENT', data: {...} } }
                        // 2) Flat: { event: 'EVENT', status: 'success', data: {...} }
                        // 3) Others: fallback to passing raw
                        let eventKey = null;
                        let payload = null;
                        let normalized = null;

                        if (raw && raw.action === 'onchat' && raw.data && typeof raw.data === 'object' && 'event' in raw.data) {
                            eventKey = raw.data.event;
                            payload = raw.data.data;
                            normalized = {
                                event: eventKey,
                                status: raw.status || (payload && payload.status) || raw.data.status || undefined,
                                mes: raw.mes || (payload && payload.mes) || undefined,
                                data: payload
                            };
                        } else if (raw && (raw.event || raw.action)) {
                            eventKey = raw.event || raw.action;
                            normalized = raw;
                        }

                        // Deliver to specific listener if exists
                        if (eventKey && this.listeners[eventKey]) {
                            try { this.listeners[eventKey](normalized); } catch (err) { console.error('Listener error', err); }
                        }

                        // Also deliver to 'onchat' listener if someone subscribed directly
                        if (raw && raw.action && this.listeners[raw.action]) {
                            try { this.listeners[raw.action](raw); } catch (err) { console.error('Listener error', err); }
                        }

                        // Wildcard listener receives raw for full context
                        if (this.listeners['*']) {
                            try { this.listeners['*'](raw); } catch (err) { console.error('Wildcard listener error', err); }
                        }
                    } catch (error) {
                        console.error('Lỗi parse message:', error);
                    }
                };

                // Khi có lỗi
                this.ws.onerror = (error) => {
                    console.error('❌ Lỗi WebSocket:', error);
                    reject(error);
                };

                // Khi kết nối đóng
                this.ws.onclose = () => {
                    console.log('Kết nối đã đóng');
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Thử kết nối lại
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Thử kết nối lại... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), 3000);
        }
    }

    /**
     * Gửi message tới server
     * @param {string} action - Tên action (LOGIN, REGISTER, SEND_CHAT, v.v.)
     * @param {object} data - Dữ liệu gửi đi
     */
    send(action, data = {}) {
        if (!(this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.error('WebSocket chưa kết nối!');
            return;
        }

        // Một số action của server yêu cầu wrapper: { action: 'onchat', data: { event: '<EVENT>', data: {...} } }
        const chatEvents = new Set([
            'REGISTER', 'LOGIN', 'RE_LOGIN', 'LOGOUT', 'CREATE_ROOM', 'JOIN_ROOM',
            'GET_ROOM_CHAT_MES', 'GET_PEOPLE_CHAT_MES', 'SEND_CHAT', 'CHECK_USER', 'GET_USER_LIST'
        ]);

        let messageToSend;
        if (action === 'onchat') {
            // caller already provided full wrapper
            messageToSend = Object.assign({ action: 'onchat' }, { data: data });
        } else if (chatEvents.has(action)) {
            messageToSend = {
                action: 'onchat',
                data: {
                    event: action,
                    data: data
                }
            };
        } else {
            // default fallback: send as-is
            messageToSend = {
                action: action,
                data: data
            };
        }

        console.log('📤 Gửi tới server:', messageToSend);
        this.ws.send(JSON.stringify(messageToSend));
    }

    /**
     * Lắng nghe một event cụ thể
     * @param {string} action - Tên event cần lắng nghe
     * @param {function} callback - Hàm được gọi khi nhận event
     */
    on(action, callback) {
        this.listeners[action] = callback;
    }

    /**
     * Bỏ lắng nghe một event
     * @param {string} action - Tên event
     */
    off(action) {
        delete this.listeners[action];
    }

    /**
     * Đóng kết nối WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * Kiểm tra trạng thái kết nối
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Create instance and export (ESLint prefers assigning before export)
const websocketService = new WebSocketService();
export default websocketService;
