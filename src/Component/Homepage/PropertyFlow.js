import React, { useEffect, useRef, useState } from 'react';
import logo from '../../images/14.png';
import bg from '../../images/bg.jpg';
import assistantIcon from '../../images/div.png';
import {
  LuBath,
  LuBedDouble,
  LuCheck,
  LuMapPin,
  LuPlus,
  LuRuler,
  LuSend,
  LuSparkles,
  LuUpload,
} from "react-icons/lu";
import { BotMessage, UserMessage } from '../material/ChatMaterial';
import PropertyLayout from '../material/PropertyLayout';
import OptionTabs from '../material/OptionTabs';
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  COMMERCIAL_PROPERTY_TYPES,
  FEATURE_OPTIONS,
  HOME_PROPERTY_TYPES,
  PLOT_PROPERTY_TYPES,
  PRICE_OPTIONS,
  PROPERTY_TYPE_GROUPS,
  PURPOSE_OPTIONS,
  SIZE_UNITS,
} from '../material/materialData';

function formatPriceWithRs(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^rs\b/i.test(trimmed)) {
    return trimmed.replace(/^rs\b\.?/i, 'Rs');
  }
  return `Rs ${trimmed}`;
}

function getFeatureText(features) {
  if (Array.isArray(features) && features.length) return features.join(', ');
  if (typeof features === 'string' && features.trim()) return features;
  return 'Security';
}

function normalizeApiBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

function getNumericPrice(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits || '0';
}

