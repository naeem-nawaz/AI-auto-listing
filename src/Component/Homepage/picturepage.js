import React, { useRef } from 'react';
import bg from '../../images/bg.jpg';
import img2 from '../../images/div.png';
import { FaRegUser } from "react-icons/fa";
import { LuUpload, LuPlus } from "react-icons/lu";

function Picturepage({ feature, images, onBack, onAddMoreImages, onContinue }) {
  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (onAddMoreImages) onAddMoreImages(files);
  };

  return (
    <div className="propertyPage picturePage">
      <img src={bg} alt="Background pattern" className="propertyBg" />

      <div className="propertyContent pictureContent">
        <div className="progressHeader">
          <span>Step 10 of 10</span>
          <span>100%</span>
        </div>

        <div className="progressTrack">
          <div className="progressFill" style={{ width: "100%" }}></div>
        </div>

        <div className="chatBlock">
          <div className="chatRow userRow">
            <div className="chatBubble userTypeBubble">
              Done with Features
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
              Great! I've added {feature || 'Security'}. Select more features or click "Done with Features" to continue.
            </div>
          </div>
        </div>

        <button className="backBtn" aria-label="Go back" onClick={onBack}>‹</button>

        <div className="picturePanel">
          <input
            ref={fileInputRef}
            type="file"
            className="hiddenUploadInput"
            accept=".png,.jpg,.jpeg,.gif"
            multiple
            onChange={handleFileChange}
          />

          <button className="uploadArea pictureUploadArea" onClick={openFilePicker}>
            <span className="uploadIconWrap">
              <LuUpload />
            </span>
            <span className="uploadText">Click to upload or drag and drop</span>
            <span className="uploadHint">PNG, JPG, GIF up to 10MB</span>
          </button>

          <div className="imageGrid">
            {images.map((item, index) => (
              <div key={`${item}-${index}`} className="imageCard">
                <img src={item} alt={`Uploaded ${index + 1}`} className="imageThumb" />
                {index === 0 && <span className="mainBadge">Main</span>}
              </div>
            ))}

            <button className="imageCard addImageCard" onClick={openFilePicker}>
              <LuPlus />
              <span>Add more</span>
            </button>
          </div>

          <button className="continueBtn" onClick={onContinue}>Continue & Preview</button>
        </div>
      </div>
    </div>
  );
}

export default Picturepage;
