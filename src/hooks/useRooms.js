import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import websocketService from '../services/websocketService';
import { addRoom, addJoinedRoom, setRoomCreateSuccess, setRoomCreateError, setMessages, setSelectedRoom } from '../redux/slices/chatSlice';

const useRooms = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Xử lý khi tạo phòng thành công
        const handleRoomCreation = (data) => {
            if (data?.status === 'error') {
                const err = data?.mes || data?.message || data?.data?.mes || 'Tạo phòng thất bại';
                dispatch(setRoomCreateError(err));
                return;
            }
            if (data?.status !== 'error') {
                // Hỗ trợ nhiều dạng payload:
                // 1) { data: { name: 'room' } }
                // 2) { name: 'room' }
                // 3) normalized object
                const maybe = data?.data ?? data;
                const roomName = maybe?.name || maybe;
                // Nếu roomName là object (do server shape unexpected), try to extract string
                const finalName = typeof roomName === 'string' ? roomName : (roomName?.name || roomName?.toString?.() || undefined);
                if (finalName) {
                    dispatch(addRoom({ name: finalName }));
                    // Thông báo thành công cho UI
                    dispatch(setRoomCreateSuccess(`Tạo phòng "${finalName}" thành công`));
                    // Tự động join vào phòng vừa tạo
                    websocketService.send('JOIN_ROOM', { name: finalName });
                }
            }
        };

        websocketService.on('CREATE_ROOM', handleRoomCreation);

        // Xử lý khi đã join vào phòng (server trả về room info + chatData)
        const handleJoinRoom = (data) => {
            const payload = data?.data ?? data;
            const name = payload?.name || payload?.room;
            if (name) {
                const roomName = name.toString().trim();
                dispatch(addRoom({ name: roomName }));
                dispatch(addJoinedRoom(roomName));
                dispatch(setSelectedRoom({ name: roomName }));

                // Nạp lịch sử chat nếu server trả về chatData
                const history = payload?.chatData || payload?.data;
                if (Array.isArray(history)) {
                    dispatch(setMessages(history));
                }
            }
        };

        websocketService.on('JOIN_ROOM', handleJoinRoom);

        return () => {
            websocketService.off('CREATE_ROOM', handleRoomCreation);
            websocketService.off('JOIN_ROOM', handleJoinRoom);
        };
    }, [dispatch]);
};

export default useRooms;