import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { LuSend } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";

function Ammentiespage3({ bathrooms, onBack, onSendFeatures }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const featureOptions = ['Parking', 'Pool', 'Gym', 'Garden', 'Balcony', 'Security'];

  const handleFeatureClick = (feature) => {
    if (feature === 'Done with Features') {
      setIsCustomMode(true);
      setSelectedFeature(feature);
      setNotes('');
      return;
    }

    setIsCustomMode(false);
    setSelectedFeature(feature);
    if (onSendFeatures) onSendFeatures(feature);
  };

  const handleSendCustomFeature = () => {
    if (!isCustomMode) return;
    if (!notes.trim()) return;
    if (onSendFeatures) onSendFeatures(notes.trim());
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 07 of 10</span>
          <span>70%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "70%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble">
              And how many bathrooms?
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {bathrooms}
            </div>
            <div className="userIconWrap">
              <FaRegUser className="userTypeIcon" size={25} />
            </div>
          </div>

          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble featuresQuestionBubble" style={{width:"873px"}}>
              Almost done! What features does this property have? (Select all that apply)
            </div>
          </div>

          <div className="featureOptions">
            {featureOptions.map((item) => (
              <button
                key={item}
                className={`featureChip ${selectedFeature === item ? 'activeFeatureChip' : ''}`}
                onClick={() => handleFeatureClick(item)}
              >
                {item}
              </button>
            ))}
            <button
              className={`featureChip doneFeatureChip ${isCustomMode ? 'activeFeatureChip' : ''}`}
              onClick={() => handleFeatureClick('Done with Features')}
            >
              Done with Features
            </button>
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>

        <div className="addressInputWrap">
          <input
            type="text"
            className="addressInput"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isCustomMode ? "Write..." : "Select last button to enable"}
            disabled={!isCustomMode}
          />
          <button className="sendBtn" aria-label="Send note" onClick={handleSendCustomFeature}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ammentiespage3;