function mapPurposeToSlug(purpose) {
  const slug = String(purpose || '').trim().toLowerCase();
  if (slug === 'rent') return 'rent';
  if (slug === 'lease') return 'lease';
  return 'sell';
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getStoredAuthUser() {
  const possibleKeys = [
    'user',
    'authUser',
    'currentUser',
    'loginUser',
    'signupUser',
    'profile',
    'agent_user',
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeParseJson(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  }

  return null;
}

function normalizePakistanPhone(phoneValue) {
  const digits = String(phoneValue || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) return digits;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits;
}

function isValidPakistanMobile(phoneValue) {
  return /^03\d{9}$/.test(String(phoneValue || '').trim());
}

function toApiPakistanPhone(phoneValue) {
  const digits = String(phoneValue || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('3') && digits.length === 10) return `+92${digits}`;
  return '';
}

function pickFirstValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return '';
}

function getContactFromUser(user) {
  const storagePhoneKeys = [
    'contact_number',
    'phone',
    'mobile',
    'contact',
    'phone_number',
    'whatsapp',
    'whatsapp_number',
    'user_phone',
    'signup_phone',
    'login_phone',
  ];

  const directStoragePhone = pickFirstValue(
    Object.fromEntries(
      storagePhoneKeys.map((key) => [key, localStorage.getItem(key) || sessionStorage.getItem(key)])
    ),
    storagePhoneKeys
  );

  const userSources = [user, user?.user, user?.data, user?.data?.user, user?.profile];
  let userPhone = '';
  for (const source of userSources) {
    if (!source || typeof source !== 'object') continue;
    userPhone = pickFirstValue(source, storagePhoneKeys);
    if (userPhone) break;
  }

  const normalized = normalizePakistanPhone(userPhone || directStoragePhone);
  return isValidPakistanMobile(normalized) ? normalized : '';
}

function getEmailFromUser(user) {
  if (!user || typeof user !== 'object') return '';
  return String(user.email || user.user_email || '').trim();
}

function getDisplayNameFromUser(user) {
  const nameKeys = ['name', 'full_name', 'username', 'user_name', 'first_name'];
  const directStorageName = pickFirstValue(
    Object.fromEntries(
      nameKeys.map((key) => [key, localStorage.getItem(key) || sessionStorage.getItem(key)])
    ),
    nameKeys
  );

  const userSources = [user, user?.user, user?.data, user?.data?.user, user?.profile];
  let userName = '';
  for (const source of userSources) {
    if (!source || typeof source !== 'object') continue;
    userName = pickFirstValue(source, nameKeys);
    if (userName) break;
  }

  return String(userName || directStorageName || '').trim();
}

function ListingModePage({ onAiListing, onManualListing }) {
  return (
    <div className="listingModePage">
      <img src={bg} alt="Background pattern" className="pageBg" />
      <div className="listingModeWrap">
        <div className="listingModeHeader">
          <h1>Choose How You Want to Create Your Property Listing</h1>
          <h4>
            Post your property manually or let our AI guide you step-by-step through a smart, conversational process.
            Select your preferred method to continue and get your listing live faster.
          </h4>
        </div>

        <div className="listingModeCards">
          <div className="listingModeCard manualCard">
            <div className="listingModeCardText">
              <h3>Manual Listing</h3>
              <h4>Write articles on any topic instantly.</h4>
            </div>
            <button className="listingCardBtn" onClick={onManualListing}>Click here</button>
          </div>

          <div className="listingModeCard aiCard">
            <div className="listingModeCardText">
              <h3>AI based Listing</h3>
              <h4>Analyze data with AI-driven insights.</h4>
            </div>
            <button className="listingCardBtn lightBtn" onClick={onAiListing}>Click here</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomePage({ onStart, welcomeName }) {
  return (
    <div className="page">
      <img src={bg} alt="Background pattern" className="pageBg" />
      <div className="data">
        <div className="image">
          <img src={logo} alt="Logo" />
        </div>
        <h1>Welcome, {welcomeName || 'John'}</h1>
        <p>
          Not sure where to begin? Our smart assistant will ask simple questions <br />
          to create your listing.
        </p>
        <div className="layout">
          <div className="bot">
            <img src={assistantIcon} alt="Assistant icon" />
          </div>
          <div className="assistant">
            <p>👋 Hello! I&apos;m your AI property listing assistant. I&apos;ll help you create a professional listing in simple steps.</p>
          </div>
        </div>
        <button className="btn" onClick={onStart}>
          <span className="btnIcon"><LuSparkles /></span>
          Start Creating
        </button>
      </div>
    </div>
  );
}

function PropertyTypePage({ onSelectPropertyType, onBack }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const subTypeMap = {
    Home: HOME_PROPERTY_TYPES,
    Plots: PLOT_PROPERTY_TYPES,
    Commercial: COMMERCIAL_PROPERTY_TYPES,
  };
  const currentSubOptions = subTypeMap[selectedGroup] || [];

  return (
    <PropertyLayout stepText="Step 01 of 10" progressPercent={10} onBack={onBack}>
      <div className="chatBlock">
        <BotMessage>What type of property would you like to list?</BotMessage>
        <OptionTabs
          options={PROPERTY_TYPE_GROUPS}
          containerClassName="propertyGroupOptions"
          getButtonClassName={(item) => {
            if (!selectedGroup) return 'propertyGroupChip';
            return `propertyGroupChip ${selectedGroup === item ? 'activePropertyGroupChip' : 'inactivePropertyGroupChip'}`;
          }}
          onOptionClick={(item) => setSelectedGroup(item)}
        />
        {selectedGroup && (
          <OptionTabs
            options={currentSubOptions}
            containerClassName="propertySubTypeOptions"
            buttonClassName="propertySubTypeChip"
            onOptionClick={(item) => onSelectPropertyType(item)}
          />
        )}
      </div>
    </PropertyLayout>
  );
}

function PurposePage({ onSelectPurpose, onBack }) {
  return (
    <PropertyLayout stepText="Step 01 of 10" progressPercent={10} showProgress={false} onBack={onBack}>
      <div className="chatBlock">
        <BotMessage bubbleClassName="">
          👋 Hello! I&apos;m your AI property listing assistant. I&apos;ll help you create a professional listing in just a few simple steps. Let&apos;s get started!
        </BotMessage>
        <BotMessage>What is the purpose of the property?</BotMessage>
        <div className="purposeOptionsWrap">
          <OptionTabs
            options={PURPOSE_OPTIONS}
            containerClassName="purposeOptions"
            buttonClassName="purposeChip"
            onOptionClick={(item) => onSelectPurpose(item)}
          />
        </div>
      </div>
    </PropertyLayout>
  );
}

function AddressPage({ selectedPropertyType, onBack, onSendAddress }) {
  const [address, setAddress] = useState('123 Main St, Downtown');
  return (
    <PropertyLayout
      stepText="Step 02 of 10"
      progressPercent={20}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input className="addressInput" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Type address..." />
          <button className="sendBtn" aria-label="Send address" onClick={() => onSendAddress(address)}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>What type of property would you like to list?</BotMessage>
        <UserMessage>{selectedPropertyType}</UserMessage>
        <BotMessage>Great choice! Where is this property located?</BotMessage>
      </div>
    </PropertyLayout>
  );
}

function PricePage({ address, onBack, onSelectPrice }) {
  const [priceInput, setPriceInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const handlePriceButtonClick = (price) => {
    if (price === 'Custom Price') return setIsCustomMode(true);
    setIsCustomMode(false);
    setPriceInput('');
    onSelectPrice(price);
  };
  return (
    <PropertyLayout
      stepText="Step 03 of 10"
      progressPercent={30}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input
            className="addressInput"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder={isCustomMode ? "Write custom price..." : "Select Custom Price to enable"}
            disabled={!isCustomMode}
          />
          <button className="sendBtn" onClick={() => isCustomMode && priceInput.trim() && onSelectPrice(priceInput.trim())}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>Where is this property located?</BotMessage>
        <UserMessage>{address}</UserMessage>
        <BotMessage>Perfect! What&apos;s the listing price?</BotMessage>
        <OptionTabs
          options={PRICE_OPTIONS}
          containerClassName="priceOptions"
          getButtonClassName={(item) => `priceChip ${item === 'Custom Price' && isCustomMode ? 'activePriceChip' : ''}`}
          onOptionClick={(item) => handlePriceButtonClick(item)}
        />
      </div>
    </PropertyLayout>
  );
}

function SizePage({ price, onBack, onSendSize }) {
  const [sizeValue, setSizeValue] = useState('1500');
  const [sizeUnit, setSizeUnit] = useState('Marla');
  return (
    <PropertyLayout
      stepText="Step 04 of 10"
      progressPercent={40}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap sizeInputWrap">
          <div className="sizeInputField">
            <input
              className="addressInput sizeValueInput"
              value={sizeValue}
              onChange={(e) => setSizeValue(e.target.value)}
              placeholder="Enter the value"
            />
            <select className="sizeUnitSelect" value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)}>
              {SIZE_UNITS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <button className="sendBtn" onClick={() => sizeValue.trim() && onSendSize(sizeValue.trim(), sizeUnit)}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>Perfect! What&apos;s the listing price?</BotMessage>
        <UserMessage>{price}</UserMessage>
        <BotMessage>Got it! What&apos;s the total size?</BotMessage>
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage({ size, onBack, onSendBedrooms }) {
  const [value, setValue] = useState('');
  const [custom, setCustom] = useState(false);
  const handleClick = (item, index) => {
    if (index === 5) return setCustom(true);
    setCustom(false);
    setValue(item);
    onSendBedrooms(item);
  };
  return (
    <PropertyLayout
      stepText="Step 05 of 10"
      progressPercent={50}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input className="addressInput" value={value} onChange={(e) => setValue(e.target.value)} disabled={!custom} placeholder={custom ? "Write..." : "Select 6+ to enable"} />
          <button className="sendBtn" onClick={() => custom && value.trim() && onSendBedrooms(value.trim())}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>Got it! What&apos;s the total size?</BotMessage>
        <UserMessage>{size}</UserMessage>
        <BotMessage>How many bedrooms?</BotMessage>
        <OptionTabs
          options={BEDROOM_OPTIONS}
          containerClassName="bedroomOptions"
          getButtonClassName={(item, index) => `bedroomChip ${(value === item || (index === 5 && custom)) ? 'activeBedroomChip' : ''}`}
          onOptionClick={(item, index) => handleClick(item, index)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage2({ bedrooms, onBack, onSendBathrooms }) {
  const [value, setValue] = useState('');
  const [custom, setCustom] = useState(false);
  const handleClick = (item, index) => {
    if (index === 5) return setCustom(true);
    setCustom(false);
    setValue(item);
    onSendBathrooms(item);
  };
  return (
    <PropertyLayout
      stepText="Step 06 of 10"
      progressPercent={60}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input className="addressInput" value={value} onChange={(e) => setValue(e.target.value)} disabled={!custom} placeholder={custom ? "Write..." : "Select 6+ to enable"} />
          <button className="sendBtn" onClick={() => custom && value.trim() && onSendBathrooms(value.trim())}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>How many bedrooms?</BotMessage>
        <UserMessage>{bedrooms}</UserMessage>
        <BotMessage>And how many bathrooms?</BotMessage>
        <OptionTabs
          options={BATHROOM_OPTIONS}
          containerClassName="bedroomOptions"
          getButtonClassName={(item, index) => `bedroomChip ${(value === item || (index === 5 && custom)) ? 'activeBedroomChip' : ''}`}
          onOptionClick={(item, index) => handleClick(item, index)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage3({ bathrooms, onBack, onSendFeatures }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [custom, setCustom] = useState(false);
  const handleFeatureClick = (item) => {
    if (item === 'Done with Features') return setCustom(true);
    setCustom(false);
    setSelectedFeature(item);
    onSendFeatures(item);
  };
  return (
    <PropertyLayout
      stepText="Step 07 of 10"
      progressPercent={70}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input className="addressInput" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!custom} placeholder={custom ? "Write..." : "Select last button to enable"} />
          <button className="sendBtn" onClick={() => custom && notes.trim() && onSendFeatures(notes.trim())}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage>And how many bathrooms?</BotMessage>
        <UserMessage>{bathrooms}</UserMessage>
        <BotMessage bubbleClassName="questionBubble featuresQuestionBubble">Almost done! What features does this property have?</BotMessage>
        <OptionTabs
          options={[...FEATURE_OPTIONS, 'Done with Features']}
          containerClassName="featureOptions"
          getButtonClassName={(item) => {
            const isDone = item === 'Done with Features';
            const isActive = isDone ? custom : selectedFeature === item;
            return `featureChip ${isDone ? 'doneFeatureChip' : ''} ${isActive ? 'activeFeatureChip' : ''}`.trim();
          }}
          onOptionClick={(item) => handleFeatureClick(item)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage4({ feature, onBack, onSendFeature, onDoneFeatures }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState(feature || '');
  const [custom, setCustom] = useState(false);

  const handleFeatureClick = (item) => {
    if (item === 'Done with Features') {
      setCustom(true);
      setSelectedFeature(item);
      return;
    }
    setCustom(false);
    setSelectedFeature(item);
    onSendFeature(item);
  };

  const handleSend = () => {
    if (custom && notes.trim()) {
      onSendFeature(notes.trim());
    }
    onDoneFeatures();
  };

  return (
    <PropertyLayout
      stepText="Step 08 of 10"
      progressPercent={80}
      onBack={onBack}
      footer={(
        <div className="addressInputWrap">
          <input
            className="addressInput"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!custom}
            placeholder={custom ? "Write..." : "Select last button to enable"}
          />
          <button className="sendBtn" onClick={handleSend}><LuSend /></button>
        </div>
      )}
    >
      <div className="chatBlock">
        <BotMessage bubbleClassName="questionBubble featuresQuestionBubble">
          Almost done! What features does this property have? (Select all that apply)
        </BotMessage>
        <UserMessage>{feature || selectedFeature}</UserMessage>
        <BotMessage bubbleClassName="questionBubble featuresQuestionBubble">
          Great! I&apos;ve added {feature || selectedFeature || 'this feature'}. Select more features or click "Done with Features" to continue.
        </BotMessage>
        <OptionTabs
          options={[...FEATURE_OPTIONS, 'Done with Features']}
          containerClassName="featureOptions"
          getButtonClassName={(item) => {
            const isDone = item === 'Done with Features';
            const isActive = isDone ? custom : selectedFeature === item;
            return `featureChip ${isDone ? 'doneFeatureChip' : ''} ${isActive ? 'activeFeatureChip' : ''}`.trim();
          }}
          onOptionClick={(item) => handleFeatureClick(item)}
        />
      </div>
    </PropertyLayout>
  );
}

function UploadPage({ features, onBack, onUploadComplete }) {
  const fileInputRef = useRef(null);
  return (
    <PropertyLayout stepText="Step 09 of 10" progressPercent={90} onBack={onBack}>
      <div className="chatBlock">
        <BotMessage bubbleClassName="questionBubble featuresQuestionBubble">Great! I&apos;ve added {getFeatureText(features)}.</BotMessage>
        <UserMessage>{getFeatureText(features)}</UserMessage>
      </div>
      <div className="uploadAreaWrap">
        <input
          ref={fileInputRef}
          type="file"
          className="hiddenUploadInput"
          accept=".png,.jpg,.jpeg,.gif"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onUploadComplete(files);
          }}
        />
        <button className="uploadArea" onClick={() => fileInputRef.current?.click()}>
          <span className="uploadIconWrap"><LuUpload /></span>
          <span className="uploadText">Click to upload or drag and drop</span>
          <span className="uploadHint">PNG, JPG, GIF up to 10MB</span>
        </button>
      </div>
    </PropertyLayout>
  );
}

function PicturePage({ features, images, onBack, onAddMoreImages, onRemoveImage, onContinue }) {
  const fileInputRef = useRef(null);
  return (
    <PropertyLayout stepText="Step 10 of 10" progressPercent={100} onBack={onBack} pageClassName="picturePage" contentClassName="pictureContent">
      <div className="chatBlock">
        <UserMessage>{getFeatureText(features)}</UserMessage>
        <BotMessage bubbleClassName="questionBubble featuresQuestionBubble">Great! I&apos;ve added {getFeatureText(features)}.</BotMessage>
      </div>
      <div className="picturePanel">
        <input
          ref={fileInputRef}
          type="file"
          className="hiddenUploadInput"
          accept=".png,.jpg,.jpeg,.gif"
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) onAddMoreImages(files);
          }}
        />
        <button className="uploadArea pictureUploadArea" onClick={() => fileInputRef.current?.click()}>
          <span className="uploadIconWrap"><LuUpload /></span>
          <span className="uploadText">Click to upload or drag and drop</span>
          <span className="uploadHint">PNG, JPG, GIF up to 10MB</span>
        </button>
        <div className="imageGrid">
          {images.map((item, index) => (
            <div key={`${item}-${index}`} className="imageCard">
              <button
                type="button"
                className="removeImageBtn"
                aria-label={`Remove image ${index + 1}`}
                onClick={() => onRemoveImage(index)}
              >
                ×
              </button>
              <img src={item} alt={`Uploaded ${index + 1}`} className="imageThumb" />
              {index === 0 && <span className="mainBadge">Main</span>}
            </div>
          ))}
          <button className="imageCard addImageCard" onClick={() => fileInputRef.current?.click()}>
            <LuPlus />
            <span>Add more</span>
          </button>
        </div>
        <button className="continueBtn" onClick={onContinue}>Continue & Preview</button>
      </div>
    </PropertyLayout>
  );
}

function GeneratePage({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className="propertyPage genratePage">
      <img src={bg} alt="Background pattern" className="propertyBg" />
      <div className="propertyContent genrateContent">
        <div className="genrateCenterBox">
          <div className="genrateIconArea">
            <div className="genrateIconGlow"></div>
            <div className="genrateIconWrap"><LuSparkles /></div>
          </div>
          <p className="genrateText">Generating your perfect listing...</p>
          <div className="genrateDots"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
  );
}

function PublishPage({
  propertyType,
  address,
  price,
  size,
  sizeUnit,
  bedrooms,
  bathrooms,
  features,
  images,
  onPublish,
  publishLoading,
  publishMessage,
}) {
  const heroImage = images?.[0] || '';
  const formattedSize = size ? `${size} ${sizeUnit || ''}`.trim() : '850 sq ft';
  return (
    <div className="publishPageWrap">
      <div className="publishCard">
        <div className="publishHeader">
          <div className="publishHeaderRow">
            <span className="publishSparkle"><LuSparkles /></span>
            <div><h2>Your AI-Generated Listing</h2><p>Review and publish your property</p></div>
          </div>
        </div>
        <div className="publishHero" style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}>
          <span className="publishType">{propertyType || 'Apartment'}</span>
        </div>
        <div className="publishBody">
          <h3>{price || 'Rs 350,000'}</h3>
          <p className="publishAddress"><LuMapPin /> {address || '123 Main St, Downtown'}</p>
          <div className="publishMeta">
            <div><span><LuRuler /></span> <strong>Size</strong><em>{formattedSize}</em></div>
            <div><span><LuBedDouble /></span> <strong>Bedrooms</strong><em>{bedrooms || '5'}</em></div>
            <div><span><LuBath /></span> <strong>Bathrooms</strong><em>{bathrooms || '4'}</em></div>
          </div>
          <h4>Key Features</h4>
          <div className="publishFeatures">
            <span><LuCheck /> {getFeatureText(features)}</span>
            <span><LuCheck /> Walk-in Closets</span>
            <span><LuCheck /> Gym/Fitness Center</span>
          </div>
          <div className="publishActions">
            <button className="publishBtn" onClick={onPublish} disabled={publishLoading}>
              <LuSparkles /> {publishLoading ? 'Publishing...' : 'Publish Listing'}
            </button>
            <button className="saveBtn">Save for later</button>
          </div>
          {publishMessage && (
            <p className="publishStatusText">{publishMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyFlow() {
  const [selectedPurpose, setSelectedPurpose] = useState('Sell');
  const [selectedPropertyType, setSelectedPropertyType] = useState('Apartment');
  const [selectedAddress, setSelectedAddress] = useState('123 Main St, Downtown');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedSize, setSelectedSize] = useState('1500');
  const [selectedSizeUnit, setSelectedSizeUnit] = useState('Marla');
  const [selectedBedrooms, setSelectedBedrooms] = useState('5');
  const [selectedBathrooms, setSelectedBathrooms] = useState('2');
  const [selectedFeature, setSelectedFeature] = useState('Security');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedImageFiles, setUploadedImageFiles] = useState([]);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('listingMode');
  const authUserForWelcome = getStoredAuthUser();
  const welcomeName = getDisplayNameFromUser(authUserForWelcome);

  const handleUploadComplete = (files) => {
    const newImages = files.map((file) => URL.createObjectURL(file));
    setUploadedImageFiles((prev) => [...prev, ...files]);
    setUploadedImages((prev) => [...prev, ...newImages]);
    setCurrentPage('picture');
  };

  const handleRemoveImage = (indexToRemove) => {
    setUploadedImageFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setUploadedImages((prev) => {
      const imageToRemove = prev[indexToRemove];
      if (imageToRemove) URL.revokeObjectURL(imageToRemove);
      return prev.filter((_, index) => index !== indexToRemove);
    });
  };

  const handlePublishListing = async () => {
    if (publishLoading) return;
    setPublishLoading(true);
    setPublishMessage('');

    const authUser = getStoredAuthUser();
    const rawContactNumber = getContactFromUser(authUser) || '03331234567';
    const contactNumber = toApiPakistanPhone(rawContactNumber) || '+923331234567';
    const userEmail = getEmailFromUser(authUser) || 'dummy@property.com';

    const payload = {
      property_type_id: 1,
      property_type_slug: mapPurposeToSlug(selectedPurpose),
      category_id: 1,
      sub_category_id: 1,
      city_code: 'LHR',
      plot_number: '123',
      area_size: selectedSize,
      unit_area: selectedSizeUnit,
      price: getNumericPrice(selectedPrice),
      currency: 'PKR',
      title: `${selectedPropertyType} for ${selectedPurpose}`,
      contacts: [contactNumber],
      ...(userEmail ? { email: userEmail } : {}),
      address: selectedAddress,
      bedrooms: selectedBedrooms,
      bathrooms: selectedBathrooms,
      features: Array.isArray(selectedFeature) ? selectedFeature : [selectedFeature],
    };

    try {
      const apiEndpoint =
        process.env.REACT_APP_PROPERTY_API_URL ||
        `${normalizeApiBase(process.env.REACT_APP_API_BASE_URL || 'https://admin.pakistanproperty.com')}/api/agent/properties`;
      const authToken =
        (process.env.REACT_APP_API_TOKEN || localStorage.getItem('agent_api_token') || '').trim();
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => formData.append(`${key}[]`, item));
        } else {
          formData.append(key, value);
        }
      });
      uploadedImageFiles.forEach((file) => formData.append('images[]', file));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        let serverMessage = '';
        try {
          const errorJson = await response.json();
          serverMessage = errorJson?.message || JSON.stringify(errorJson);
        } catch {
          serverMessage = await response.text();
        }
        throw new Error(`Request failed (${response.status}). ${serverMessage}`);
      }

      setPublishMessage('Property saved successfully.');
    } catch (error) {
      setPublishMessage(`Failed to save property. ${error.message}`);
    } finally {
      setPublishLoading(false);
    }
  };

  switch (currentPage) {
    case 'listingMode':
      return (
        <ListingModePage
          onAiListing={() => setCurrentPage('welcome')}
          onManualListing={() => {}}
        />
      );
    case 'welcome':
      return <WelcomePage welcomeName={welcomeName} onStart={() => setCurrentPage('purpose')} />;
    case 'purpose':
      return (
        <PurposePage
          onSelectPurpose={(v) => {
            setSelectedPurpose(v);
            setCurrentPage('propertyType');
          }}
          onBack={() => setCurrentPage('welcome')}
        />
      );
    case 'propertyType':
      return <PropertyTypePage onSelectPropertyType={(v) => { setSelectedPropertyType(v); setCurrentPage('address'); }} onBack={() => setCurrentPage('purpose')} />;
    case 'address':
      return <AddressPage selectedPropertyType={selectedPropertyType} onBack={() => setCurrentPage('propertyType')} onSendAddress={(v) => { setSelectedAddress(v); setCurrentPage('price'); }} />;
    case 'price':
      return <PricePage address={selectedAddress} onBack={() => setCurrentPage('address')} onSelectPrice={(v) => { setSelectedPrice(formatPriceWithRs(v)); setCurrentPage('review'); }} />;
    case 'review':
      return <SizePage price={selectedPrice} onBack={() => setCurrentPage('price')} onSendSize={(size, unit) => { setSelectedSize(size); setSelectedSizeUnit(unit); setCurrentPage('ammenties'); }} />;
    case 'ammenties':
      return <AmenitiesPage size={selectedSize} onBack={() => setCurrentPage('review')} onSendBedrooms={(v) => { setSelectedBedrooms(v); setCurrentPage('ammenties2'); }} />;
    case 'ammenties2':
      return <AmenitiesPage2 bedrooms={selectedBedrooms} onBack={() => setCurrentPage('ammenties')} onSendBathrooms={(v) => { setSelectedBathrooms(v); setCurrentPage('ammenties3'); }} />;
    case 'ammenties3':
      return <AmenitiesPage3 bathrooms={selectedBathrooms} onBack={() => setCurrentPage('ammenties2')} onSendFeatures={(v) => { setSelectedFeature(v); setCurrentPage('ammenties4'); }} />;
    case 'ammenties4':
      return (
        <AmenitiesPage4
          feature={selectedFeature}
          onBack={() => setCurrentPage('ammenties3')}
          onSendFeature={(v) => setSelectedFeature(v)}
          onDoneFeatures={() => setCurrentPage('upload')}
        />
      );
    case 'upload':
      return <UploadPage features={selectedFeature} onBack={() => setCurrentPage('ammenties4')} onUploadComplete={handleUploadComplete} />;
    case 'picture':
      return (
        <PicturePage
          features={selectedFeature}
          images={uploadedImages}
          onBack={() => setCurrentPage('upload')}
          onAddMoreImages={handleUploadComplete}
          onRemoveImage={handleRemoveImage}
          onContinue={() => setCurrentPage('genrate')}
        />
      );
    case 'genrate':
      return <GeneratePage onComplete={() => setCurrentPage('publish')} />;
    case 'publish':
      return (
        <PublishPage
          propertyType={selectedPropertyType}
          address={selectedAddress}
          price={selectedPrice}
          size={selectedSize}
          sizeUnit={selectedSizeUnit}
          bedrooms={selectedBedrooms}
          bathrooms={selectedBathrooms}
          features={selectedFeature}
          images={uploadedImages}
          onPublish={handlePublishListing}
          publishLoading={publishLoading}
          publishMessage={publishMessage}
        />
      );
    default:
      return <WelcomePage onStart={() => setCurrentPage('propertyType')} />;
  }
}

export default PropertyFlow;
