import React from 'react';
import assistantIcon from '../../images/div.png';
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

export function UserMessage({ children }) {
  return (
    <div className="chatRow userRow">
      <div className="chatBubble userTypeBubble">{children}</div>
      <div className="userIconWrap">
        <FaRegUser className="userTypeIcon" size={25} />
      </div>
    </div>
  );
}
