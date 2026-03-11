import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Propertysize({ price, onBack, onSendSize }) {
  const [sizeValue, setSizeValue] = useState('1500');
  const [sizeUnit, setSizeUnit] = useState('Marla');
  const sizeUnits = ['Square Feet ( Sq. Ft.)', 'Square Meters ( Sq. M.)', 'Square Yards ( Sq. Yd.)', 'Marla', 'Kanal'];

  const handleSendSize = () => {
    if (!sizeValue.trim()) return;
    onSendSize(sizeValue.trim(), sizeUnit);
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 04 of 10</span>
          <span>40%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "40%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Perfect! What's the listing price?
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {price}
            </div>
            <div className="userIconWrap">
              <FaRegUser className="userTypeIcon" size={25} />
            </div>
          </div>

          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Got it! What's the total size in square feet?
            </div>
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>

        <div className="addressInputWrap sizeInputWrap">
          <select
            className="sizeUnitSelect"
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value)}
          >
            {sizeUnits.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="addressInput sizeValueInput"
            value={sizeValue}
            onChange={(e) => setSizeValue(e.target.value)}
            placeholder="Write size..."
          />
          <button className="sendBtn" aria-label="Send size" onClick={handleSendSize}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Propertysize;
