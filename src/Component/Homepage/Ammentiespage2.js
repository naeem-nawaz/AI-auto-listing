import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Ammentiespage2({ bedrooms, onBack, onSendBathrooms }) {
  const [bathrooms, setBathrooms] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const bathroomOptions = ['1', '2', '3', '4', '5', '6+'];

  const handleBathroomClick = (item, index) => {
    if (index === 5) {
      setIsCustomMode(true);
      setBathrooms('');
      return;
    }

    setIsCustomMode(false);
    setBathrooms(item);
    onSendBathrooms(item);
  };

  const handleSendBathrooms = () => {
    if (!isCustomMode) return;
    if (!bathrooms.trim()) return;
    onSendBathrooms(bathrooms.trim());
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 06 of 10</span>
          <span>60%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "60%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Excellent! How many bedrooms does it have?
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {bedrooms}
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
              And how many bathrooms?
            </div>
          </div>

          <div className="bedroomOptions">
            {bathroomOptions.map((item, index) => (
              <button
                key={item}
                className={`bedroomChip ${(bathrooms === item || (index === 5 && isCustomMode)) ? 'activeBedroomChip' : ''}`}
                onClick={() => handleBathroomClick(item, index)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>

        <div className="addressInputWrap">
          <input
            type="text"
            className="addressInput"
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
            placeholder={isCustomMode ? "Write..." : "write..."}
            disabled={!isCustomMode}
          />
          <button className="sendBtn" aria-label="Send bathrooms" onClick={handleSendBathrooms}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ammentiespage2;
