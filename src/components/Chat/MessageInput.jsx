import React from 'react';

function MessageInput({ newMessage, onNewMessageChange, onSendMessage }) {
  return (
    <form className="message-input-form" onSubmit={onSendMessage}>
      <input
        type="text"
        placeholder="Type message..."
        value={newMessage}
        onChange={(e) => onNewMessageChange(e.target.value)}
        className="message-input"
      />
      <button type="submit" className="btn-send">
        📤 Send
      </button>
    </form>
  );
}

export default MessageInput;
