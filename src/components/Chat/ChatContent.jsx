import React from 'react';
import MessagesList from './MessagesList';
import MessageInput from './MessageInput';

function ChatContent({
                         currentChat,
                         isDirectMessage,
                         messages,
                         currentUser,
                         newMessage,
                         onNewMessageChange,
                         onSendMessage,
                         onSendImage,
                         tab,
                         messagesEndRef,
                     }) {
    return (
        <div className="chat-content">
            {currentChat ? (
                <>
                    <div className="content-header">
                        <h2>{isDirectMessage ? `👤 ${currentChat}` : `🏠 ${currentChat}`}</h2>
                    </div>

                    <MessagesList
                        messages={messages}
                        currentUser={currentUser}
                        currentChat={currentChat}
                        messagesEndRef={messagesEndRef}
                    />

                    <MessageInput
                        newMessage={newMessage}
                        onNewMessageChange={onNewMessageChange}
                        onSendMessage={onSendMessage}
                        onSendImage={onSendImage}
                    />
                </>
            ) : (
                <div className="no-room-selected">
                    <p>
                        {tab === 'messages'
                            ? '👈 Select a person to start chat'
                            : '👈 Select or create a room to start chat'}
                    </p>
                </div>
            )}
        </div>
    );
}

export default ChatContent;
