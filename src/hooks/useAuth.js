
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import websocketService from '../services/websocketService';
import { setIsAuthenticated } from '../redux/slices/chatSlice';

const useAuth = (currentUser) => {
    const dispatch = useDispatch();

    useEffect(() => {
        // Phải có username và (pass hoặc reLoginCode) mới thử xác thực
        const username = currentUser?.name || currentUser?.user || currentUser?.ebmail;
        const password = currentUser?.password;
        const reLoginCode = currentUser?.reLoginCode;
        if (!username || (!password && !reLoginCode)) return;

        // 1. Xử lý phản hồi xác thực (LOGIN hoặc RE_LOGIN) ,cb
        const handleAuthResponse = (data) => {
            const isSuccess = data?.status === 'success';
            const isAlreadyLoggedIn = data?.mes === 'You are already logged in';
            const isReLoginEvent = data?.event === 'RE_LOGIN';

            if (isSuccess || isReLoginEvent || isAlreadyLoggedIn) {
                console.log('✅ Đăng nhập/Xác thực thành công!');
                dispatch(setIsAuthenticated(true));//gửi action lưu trạng thái đn
            } else {
                console.warn('⚠️ Đăng nhập thất bại:', data);
            }
        };

        // 2.chủ động gửi yêu cầu xác thực khi kết nối mở
        const performAuth = () => {
            if (websocketService.ws?.readyState === WebSocket.OPEN) {
                if (reLoginCode) {
                    console.log('🔄 Gửi gói RE_LOGIN bằng code...');
                    websocketService.send('RE_LOGIN', {
                        user: username,
                        code: reLoginCode,
                    });
                } else {
                    console.log('🔄 Gửi gói LOGIN bằng mật khẩu...');
                    websocketService.send('LOGIN', {
                        user: username,
                        pass: password,
                    });
                }
            } else {
                websocketService.connect();
            }
        };

        //đk sk
        websocketService.on('LOGIN', handleAuthResponse);
        websocketService.on('RE_LOGIN', handleAuthResponse);
        websocketService.on('OPEN', performAuth);//khi sk mở tự động gọi

        // Thử ngay nếu socket đã mở sẵn
        if (websocketService.ws?.readyState === WebSocket.OPEN) {
            performAuth();
        }

        // Cleanup
        return () => {
            websocketService.off('LOGIN', handleAuthResponse);
            websocketService.off('RE_LOGIN', handleAuthResponse);
            websocketService.off('OPEN', performAuth);
        };
    }, [currentUser?.user, currentUser?.name, currentUser?.email, currentUser?.password, currentUser?.reLoginCode, dispatch]);// effect phụ thuộc vào thông tin ng dùng
};

export default useAuth;