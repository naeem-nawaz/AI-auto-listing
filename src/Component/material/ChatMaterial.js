import React from 'react';
import assistantIcon from '../../images/div.png';
import { LuPencil } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

export function BotMessage({ children, bubbleClassName = 'questionBubble', bubbleStyle }) {
  const bubbleClass = bubbleClassName ? `chatBubble ${bubbleClassName}` : 'chatBubble';

  return (
    <div className="chatRow">
      <div className="bot">
        <img src={assistantIcon} alt="Assistant icon" />
      </div>
      <div className={bubbleClass} style={bubbleStyle}>
        {children}
      </div>
    </div>
  );
}

export function UserMessage({
  children,
  onEditStart,
  isEditing = false,
  editValue = '',
  onEditValueChange,
  onEditCancel,
  onEditSubmit,
  isSendDisabled = false,
}) {
  return (
    <div className="chatRow userRow">
      <div className="userMessageWrap">
        {isEditing ? (
          <div className="userMessageEditPanel">
            <textarea
              className="userMessageEditInput"
              value={editValue}
              onChange={(event) => onEditValueChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  onEditSubmit?.();
                }
              }}
            />
            <div className="userMessageEditActions">
              <button type="button" className="userMessageEditCancelBtn" onClick={onEditCancel}>Cancel</button>
              <button
                type="button"
                className="userMessageEditSendBtn"
                onClick={onEditSubmit}
                disabled={isSendDisabled}
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="chatBubble userTypeBubble">{children}</div>
        )}

        {!isEditing && onEditStart && (
          <button
            type="button"
            className="userMessageEditBtn"
            onClick={onEditStart}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onEditStart?.();
              }
            }}
            aria-label="Edit this message"
          >
            <LuPencil size={14} />
          </button>
        )}
      </div>
      <div className="userIconWrap">
        <FaRegUser className="userTypeIcon" size={25} />
      </div>
    </div>
  ); 
}
