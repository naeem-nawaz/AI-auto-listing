import React, { useState } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { FaRegUser } from "react-icons/fa";
import { LuSend } from "react-icons/lu";

function Ammentiespage4({ feature, onBack, onSendFeature, onDoneFeatures }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState(feature || '');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const featureOptions = ['Parking', 'Pool', 'Gym', 'Garden', 'Balcony', 'Security'];

  const handleFeatureClick = (item) => {
    if (item === 'Done with Features') {
      setIsCustomMode(true);
      setSelectedFeature(item);
      setNotes('');
      return;
    }

    setIsCustomMode(false);
    setSelectedFeature(item);
    if (onSendFeature) onSendFeature(item);
  };

  const handleSend = () => {
    if (isCustomMode && notes.trim()) {
      if (onSendFeature) onSendFeature(notes.trim());
    }
    if (onDoneFeatures) onDoneFeatures();
  };

  return (
    <div className="propertyPage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent">
        <div className="progressHeader">
          <span>Step 08 of 10</span>
          <span>80%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "80%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble featuresQuestionBubble">
              Almost done! What features does this property have? (Select all that apply)
            </div>
          </div>

          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              {feature || selectedFeature}
            </div>
            <div className="userIconWrap">
              <FaRegUser className="userTypeIcon" size={25} />
            </div>
          </div>

          <div className="chatRow">
            <div className="bot">
              <img src={img2} alt="Assistant icon" />
            </div>
            <div className="chatBubble questionBubble featuresQuestionBubble">
              Great! I've added {feature || selectedFeature || 'this feature'}. Select more features or click "Done with Features" to continue.
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
          <button className="sendBtn" aria-label="Send note" onClick={handleSend}>
            <LuSend />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ammentiespage4;
