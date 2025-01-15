import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import websocketService from '../services/websocketService';
import { addRoom, addJoinedRoom, setRoomCreateSuccess, setRoomCreateError, setMessages, setSelectedRoom } from '../redux/slices/chatSlice';

const useRooms = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const handleRoomCreation = (data) => {
            if (data?.status === 'error') {
                const err = data?.mes || data?.message || data?.data?.mes || 'Tạo phòng thất bại';
                dispatch(setRoomCreateError(err));
                return;
            }
            if (data?.status !== 'error') {
                const maybe = data?.data ?? data;
                const roomName = maybe?.name || maybe;
                const finalName = typeof roomName === 'string' ? roomName : (roomName?.name || roomName?.toString?.() || undefined);
                if (finalName) {
                    dispatch(addRoom({ name: finalName }));
                    dispatch(setRoomCreateSuccess(`Tạo phòng "${finalName}" thành công`));
                    websocketService.send('JOIN_ROOM', { name: finalName });
                }
            }
        };

        websocketService.on('CREATE_ROOM', handleRoomCreation);

        const handleJoinRoom = (data) => {
            const payload = data?.data ?? data;
            const name = payload?.name || payload?.room;
            if (name) {
                const roomName = name.toString().trim();
                dispatch(addRoom({ name: roomName }));
                dispatch(addJoinedRoom(roomName));
                dispatch(setSelectedRoom({ name: roomName }));

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