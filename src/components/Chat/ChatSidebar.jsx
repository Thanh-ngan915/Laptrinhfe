import React from 'react';
import TabSection from './TabSection';
import ConversationsList from './ConversationsList';
import RoomsList from './RoomsList';
import CreateRoomForm from './CreateRoomForm';
import SearchBox from './SearchBox';

function ChatSidebar({
                         tab,
                         onTabChange,
                         conversations,
                         selectedUser,
                         onSelectUser,
                         rooms,
                         selectedRoom,
                         onSelectRoom,
                         searchTerm,
                         onSearchTermChange,
                         onSearchSubmit,
                         newRoomName,
                         onNewRoomNameChange,
                         onCreateRoom,
                         roomCreateError,
                         roomCreateSuccess,
                         onClearRoomMessages,
                         searchStatus,
                     }) {
    return (
        <div className="chat-sidebar">
            <TabSection
                tab={tab}
                onTabChange={onTabChange}
            />

            {tab === 'messages' && (
                <>
                    <SearchBox
                        placeholder="Search people..."
                        value={searchTerm}
                        onChange={onSearchTermChange}
                        onSubmit={onSearchSubmit}
                    />
                    {searchTerm && (
                        <div style={{ padding: '0 10px', marginBottom: '10px', fontSize: '13px' }}>
                            {searchStatus === 'checking' && (
                                <span style={{ color: '#999' }}>⏳ Đang kiểm tra...</span>
                            )}

                            {/* --- KHU VỰC HIỂN THỊ KẾT QUẢ TÌM KIẾM (GIAO DIỆN MỚI) --- */}
                            {searchTerm && searchStatus === 'exist' && (
                                <div
                                    className="search-result-item"
                                    onClick={() => {
                                        // Bấm vào là chọn người đó để chat luôn
                                        onSelectUser(searchTerm);
                                        // Tùy chọn: Xóa ô tìm kiếm sau khi chọn
                                        // onSearchTermChange('');
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 15px',
                                        cursor: 'pointer',
                                        backgroundColor: '#e3f2fd', // Màu nền xanh nhạt nổi bật
                                        borderRadius: '10px',
                                        marginTop: '10px',
                                        marginBottom: '10px',
                                        border: '1px solid #90caf9',
                                        transition: 'all 0.2s'
                                    }}
                                    // Hiệu ứng hover
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbdefb'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                                >
                                    {/* 1. AVATAR (Lấy chữ cái đầu làm avatar) */}
                                    <div style={{ position: 'relative', marginRight: '15px' }}>
                                        <div style={{
                                            width: '45px',
                                            height: '45px',
                                            borderRadius: '50%',
                                            backgroundColor: '#2196F3', // Màu xanh dương giống ảnh
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '18px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {searchTerm.charAt(0)}
                                        </div>

                                        {/* Chấm tròn xanh (Online Status) */}
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: '#4CAF50', // Màu xanh lá
                                            border: '2px solid white',
                                            position: 'absolute',
                                            bottom: '0',
                                            right: '0'
                                        }}></div>
                                    </div>

                                    {/* 2. THÔNG TIN (Tên + Trạng thái) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{
                        fontWeight: 'bold',
                        fontSize: '15px',
                        color: '#333'
                    }}>
                        {searchTerm}
                    </span>
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#4CAF50', // Chữ màu xanh lá
                                            fontWeight: '500'
                                        }}>
                        Active now
                    </span>
                                    </div>
                                </div>
                            )}

                            {/* Giữ lại thông báo lỗi nếu không tìm thấy */}
                            {searchTerm && searchStatus === 'not_found' && (
                                <div style={{ padding: '10px', color: 'red', fontSize: '13px', textAlign: 'center' }}>
                                    ❌ Không tìm thấy người dùng "{searchTerm}"
                                </div>
                            )}
                        </div>
                    )}
                    <ConversationsList
                        conversations={conversations}
                        selectedUser={selectedUser}
                        onSelectUser={onSelectUser}
                    />
                </>
            )}

            {tab === 'rooms' && (
                <>
                    <SearchBox
                        placeholder="Search rooms..."
                        value={searchTerm}
                        onChange={onSearchTermChange}
                        onSubmit={onSearchSubmit}
                    />
                    <CreateRoomForm
                        newRoomName={newRoomName}
                        onNewRoomNameChange={onNewRoomNameChange}
                        onCreateRoom={onCreateRoom}
                        roomCreateError={roomCreateError}
                        roomCreateSuccess={roomCreateSuccess}
                        onClearMessages={onClearRoomMessages}
                    />
                    <RoomsList
                        rooms={rooms}
                        selectedRoom={selectedRoom}
                        onSelectRoom={onSelectRoom}
                    />
                </>
            )}
        </div>
    );
}

export default ChatSidebar;
