import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import websocketService from '../services/websocketService';
import { setMessages, addMessage } from '../redux/slices/chatSlice';

const useMessages = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Xử lý khi nhận danh sách tin nhắn cũ (GET_ROOM_CHAT_MES)
        const handleMessages = (data) => {
            // Chấp nhận nhiều cấu trúc trả về khác nhau từ server
            const payload = data?.data ?? data;
            const candidates = [
                payload,
                payload?.chatData,
                payload?.list,
                payload?.messages,
                payload?.data,
                payload?.data?.chatData,
            ].filter(Array.isArray);

            const firstArray = candidates.length ? candidates[0] : null;
            if (firstArray) {
                dispatch(setMessages(firstArray));
            }
        };

        // Đăng ký sự kiện lấy danh sách tin nhắn
        websocketService.on('GET_ROOM_CHAT_MES', handleMessages);

        // Đăng ký sự kiện có tin nhắn mới tới
        websocketService.on('SEND_CHAT', (data) => {
            // Data trả về đôi khi nằm trong data.data hoặc trực tiếp trong data
            const raw = data.data || data;

            // Chuẩn hóa lại message để đảm bảo có các field: from, mes, time, to, type
            const msg = (typeof raw === 'string') ? { mes: raw, time: new Date().toLocaleTimeString() } : {
                from: raw.from || raw.user || raw.sender || raw.name || 'Unknown',
                mes: raw.mes || raw.message || raw.msg || raw.text || (typeof raw === 'string' ? raw : ''),
                time: raw.createAt || raw.create_at || raw.time || raw.t || raw.timestamp || new Date().toLocaleTimeString(),
                to: raw.to,
                type: raw.type || (raw.room ? 'room' : (raw.to ? 'people' : undefined)),
            };

            dispatch(addMessage(msg));
        });

        return () => {
            websocketService.off('GET_ROOM_CHAT_MES', handleMessages);
            // Không off SEND_CHAT để duy trì nhận tin realtime
        };
    }, [dispatch]);
};

export default useMessages;
