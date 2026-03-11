import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Ammentiespage({ size, onBack, onSendBedrooms }) {
  const [bedrooms, setBedrooms] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const bedroomOptions = ['1', '2', '3', '4', '5', '6+'];

  const handleSendBedrooms = () => {
    if (!isCustomMode) return;
    if (!bedrooms.trim()) return;
    onSendBedrooms(bedrooms.trim());
  };

  const handleBedroomClick = (item, index) => {
    if (index === 5) {
      setIsCustomMode(true);
      setBedrooms('');
      return;
    }

    setIsCustomMode(false);
    setBedrooms(item);
    onSendBedrooms(item);
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 05 of 10</span>
          <span>50%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "50%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              Got it! What's the total size in square feet?
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {size}
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
              Excellent! How many bedrooms does it have?
            </div>
          </div>

          <div className="bedroomOptions">
            {bedroomOptions.map((item, index) => (
              <button
                key={item}
                className={`bedroomChip ${(bedrooms === item || (index === 5 && isCustomMode)) ? 'activeBedroomChip' : ''}`}
                onClick={() => handleBedroomClick(item, index)}
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
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            placeholder={isCustomMode ? "Write..." : "Select 6+ to enable"}
            disabled={!isCustomMode}
          />
          <button className="sendBtn" aria-label="Send bedrooms" onClick={handleSendBedrooms}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ammentiespage;
