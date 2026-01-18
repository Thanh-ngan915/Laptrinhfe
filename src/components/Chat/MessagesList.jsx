import React from 'react';

function MessagesList({ messages, currentUser, currentChat, messagesEndRef }) {

    const renderContent = (msgContent) => {
        if (!msgContent) return null;

        if (msgContent.includes("/video/upload/") || msgContent.match(/\.(mp4|mov|avi|wmv|flv|webm)$/i)) {
            return (
                <video controls style={{ maxWidth: '300px', borderRadius: '10px', marginTop: '5px' }}>
                    <source src={msgContent} />
                    Trình duyệt không hỗ trợ thẻ video.
                </video>
            );
        }

        if (msgContent.match(/\.(mp3|wav|ogg)$/i)) {
            return (
                <audio controls style={{ maxWidth: '250px', marginTop: '5px' }}>
                    <source src={msgContent} />
                </audio>
            );
        }

        if (
            msgContent.includes("/image/upload/") ||
            msgContent.match(/\.(jpeg|jpg|gif|png|webp)$/i) ||
            msgContent.startsWith('data:image')
        ) {
            return (
                <img
                    src={msgContent}
                    alt="chat-media"
                    style={{
                        maxWidth: '200px',
                        maxHeight: '300px',
                        borderRadius: '10px',
                        marginTop: '5px',
                        cursor: 'pointer'
                    }}
                    onClick={() => window.open(msgContent)}
                />
            );
        }

        return <p className="message-text">{msgContent}</p>;
    };

    return (
        <div className="messages-container">
            {messages.length === 0 ? (
                <div className="no-messages">
                    <p>Start conversation with {currentChat}</p>
                </div>
            ) : (
                messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message ${msg.from === currentUser.name ? 'own' : 'other'}`}
                    >
                        <div className="message-bubble">
                            <p className="message-from">{msg.from}</p>

                            {renderContent(msg.mes || msg)}

                            <p className="message-time">
                                {msg.time || new Date().toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessagesList;
