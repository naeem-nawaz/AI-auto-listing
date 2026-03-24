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

const CHATBOT_PURPOSE_OPTIONS = ['Sell', 'Rent', 'Lease'];
const CHATBOT_PROPERTY_TYPE_OPTIONS = ['Home', 'Commercial', 'Plot'];
const CHATBOT_SUB_TYPE_OPTIONS = {
  Home: HOME_PROPERTY_TYPES,
  Commercial: COMMERCIAL_PROPERTY_TYPES,
  Plot: PLOT_PROPERTY_TYPES,
};
const PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE = "👋 Hello! I'm your AI property listing assistant. I'll help you create a professional listing in just a few simple steps. Let's get started!";
const PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION = 'For what purpose are you listing this property?';

function formatPriceWithRs(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed
    .replace(/^((rs|pkr|₨)\.?\s*)+/i, '')
    .trim();
  if (!normalized) return '';
  return `Rs ${normalized}`;
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

function getStoredAuthToken(user) {
  const tokenKeys = [
    'agent_api_token',
    'api_token',
    'access_token',
    'token',
    'auth_token',
    'authToken',
    'bearer_token',
    'jwt',
  ];

  for (const key of tokenKeys) {
    const directToken = (localStorage.getItem(key) || sessionStorage.getItem(key) || '').trim();
    if (directToken) return directToken;
  }

  const sources = [user, user?.user, user?.data, user?.data?.user, user?.profile];
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of tokenKeys) {
      const tokenValue = String(source?.[key] || '').trim();
      if (tokenValue) return tokenValue;
    }
  }

  return '';
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
  const welcomeText = `Welcome, ${welcomeName || 'John'}`;
  const subtitleText = 'Not sure where to begin? Our smart assistant will ask simple questions to create your listing.';
  const assistantText = "👋 Hello! I'm your AI property listing assistant. I'll help you create a professional listing in simple steps.";

  const welcomeWords = welcomeText.split(' ');
  const subtitleWords = subtitleText.split(' ');
  const assistantWords = assistantText.split(' ');

  const [welcomeVisibleCount, setWelcomeVisibleCount] = useState(0);
  const [subtitleVisibleCount, setSubtitleVisibleCount] = useState(0);
  const [assistantVisibleCount, setAssistantVisibleCount] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);

  useEffect(() => {
    const timeouts = [];
    const intervals = [];

    const runWordTyping = (totalWords, setCount, startDelay, speed) => {
      const startTimer = setTimeout(() => {
        setCount(0);
        let index = 0;
        const ticker = setInterval(() => {
          index += 1;
          setCount(index);
          if (index >= totalWords) {
            clearInterval(ticker);
          }
        }, speed);
        intervals.push(ticker);
      }, startDelay);
      timeouts.push(startTimer);
      return startDelay + totalWords * speed;
    };

    const welcomeEnd = runWordTyping(welcomeWords.length, setWelcomeVisibleCount, 180, 110);
    const subtitleEnd = runWordTyping(subtitleWords.length, setSubtitleVisibleCount, welcomeEnd + 120, 65);
    const assistantEnd = runWordTyping(assistantWords.length, setAssistantVisibleCount, subtitleEnd + 160, 52);

    const buttonTimer = setTimeout(() => {
      setShowStartButton(true);
    }, assistantEnd + 140);
    timeouts.push(buttonTimer);

    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      intervals.forEach((id) => clearInterval(id));
    };
  }, [assistantWords.length, subtitleWords.length, welcomeWords.length]);

  return (
    <div className="page welcomeAnimatedPage">
      <img src={bg} alt="Background pattern" className="pageBg" />
      <div className="data">
        <div className="image welcomeAnimatedLogo">
          <img src={logo} alt="Logo" />
        </div>
        <h1 className="welcomeAnimatedTitle">
          {welcomeWords.slice(0, welcomeVisibleCount).map((word, index) => (
            <span
              key={`${word}-${index}`}
              className="welcomeWord"
              style={{ animationDelay: `${0.18 + index * 0.12}s` }}
            >
              {word}
            </span>
          ))}
        </h1>
        <p className="welcomeAnimatedSubtitle">
          {subtitleWords.slice(0, subtitleVisibleCount).join(' ')}
        </p>
        <div className="layout welcomeAnimatedAssistant">
          <div className="bot">
            <img src={assistantIcon} alt="Assistant icon" />
          </div>
          <div className="assistant">
            <p>{assistantWords.slice(0, assistantVisibleCount).join(' ')}</p>
          </div>
        </div>
        <button
          className="btn welcomeAnimatedButton"
          onClick={onStart}
          style={{ opacity: showStartButton ? 1 : 0, pointerEvents: showStartButton ? 'auto' : 'none' }}
        >
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
            onOptionClick={(item) => onSelectPropertyType(item, selectedGroup)}
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

function AmenitiesPage({ size, onBack, onSendBedrooms, isPlotType }) {
  const [value, setValue] = useState('');
  const [custom, setCustom] = useState(false);
  const handleClick = (item, index) => {
    if (isPlotType) return;
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
          <button
            className="sendBtn"
            onClick={() => {
              if (isPlotType) {
                onSendBedrooms('N/A');
                return;
              }
              if (custom && value.trim()) onSendBedrooms(value.trim());
            }}
          >
            <LuSend />
          </button>
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
          getButtonClassName={(item, index) =>
            `bedroomChip ${(value === item || (index === 5 && custom)) ? 'activeBedroomChip' : ''} ${isPlotType ? 'disabledOptionChip' : ''}`.trim()
          }
          isOptionDisabled={() => isPlotType}
          onOptionClick={(item, index) => handleClick(item, index)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage2({ bedrooms, onBack, onSendBathrooms, isPlotType }) {
  const [value, setValue] = useState('');
  const [custom, setCustom] = useState(false);
  const handleClick = (item, index) => {
    if (isPlotType) return;
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
          <button
            className="sendBtn"
            onClick={() => {
              if (isPlotType) {
                onSendBathrooms('N/A');
                return;
              }
              if (custom && value.trim()) onSendBathrooms(value.trim());
            }}
          >
            <LuSend />
          </button>
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
          getButtonClassName={(item, index) =>
            `bedroomChip ${(value === item || (index === 5 && custom)) ? 'activeBedroomChip' : ''} ${isPlotType ? 'disabledOptionChip' : ''}`.trim()
          }
          isOptionDisabled={() => isPlotType}
          onOptionClick={(item, index) => handleClick(item, index)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage3({ bathrooms, onBack, onSendFeatures, isPlotType }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [custom, setCustom] = useState(false);
  const handleFeatureClick = (item) => {
    if (isPlotType) return;
    if (item === 'Done with Features') {
      setCustom(false);
      setSelectedFeature(item);
      onSendFeatures(item);
      return;
    }
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
          <input
            className="addressInput"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPlotType || !custom}
            placeholder={isPlotType ? 'Plots: skip features and continue' : (custom ? "Write..." : "Select last button to enable")}
          />
          <button
            className="sendBtn"
            onClick={() => {
              if (isPlotType) {
                onSendFeatures('N/A');
                return;
              }
              if (custom && notes.trim()) onSendFeatures(notes.trim());
            }}
          >
            <LuSend />
          </button>
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
            return `featureChip ${isDone ? 'doneFeatureChip' : ''} ${isActive ? 'activeFeatureChip' : ''} ${isPlotType ? 'disabledOptionChip' : ''}`.trim();
          }}
          isOptionDisabled={() => isPlotType}
          onOptionClick={(item) => handleFeatureClick(item)}
        />
      </div>
    </PropertyLayout>
  );
}

function AmenitiesPage4({ feature, onBack, onSendFeature, onDoneFeatures, isPlotType }) {
  const [notes, setNotes] = useState('');
  const [selectedFeature, setSelectedFeature] = useState(feature || '');
  const [custom, setCustom] = useState(false);

  const handleFeatureClick = (item) => {
    if (isPlotType) return;
    if (item === 'Done with Features') {
      const finalFeature = feature || selectedFeature || item;
      onSendFeature(finalFeature);
      onDoneFeatures();
      return;
    }
    setCustom(false);
    setSelectedFeature(item);
    onSendFeature(item);
  };

  const handleSend = () => {
    if (isPlotType) {
      onDoneFeatures();
      return;
    }
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
            disabled={isPlotType || !custom}
            placeholder={isPlotType ? 'Plots: skip features and continue' : (custom ? "Write..." : "Select last button to enable")}
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
            return `featureChip ${isDone ? 'doneFeatureChip' : ''} ${isActive ? 'activeFeatureChip' : ''} ${isPlotType ? 'disabledOptionChip' : ''}`.trim();
          }}
          isOptionDisabled={() => isPlotType}
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
        <button className="continueBtn" onClick={onContinue}>Continue & Preview & generating</button>
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

function AiContentDraftPage({
  onNext,
  onBack,
  listingContext,
  aiTitle,
  aiDescription,
  onTitleGenerated,
  onDescriptionGenerated,
}) {
  const [titleLoading, setTitleLoading] = useState(false);
  const [descriptionLoading, setDescriptionLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const titleTimerRef = useRef(null); 
  const descriptionTimerRef = useRef(null);
  const TITLE_HISTORY_STORAGE_KEY = 'pp_ai_recent_titles_v1';
  const DESCRIPTION_HISTORY_STORAGE_KEY = 'pp_ai_recent_descriptions_v1';
  const MAX_TITLE_HISTORY = 30;
  const MAX_DESCRIPTION_HISTORY = 20;

  useEffect(() => {
    return () => {
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
      if (descriptionTimerRef.current) clearTimeout(descriptionTimerRef.current);
    };
  }, []);

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const withTimeout = (promise, timeoutMs = 25000) => {
    let timeoutId;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      }),
    ]).finally(() => clearTimeout(timeoutId));
  };

  const isNetworkError = (error) => {
    if (!error) return false;
    if (error.name === 'TypeError') return true;
    const message = String(error.message || '').toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('load failed') ||
      message.includes('timeout')
    );
  };

  const getLocalFallbackTitle = () => {
    const purpose = listingContext?.purpose || 'Sell';
    const propertyType = listingContext?.propertyType || 'Property';
    const size = listingContext?.size;
    const sizeUnit = listingContext?.sizeUnit;
    const address = listingContext?.address || 'Prime Location';
    const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';
    return `${sizeText ? `${sizeText} ` : ''}${propertyType} for ${purpose} in ${address}`.trim();
  };

  const getLocalFallbackDescription = () => {
    const purpose = listingContext?.purpose || 'sell';
    const propertyType = listingContext?.propertyType || 'property';
    const address = listingContext?.address || 'a well-connected area';
    const price = listingContext?.price || 'competitive market rates';
    const size = listingContext?.size;
    const sizeUnit = listingContext?.sizeUnit;
    const bedrooms = listingContext?.bedrooms;
    const bathrooms = listingContext?.bathrooms;
    const features = Array.isArray(listingContext?.features)
      ? listingContext.features.filter(Boolean).join(', ')
      : listingContext?.features || '';
    const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';
    const specs = [sizeText, bedrooms ? `${bedrooms} bedrooms` : '', bathrooms ? `${bathrooms} bathrooms` : '']
      .filter(Boolean)
      .join(', ');

    return `Presenting a well-maintained ${propertyType} in ${address}, available for ${purpose} at ${price}. ${specs ? `The property offers ${specs}, designed for practical and comfortable living. ` : ''}${features ? `Key highlights include ${features}.` : 'Its layout and location make it a strong fit for both families and investors.'}`.trim();
  };

  const normalizeForCompare = (text) =>
    String(text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const getRecentTitleHistory = () => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(TITLE_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => String(item || '').trim());
    } catch {
      return [];
    }
  };

  const saveTitleToHistory = (titleText) => {
    const cleaned = String(titleText || '').trim();
    if (!cleaned || typeof window === 'undefined') return;

    const existing = getRecentTitleHistory();
    const existingNormalized = new Set(existing.map(normalizeForCompare));
    if (existingNormalized.has(normalizeForCompare(cleaned))) return;

    const next = [cleaned, ...existing].slice(0, MAX_TITLE_HISTORY);
    try {
      window.localStorage.setItem(TITLE_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write issues silently to keep UX smooth.
    }
  };

  const getRecentDescriptionHistory = () => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(DESCRIPTION_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item) => String(item || '').trim());
    } catch {
      return [];
    }
  };

  const saveDescriptionToHistory = (descriptionText) => {
    const cleaned = String(descriptionText || '').trim();
    if (!cleaned || typeof window === 'undefined') return;

    const existing = getRecentDescriptionHistory();
    const existingNormalized = new Set(existing.map(normalizeForCompare));      
    if (existingNormalized.has(normalizeForCompare(cleaned))) return;

    const next = [cleaned, ...existing].slice(0, MAX_DESCRIPTION_HISTORY);
    try {
      window.localStorage.setItem(DESCRIPTION_HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write issues silently to keep UX smooth.
    }
  };

  const stripPriceFromTitle = (titleText) =>
    String(titleText || '')
      .replace(/\b(?:rs|pkr|₨)\.?\s*[\d,.]+(?:\s*(?:lakh|lac|crore|million|billion|k|m))?\b/gi, '')
      .replace(/\b[\d,.]+\s*(?:lakh|lac|crore|million|billion|k|m)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[,.\-:|]+|[,.\-:|]+$/g, '')
      .trim();

  const getUniqueFallbackTitle = () => {
    const propertyType = listingContext?.propertyType || 'Property';
    const purpose = listingContext?.purpose || 'Sell';
    const address = listingContext?.address || 'Prime Location';
    const recentTitles = getRecentTitleHistory();
    const usedNormalized = new Set([
      normalizeForCompare(aiTitle),
      ...recentTitles.map(normalizeForCompare),
    ]);
    const options = [
      `${propertyType} for ${purpose} in ${address}`,
      `Modern ${propertyType} in ${address}`,
      `Spacious ${propertyType} Available in ${address}`,
      `Prime Location ${propertyType} for ${purpose}`,
      `${purpose} Opportunity: ${propertyType} in ${address}`,
      `Well Located ${propertyType} Ready for ${purpose}`,
    ].map((item) => stripPriceFromTitle(item));
    const firstUnique = options.find((item) => !usedNormalized.has(normalizeForCompare(item)));
    return firstUnique || `${propertyType} Listing in ${address}`.trim();
  };

  const ensureUniqueTitle = (titleText) => {
    const cleanedTitle = stripPriceFromTitle(titleText);
    const recentTitles = getRecentTitleHistory();
    const usedNormalized = new Set([
      normalizeForCompare(aiTitle),
      ...recentTitles.map(normalizeForCompare),
    ]);
    if (!cleanedTitle) return getUniqueFallbackTitle();
    if (usedNormalized.has(normalizeForCompare(cleanedTitle))) {
      return getUniqueFallbackTitle();
    }
    return cleanedTitle;
  };

  const ensureUniqueDescription = (descriptionText) => {
    const cleanedDescription = String(descriptionText || '').trim();
    const recentDescriptions = getRecentDescriptionHistory();
    const usedNormalized = new Set([
      normalizeForCompare(aiDescription),
      ...recentDescriptions.map(normalizeForCompare),
    ]);
    if (!cleanedDescription) return getLocalFallbackDescription();
    if (usedNormalized.has(normalizeForCompare(cleanedDescription))) {
      const variants = [
        'An excellent option for end-users who value accessibility and daily convenience.',
        'A practical and reliable choice for families seeking long-term comfort.',
        'Well-suited for buyers and investors focused on location and livability.',
      ];
      const variant = variants[Date.now() % variants.length];
      return `${cleanedDescription} ${variant}`.trim();
    }
    return cleanedDescription;
  };

  const buildPromptFacts = () => {
    const facts = {
      purpose: listingContext?.purpose || 'Sell',
      propertyType: listingContext?.propertyType || 'Property',
      address: listingContext?.address || 'Prime Location',
      city: listingContext?.city || '',
      size: listingContext?.size || '',
      sizeUnit: listingContext?.sizeUnit || '',
      bedrooms: listingContext?.bedrooms || '',
      bathrooms: listingContext?.bathrooms || '',
      price: listingContext?.price || '',
      features: Array.isArray(listingContext?.features)
        ? listingContext.features.filter(Boolean).join(', ')
        : listingContext?.features || '',
    };

    return Object.entries(facts)
      .filter(([, value]) => String(value || '').trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  const sanitizeAiText = (text, mode) => {
    const cleaned = String(text || '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^\s*(title|description)\s*:\s*/i, '')
      .replace(/^[\-\*\d.)]+\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (mode === 'title') {
      return cleaned.split('\n')[0].trim();
    }
    return cleaned;
  };

  const generateWithOpenAI = async (mode) => {
    const apiKey = (process.env.REACT_APP_OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new Error('OpenAI API key missing in env.');

    const previousTitle = String(aiTitle || '').trim();
    const previousDescription = String(aiDescription || '').trim();
    const recentTitles = getRecentTitleHistory();
    const recentTitlesText = recentTitles.length
      ? recentTitles.slice(0, 8).map((item, index) => `${index + 1}. ${item}`).join('\n')
      : 'N/A';
    const recentDescriptions = getRecentDescriptionHistory();
    const recentDescriptionsText = recentDescriptions.length
      ? recentDescriptions.slice(0, 5).map((item, index) => `${index + 1}. ${item}`).join('\n')
      : 'N/A';
    const promptFacts = buildPromptFacts();
    const userPrompt = mode === 'title'
      ? `Write one professional property listing title using these facts:
${promptFacts || 'No structured facts available.'}

Previous title (avoid similar wording): ${previousTitle || 'N/A'}
Recent titles already used (avoid repeating words/patterns): 
${recentTitlesText}

Rules:
- Output exactly one line and only the title text.
- Keep it 7 to 12 words.
- Mention property type and location naturally.
- Tone must be professional and market-ready.
- Use a clearly different phrasing pattern from previous/recent titles.
- No emojis, hashtags, quotation marks, or markdown.`
      : `Write one professional property listing description using these facts:
${promptFacts || 'No structured facts available.'}

Previous description (avoid similar wording): ${previousDescription || 'N/A'}
Recent descriptions already used (avoid repeating words/patterns):
${recentDescriptionsText}

Rules:
- Output one paragraph only (60 to 95 words).
- Keep it polished, trustworthy, and sales-ready.
- Include key value points from available facts (location, size/specs, highlights, purpose).
- End with a soft call-to-action suitable for a listing.
- Use clearly different sentence openings and flow from previous/recent descriptions.
- No emojis, hashtags, quotation marks, or markdown.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a senior Pakistani real-estate copywriter. Write clear, professional, publication-ready listing copy in plain text only.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed (${response.status}). ${errorText}`);
    }

    const data = await response.json();
    return (data?.choices?.[0]?.message?.content || '').trim();
  };

  const requestOpenAIText = async (mode) => {  
    try {
      return await withTimeout(generateWithOpenAI(mode), 25000);
    } catch (error) {
      if (!isNetworkError(error)) throw error;
      await wait(1200);
      return withTimeout(generateWithOpenAI(mode), 25000);
    }
  };

  const handleGenerateTitle = async () => {
    if (titleLoading) return;
    setAiError('');
    setTitleLoading(true);
    try {
      const minDelay = new Promise((resolve) => {
        titleTimerRef.current = setTimeout(resolve, 5000);
      });
      const aiRequest = requestOpenAIText('title');
      const [, generatedText] = await Promise.all([minDelay, aiRequest]);
      const safeTitle = ensureUniqueTitle(
        sanitizeAiText(generatedText, 'title') || getLocalFallbackTitle()
      );
      saveTitleToHistory(safeTitle);
      onTitleGenerated(safeTitle);
    } catch (error) {
      const fallbackTitle = ensureUniqueTitle(getLocalFallbackTitle());
      saveTitleToHistory(fallbackTitle);
      onTitleGenerated(fallbackTitle);
      if (isNetworkError(error)) {
        setAiError('');
      } else {
        setAiError(error.message);
      }
    } finally {
      setTitleLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (descriptionLoading) return; 
    setAiError('');
    setDescriptionLoading(true);
    try {
      const minDelay = new Promise((resolve) => {
        descriptionTimerRef.current = setTimeout(resolve, 5000);
      });
      const aiRequest = requestOpenAIText('description');
      const [, generatedText] = await Promise.all([minDelay, aiRequest]);
      const safeDescription = ensureUniqueDescription(
        sanitizeAiText(generatedText, 'description') || getLocalFallbackDescription()
      );
      saveDescriptionToHistory(safeDescription);
      onDescriptionGenerated(safeDescription);
    } catch (error) {
      const fallbackDescription = ensureUniqueDescription(getLocalFallbackDescription());
      saveDescriptionToHistory(fallbackDescription);
      onDescriptionGenerated(fallbackDescription);
      if (isNetworkError(error)) {
        setAiError('');
      } else {
        setAiError(error.message);
      }
    } finally {
      setDescriptionLoading(false);
    }
  };

  const isLoading = titleLoading || descriptionLoading;
  const loadingText = titleLoading
    ? 'Generating your perfect title...'
    : 'Generating your perfect description...';

  if (isLoading) {
    return (
      <PropertyLayout stepText="" progressPercent={0} showProgress={false} onBack={onBack}>
        <div className="genrateContent aiDraftLoadingContent">
          <div className="genrateCenterBox">
            <div className="genrateIconArea">
              <div className="genrateIconGlow"></div>
              <div className="genrateIconWrap"><LuSparkles /></div>
            </div>
            <p className="genrateText">{loadingText}</p>
            <div className="genrateDots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </PropertyLayout>
    );
  }

  return (
    <PropertyLayout stepText="" progressPercent={0} showProgress={false} onBack={onBack}>
      <div className="chatBlock aiDraftBlock">
        <BotMessage bubbleClassName="">
          🤖 AI is preparing your listing details.
        </BotMessage>
        <div className="chatRow">
          <div className="bot">
            <img src={assistantIcon} alt="Assistant icon" />
          </div>
          <button className="chatBubble aiDraftTriggerBubble" onClick={handleGenerateTitle}>
            Generate Property Title
          </button>
        </div>
        <div className="chatRow userRow">
          {aiTitle && (
            <div className="chatBubble userTypeBubble aiDraftTitleBubble">
              {aiTitle}
            </div>
          )}
        </div>

        <div className="chatRow">
          <div className="bot">
            <img src={assistantIcon} alt="Assistant icon" />
          </div>
          <button className="chatBubble aiDraftTriggerBubble" onClick={handleGenerateDescription}>
            Generate Description
          </button>
        </div>
        <div className="chatRow userRow">
          {aiDescription && (
            <div className="chatBubble userTypeBubble aiDraftDescriptionBubble">
              {aiDescription}
            </div>
          )}
        </div>
        <button
          className="continueBtn aiDraftNextBtn"
          onClick={onNext}
          disabled={titleLoading || descriptionLoading}
        >
          Continue
        </button>
        {aiError && <p className="publishStatusText">{aiError}</p>}
      </div>
    </PropertyLayout>
  );
}

function AssistantTypewriterText({ text }) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!words.length) return undefined;

    let index = 0;
    const ticker = setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= words.length) clearInterval(ticker);
    }, 42);

    return () => clearInterval(ticker);
  }, [text, words.length]);

  return words.slice(0, visibleCount).join(' ');
}

function AiChatbotListingPage({
  selectedPurpose,
  selectedPropertyType,
  selectedAddress,
  selectedPrice,
  selectedSize,
  selectedSizeUnit,
  selectedBedrooms,
  selectedBathrooms,
  selectedFeature,
  selectedUploadedImages,
  selectedContactNumber,
  selectedEmail,
  profileContactNumber,
  profileEmail,
  generatedTitle,
  generatedDescription,
  onSetPurpose,
  onSetPropertyGroup,
  onSetPropertyType,
  onSetAddress,
  onSetPrice,
  onSetSize,
  onSetBedrooms,
  onSetBathrooms,
  onSetFeature,
  onUploadImages,
  onSetContactNumber,
  onSetEmail,
}) {

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  const [draft, setDraft] = useState({
    purpose: selectedPurpose || '',
    propertyType: selectedPropertyType || '',
    address: selectedAddress || '',
    price: selectedPrice || '',
    size: selectedSize || '',
    sizeUnit: selectedSizeUnit || 'Marla',
    bedrooms: selectedBedrooms || '',
    bathrooms: selectedBathrooms || '',
    features: selectedFeature || '',
    subType: '',
    useProfileContact: '',
    images: (selectedUploadedImages?.length || 0) ? `uploaded:${selectedUploadedImages.length}` : '',
    contactNumber: selectedContactNumber || '',
    email: selectedEmail || '',
  });

  const stageOrder = [
    'purpose',
    'propertyType',
    'subType',
    'address',
    'size',
    'price',
    'bedrooms',
    'bathrooms',
    'features',
    'useProfileContact',
    'email',
    'contactNumber',
    'images',
  ];

  const withTimeout = (promise, timeoutMs = 25000) => {
    let timeoutId;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      }),
    ]).finally(() => clearTimeout(timeoutId));
  };

  const normalizeType = (text) => String(text || '').toLowerCase();
  const getPropertyGroup = (value) => {
    const lower = normalizeType(value);
    if (!lower) return '';
    if (lower === 'home' || HOME_PROPERTY_TYPES.some((item) => normalizeType(item) === lower)) return 'Home';
    if (lower === 'commercial' || COMMERCIAL_PROPERTY_TYPES.some((item) => normalizeType(item) === lower)) return 'Commercial';
    if (lower === 'plot' || PLOT_PROPERTY_TYPES.some((item) => normalizeType(item) === lower)) return 'Plot';
    if (lower.includes('plot')) return 'Plot';
    if (['office', 'shop', 'warehouse', 'factory', 'building', 'commercial'].some((item) => lower.includes(item))) return 'Commercial';
    return 'Home';
  };

  const isPlotType = (data) => getPropertyGroup(data?.propertyType) === 'Plot';
  const isCommercialType = (data) => {
    return getPropertyGroup(data?.propertyType) === 'Commercial';
  };

  const hasProfileContact = Boolean((profileContactNumber || '').trim() || (profileEmail || '').trim());

  const getCurrentStage = (data) => {
    for (const key of stageOrder) {
      if (key === 'subType') {
        const group = getPropertyGroup(data?.propertyType);
        if (!String(group || '').trim()) continue;
        if (String(data?.subType || '').trim()) continue;
      }
      if ((key === 'bedrooms' || key === 'bathrooms') && isPlotType(data)) continue;
      if (key === 'useProfileContact' && !hasProfileContact) continue;
      if ((key === 'email' || key === 'contactNumber') && data?.useProfileContact === 'yes') continue;
      if (String(data?.[key] || '').trim()) continue;
      return key;
    }
    return 'complete';
  };

  const getPromptForStage = (stage) => {
    if (stage === 'purpose') return PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION;
    if (stage === 'propertyType') return 'Property type batayein.';
    if (stage === 'subType') return 'Property sub-type batayein.';
    if (stage === 'address') return 'Location/address kya hai?';
    if (stage === 'size') return 'Area batayein (unit ke sath).';
    if (stage === 'price') return 'Price in PKR batayein.';
    if (stage === 'bedrooms') return isCommercialType(draft) ? 'Bedrooms kitne hain? (Skip allowed)' : 'Bedrooms kitne hain?';
    if (stage === 'bathrooms') return isCommercialType(draft) ? 'Bathrooms kitne hain? (Skip allowed)' : 'Bathrooms kitne hain?';
    if (stage === 'features') return 'Key features batayein (comma se separate kar sakte hain).';
    if (stage === 'useProfileContact') return 'Kya profile contact use karna hai?';
    if (stage === 'email') return 'Apna valid email address batayein.';
    if (stage === 'contactNumber') return 'Apna phone number batayein (3XXXXXXXXX).';
    if (stage === 'images') return 'Please upload property images. Aap neeche "Upload Images" button se files upload kar sakte hain.';
    return 'Great. Listing details complete ho gayi hain.';
  };

  const parsePurpose = (text) => {
    const raw = String(text || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.includes('sell')) return 'Sell';
    if (raw.includes('lease')) return 'Lease';
    if (raw.includes('rent')) return 'Rent';
    if (raw.includes('buy')) return 'Sell';
    return '';
  };

  const toDisplayCase = (text) =>
    String(text || '')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const parseSize = (text) => {
    const raw = String(text || '').trim();
    const numberMatch = raw.match(/\d+(\.\d+)?/);
    if (!numberMatch) return null;
    const value = numberMatch[0];
    const lower = raw.toLowerCase();

    let unit = 'Marla';
    if (lower.includes('kanal')) unit = 'Kanal';
    else if (lower.includes('sq ft') || lower.includes('square feet') || lower.includes('feet')) unit = 'Square Feet ( Sq. Ft.)';
    else if (lower.includes('sq yd') || lower.includes('square yard') || lower.includes('square yards')) unit = 'Square Yards ( Sq. Yd.)';
    else if (lower.includes('sq m') || lower.includes('square meter') || lower.includes('square meters')) unit = 'Square Meters ( Sq. M.)';
    else if (lower.includes('marla')) unit = 'Marla';

    return { value, unit };
  };

  const inferPropertyTypeFromText = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';

    const knownTypes = [
      'house',
      'flat',
      'apartment',
      'plot',
      'shop',
      'office',
      'villa',
      'studio',
      'townhouse',
      'penthouse',
      'farm house',
      'farmhouse',
      'room',
      'building',
      'warehouse',
      'factory',
    ];

    const lower = raw.toLowerCase();
    const matched = knownTypes.find((item) => lower.includes(item));
    if (matched) {
      if (matched === 'apartment') return 'Apartment';
      if (matched === 'farm house' || matched === 'farmhouse') return 'Farm House';
      return toDisplayCase(matched);
    }

    // Fallback for short custom types only.
    const cleaned = raw
      .replace(/\d+(\.\d+)?/g, ' ')
      .replace(/\b(?:marla|kanal|sq\.?\s*ft|square\s*feet|feet|sq\.?\s*yd|square\s*yards?|sq\.?\s*m|square\s*meters?|meter|yard)\b/gi, ' ')
      .replace(/\b(?:for|sale|sell|rent|buy|property|in|at|of)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return '';
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length > 3) return '';

    return toDisplayCase(words.join(' '));
  };

  const inferSubTypeFromText = (text, group) => {
    const options = CHATBOT_SUB_TYPE_OPTIONS[group] || [];
    const lower = normalizeType(text);
    if (!lower) return '';
    const exact = options.find((item) => normalizeType(item) === lower);
    if (exact) return exact;
    const contains = options.find((item) => lower.includes(normalizeType(item)));
    return contains || '';
  };

  const parsePriceFromText = (text) => {
    const raw = String(text || '').trim();
    const lower = raw.toLowerCase();
    const priceHints = ['rs', 'pkr', 'price', 'budget', 'lakh', 'lac', 'crore', 'million', 'billion', 'k', 'm'];
    const hasPriceHint = priceHints.some((item) => lower.includes(item));
    if (!hasPriceHint) return '';

    const formatted = formatPriceWithRs(raw);
    return formatted || '';
  };

  const parseAddressFromText = (text, force = false) => {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();

    const locationHints = [
      'dha', 'phase', 'block', 'sector', 'town', 'city', 'road', 'street', 'avenue',
      'society', 'scheme', 'colony', 'lahore', 'karachi', 'islamabad', 'rawalpindi',
      'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala', 'hyderabad',
    ];
    const hasLocationHint = locationHints.some((item) => lower.includes(item));
    if (!force && !hasLocationHint) return '';

    let candidate = raw;
    const dhaIndex = lower.indexOf('dha');
    if (dhaIndex >= 0) {
      candidate = raw.slice(dhaIndex).trim();
    } else {
      const inIndex = lower.lastIndexOf(' in ');
      if (inIndex >= 0 && raw.length > inIndex + 4) {
        candidate = raw.slice(inIndex + 4).trim();
      }
    }

    candidate = candidate
      .replace(/\b(?:sell|buy|rent|house|flat|plot|shop|office|apartment|villa|studio|townhouse)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return candidate.length >= 4 ? candidate : '';
  };

  const extractFactsFromText = (text, currentDraft, stage) => {
    const raw = String(text || '').trim();
    if (!raw) return {};

    const next = {};
    const purpose = parsePurpose(raw);
    const propertyType = inferPropertyTypeFromText(raw);
    const parsedSize = parseSize(raw);
    const parsedPrice = parsePriceFromText(raw);
    const parsedAddress = parseAddressFromText(raw, stage === 'address');
    const parsedContactNumber = parseContactNumber(raw);
    const parsedEmail = parseEmail(raw);

    if (!currentDraft.purpose && purpose) next.purpose = purpose;
    if (!currentDraft.propertyType && propertyType) next.propertyType = propertyType;
    if (!currentDraft.size && parsedSize) {
      next.size = parsedSize.value;
      next.sizeUnit = parsedSize.unit;
    }
    if (!currentDraft.price && parsedPrice) next.price = parsedPrice;
    if (!currentDraft.address && parsedAddress) next.address = parsedAddress;
    if (!currentDraft.contactNumber && parsedContactNumber) next.contactNumber = parsedContactNumber;
    if (!currentDraft.email && parsedEmail) next.email = parsedEmail;

    return next;
  };

  const parseContactNumber = (text) => {
    const digits = String(text || '').replace(/\D/g, '');
    if (/^3\d{9}$/.test(digits)) return digits;
    return '';
  };

  const parseEmail = (text) => {
    const value = String(text || '').trim().toLowerCase();
    if (!value) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '';
    return value;
  };

  const applyAnswerToDraft = (stage, answer, currentDraft) => {
    const trimmed = String(answer || '').trim();
    if (!trimmed) return { ok: false, nextDraft: currentDraft };

    if (stage === 'purpose') {
      const purpose = parsePurpose(trimmed);
      if (!purpose) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, purpose } };
    }

    if (stage === 'propertyType') {
      const parsedSize = parseSize(trimmed);
      const inferredTypeRaw = inferPropertyTypeFromText(trimmed);
      if (!inferredTypeRaw) return { ok: false, nextDraft: currentDraft };
      const group = getPropertyGroup(inferredTypeRaw);
      const inferredSubType = inferSubTypeFromText(trimmed, group);

      return {
        ok: true,
        nextDraft: {
          ...currentDraft,
          propertyType: group,
          ...(inferredSubType ? { subType: inferredSubType } : {}),
          ...(parsedSize
            ? {
              size: parsedSize.value,
              sizeUnit: parsedSize.unit,
            }
            : {}),
        },
      };
    }

    if (stage === 'subType') {
      const group = getPropertyGroup(currentDraft?.propertyType);
      const inferred = inferSubTypeFromText(trimmed, group) || toDisplayCase(trimmed);
      if (!inferred) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, subType: inferred } };
    }

    if (stage === 'address') {
      return { ok: true, nextDraft: { ...currentDraft, address: trimmed } };
    }

    if (stage === 'price') {
      return { ok: true, nextDraft: { ...currentDraft, price: formatPriceWithRs(trimmed) } };
    }

    if (stage === 'size') {
      const parsed = parseSize(trimmed);
      if (!parsed) return { ok: false, nextDraft: currentDraft };
      return {
        ok: true,
        nextDraft: {
          ...currentDraft,
          size: parsed.value,
          sizeUnit: parsed.unit,
        },
      };
    }

    if (stage === 'bedrooms') {
      if (isCommercialType(currentDraft) && /^skip$/i.test(trimmed)) {
        return { ok: true, nextDraft: { ...currentDraft, bedrooms: 'Skip' } };
      }
      return { ok: true, nextDraft: { ...currentDraft, bedrooms: trimmed } };
    }

    if (stage === 'bathrooms') {
      if (isCommercialType(currentDraft) && /^skip$/i.test(trimmed)) {
        return { ok: true, nextDraft: { ...currentDraft, bathrooms: 'Skip' } };
      }
      return { ok: true, nextDraft: { ...currentDraft, bathrooms: trimmed } };
    }
    if (stage === 'useProfileContact') {
      const lower = trimmed.toLowerCase();
      if (['yes', 'y', 'use profile', 'profile', 'haan', 'han'].some((item) => lower.includes(item))) {
        return {
          ok: true,
          nextDraft: {
            ...currentDraft,
            useProfileContact: 'yes',
            email: profileEmail || currentDraft.email,
            contactNumber: profileContactNumber || currentDraft.contactNumber,
          },
        };
      }
      if (['no', 'n', 'nahi', 'nahin'].some((item) => lower.includes(item))) {
        return { ok: true, nextDraft: { ...currentDraft, useProfileContact: 'no' } };
      }
      return { ok: false, nextDraft: currentDraft };
    }


    if (stage === 'features') {
      return { ok: true, nextDraft: { ...currentDraft, features: trimmed } };
    }

    if (stage === 'images') {
      const lower = trimmed.toLowerCase();
      if (lower.includes('skip')) {
        return { ok: true, nextDraft: { ...currentDraft, images: 'skip' } };
      }
      if (lower.includes('done') && String(currentDraft.images || '').startsWith('uploaded:')) {
        return { ok: true, nextDraft: currentDraft };
      }
      return { ok: false, nextDraft: currentDraft };
    }

    if (stage === 'contactNumber') {
      const contactNumber = parseContactNumber(trimmed);
      if (!contactNumber) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, contactNumber } };
    }

    if (stage === 'email') {
      const email = parseEmail(trimmed);
      if (!email) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, email } };
    }

    return { ok: true, nextDraft: currentDraft };
  };

  const syncDraftToParent = (nextDraft) => {
    onSetPurpose(nextDraft.purpose);
    onSetPropertyGroup(getPropertyGroup(nextDraft.propertyType));
    onSetPropertyType(nextDraft.subType || nextDraft.propertyType);
    onSetAddress(nextDraft.address);
    onSetPrice(nextDraft.price);
    onSetSize(nextDraft.size, nextDraft.sizeUnit);
    onSetBedrooms(nextDraft.bedrooms);
    onSetBathrooms(nextDraft.bathrooms);
    onSetFeature(nextDraft.features);
    onSetContactNumber(nextDraft.contactNumber);
    onSetEmail(nextDraft.email);
  };

  const getContextText = () => {
    const lines = [
      `Purpose: ${draft.purpose || 'N/A'}`,
      `Property Type: ${draft.propertyType || 'N/A'}`,
      `Sub-type: ${draft.subType || 'N/A'}`,
      `Address: ${draft.address || 'N/A'}`,
      `Price: ${draft.price || 'N/A'}`,
      `Size: ${draft.size ? `${draft.size} ${draft.sizeUnit || ''}`.trim() : 'N/A'}`,
      `Bedrooms: ${draft.bedrooms || 'N/A'}`,
      `Bathrooms: ${draft.bathrooms || 'N/A'}`,
      `Features: ${draft.features || 'N/A'}`,
      `Use Profile Contact: ${draft.useProfileContact || 'N/A'}`,
      `Images: ${draft.images || 'N/A'}`,
      `Contact Number: ${draft.contactNumber || 'N/A'}`,
      `Email: ${draft.email || 'N/A'}`,
      `Title: ${generatedTitle || 'N/A'}`,
      `Description: ${generatedDescription || 'N/A'}`,
    ];
    return lines.join('\n');
  };

  const buildListingSummaryText = (data) => {
    const title = `${data?.size ? `${data.size} ${data?.sizeUnit || ''} ` : ''}${data?.propertyType || 'Property'} in ${data?.address || 'Pakistan'}`.trim();
    const description = [
      `${data?.purpose || 'Sell'} listing for ${data?.propertyType || 'property'} in ${data?.address || 'a prime area'}.`,
      data?.price ? `Price: ${data.price}.` : '',
      `${data?.bedrooms && data?.bedrooms !== 'Skip' ? `${data.bedrooms} beds, ` : ''}${data?.bathrooms && data?.bathrooms !== 'Skip' ? `${data.bathrooms} baths, ` : ''}${data?.features ? `features: ${data.features}.` : ''}`.trim(),
    ].filter(Boolean).join(' ');

    return `Title: ${title}\nDescription: ${description}\nPlease upload photos to continue.`;
  };

  const getFallbackReply = (question) => {
    const q = String(question || '').toLowerCase();
    if (q.includes('price') || q.includes('rate')) {
      return 'Pricing ko nearby comparable listings ke sath align rakhein aur title/description me clear value points show karein.';
    }
    if (q.includes('title')) {
      return 'Title short, clear aur location + property type focused rakhein. Over-promising words avoid karein.';
    }
    if (q.includes('description')) {
      return 'Description me pehle location benefit, phir size/specs, phir key features aur end me simple call-to-action rakhein.';
    }
    return 'Aap specific sawal poochain, main listing ko aur strong banane ke liye targeted suggestion dunga.';
  };

  const requestAiDiscussionReply = async (userText, history) => {
    const apiKey = (process.env.REACT_APP_OPENAI_API_KEY || '').trim();
    if (!apiKey) return getFallbackReply(userText);

    const recentMessages = history.slice(-10).map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.text,
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.6,
        messages: [
          {
            role: 'system',
            content: 'You are a Pakistani property listing assistant. Reply in concise Roman Urdu + simple English mix. Keep practical advice in 2-4 lines.',
          },
          {
            role: 'system',
            content: `Current listing context:\n${getContextText()}`,
          },
          ...recentMessages,
          {
            role: 'user',
            content: userText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI chat failed (${response.status}). ${errorText}`);
    }

    const data = await response.json();
    return String(data?.choices?.[0]?.message?.content || '').trim();
  };

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        text: PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE,
      },
      {
        role: 'assistant',
        text: PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isReplyLoading]);

  const handleSend = async () => {
    const userText = inputText.trim();
    if (!userText || isReplyLoading) return;

    const userMessage = { role: 'user', text: userText };
    setInputText('');
    setMessages((prev) => [...prev, userMessage]);

    const stage = getCurrentStage(draft);
    const inferredFacts = extractFactsFromText(userText, draft, stage);
    let workingDraft = { ...draft, ...inferredFacts };

    if (stage !== 'complete') {
      if (!String(workingDraft[stage] || '').trim()) {
        const { ok, nextDraft } = applyAnswerToDraft(stage, userText, workingDraft);
        if (!ok) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: `Please valid ${stage} batayein. ${getPromptForStage(stage)}` },
          ]);
          return;
        }
        workingDraft = nextDraft;
      }

      if (!String(workingDraft[stage] || '').trim()) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Please valid ${stage} batayein. ${getPromptForStage(stage)}` },
        ]);
        return;
      }

      setDraft(workingDraft);
      syncDraftToParent(workingDraft);

      const nextStage = getCurrentStage(workingDraft);
      if (nextStage === 'images') {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: buildListingSummaryText(workingDraft) },
          { role: 'assistant', text: getPromptForStage('images') },
        ]);
      } else if (nextStage === 'complete') {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Great! Basic listing details complete ho gayi hain. Ab aap mujh se koi bhi sawal kar sakte hain (pricing, title, description, strategy).',
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: getPromptForStage(nextStage) }]);
      }
      return;
    }

    setIsReplyLoading(true);
    try {
      const historyForAi = [...messages, userMessage];
      const reply = await withTimeout(requestAiDiscussionReply(userText, historyForAi), 25000);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply || getFallbackReply(userText) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: getFallbackReply(userText) }]);
    } finally {
      setIsReplyLoading(false);
    }
  };

  const handleUploadImagesClick = () => {
    if (imageInputRef.current) imageInputRef.current.click();
  };

  const handleImagesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    onUploadImages(files);

    const nextDraft = {
      ...draft,
      images: `uploaded:${(selectedUploadedImages?.length || 0) + files.length}`,
    };
    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    const fileLabel = files.length === 1 ? '1 image' : `${files.length} images`;
    const uploadedMessage = `Uploaded ${fileLabel} successfully.`;
    const followup = nextStage === 'complete'
      ? 'Great! Basic listing details complete ho gayi hain. Ab aap mujh se koi bhi sawal kar sakte hain (pricing, title, description, strategy).'
      : getPromptForStage(nextStage);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: uploadedMessage },
      { role: 'assistant', text: followup },
    ]);

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleSkipImages = () => {
    if (isReplyLoading) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'images') return;

    const nextDraft = { ...draft, images: 'skip' };
    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    const followup = nextStage === 'complete'
      ? 'Great! Basic listing details complete ho gayi hain. Ab aap mujh se koi bhi sawal kar sakte hain (pricing, title, description, strategy).'
      : getPromptForStage(nextStage);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: 'Skip images for now' },
      { role: 'assistant', text: followup },
    ]);
  };

  const handlePurposeQuickSelect = (purposeValue) => {
    if (isReplyLoading) return;
    const purposeText = String(purposeValue || '').trim();
    if (!purposeText) return;

    const stage = getCurrentStage(draft);
    if (stage !== 'purpose') return;

    const userMessage = { role: 'user', text: purposeText };
    const { ok, nextDraft } = applyAnswerToDraft('purpose', purposeText, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    const followup = nextStage === 'complete'
      ? 'Great! Basic listing details complete ho gayi hain. Ab aap mujh se koi bhi sawal kar sakte hain.'
      : `Great, aap ne ${purposeText} choose kiya. ${getPromptForStage(nextStage)}`;

    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: followup }]);
  };

  const handleUseProfileQuickSelect = (value) => {
    if (isReplyLoading) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'useProfileContact') return;
    const textValue = value === 'yes' ? 'Yes' : 'No';

    const userMessage = { role: 'user', text: textValue };
    const { ok, nextDraft } = applyAnswerToDraft('useProfileContact', textValue, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: getPromptForStage(nextStage) }]);
  };

  const handlePropertyTypeQuickSelect = (value) => {
    if (isReplyLoading) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'propertyType') return;

    const selectedType = String(value || '').trim();
    if (!selectedType) return;

    const userMessage = { role: 'user', text: selectedType };
    const { ok, nextDraft } = applyAnswerToDraft('propertyType', selectedType, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: getPromptForStage(nextStage) }]);
  };

  const handleSubTypeQuickSelect = (value) => {
    if (isReplyLoading) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'subType') return;
    const selectedSubType = String(value || '').trim();
    if (!selectedSubType) return;

    const userMessage = { role: 'user', text: selectedSubType };
    const { ok, nextDraft } = applyAnswerToDraft('subType', selectedSubType, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: getPromptForStage(nextStage) }]);
  };

  const activeStage = getCurrentStage(draft);

  return (
    <PropertyLayout
      stepText=""
      progressPercent={0}
      showProgress={false}
      pageClassName="aiChatbotPage"
      contentClassName="aiChatbotContent"
    >
      <div className="aiChatbotShell">
        <div className="chatBlock aiChatbotBlock aiChatbotMessages">
          {messages.map((message, index) =>
            message.role === 'assistant' ? (
              <BotMessage key={`a-${index}`} bubbleClassName="questionBubble">
                <AssistantTypewriterText text={message.text} />
              </BotMessage>
            ) : (
              <UserMessage key={`u-${index}`}>{message.text}</UserMessage>
            )
          )}
          {isReplyLoading && (
            <BotMessage bubbleClassName="questionBubble">
              Thinking...
            </BotMessage>
          )}
        {activeStage === 'purpose' && (
          <div className="aiPurposeInlineOptions">
            {CHATBOT_PURPOSE_OPTIONS.map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handlePurposeQuickSelect(item)}
                disabled={isReplyLoading}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'propertyType' && (
          <div className="aiPurposeInlineOptions">
            {CHATBOT_PROPERTY_TYPE_OPTIONS.map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handlePropertyTypeQuickSelect(item)}
                disabled={isReplyLoading}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'subType' && (
          <div className="aiPurposeInlineOptions">
            {(CHATBOT_SUB_TYPE_OPTIONS[getPropertyGroup(draft?.propertyType)] || []).map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handleSubTypeQuickSelect(item)}
                disabled={isReplyLoading}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'useProfileContact' && hasProfileContact && (
          <div className="aiPurposeInlineOptions">
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={() => handleUseProfileQuickSelect('yes')}
              disabled={isReplyLoading}
            >
              Yes
            </button>
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={() => handleUseProfileQuickSelect('no')}
              disabled={isReplyLoading}
            >
              No
            </button>
          </div>
        )}
        {activeStage === 'images' && (
          <div className="aiPurposeInlineOptions">
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={handleUploadImagesClick}
              disabled={isReplyLoading}
            >
              Upload Images
            </button>
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={handleSkipImages}
              disabled={isReplyLoading}
            >
              Skip
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleImagesSelected}
            />
          </div>
        )}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="aiChatbotComposerBar">
          <div className="aiChatbotInputRow">
            <input
              className="addressInput aiChatbotTextInput"
              placeholder="Yahan apna message likhein..."
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSend();
              }}
              disabled={isReplyLoading}
            />
            <button className="sendBtn aiChatbotSendBtn" onClick={handleSend} disabled={isReplyLoading || !inputText.trim()}>
              <LuSend />
            </button>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}

function PublishPage({
  title,
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
          <div className="publishTopInfo">
            <h1 className="publishListingTitle">{title || 'Property Listing'}</h1>
            <div className="publishPriceBlock">
              <h3>{price || 'Rs 350,000'}</h3>
              <p className="publishAddress"><LuMapPin /> {address || '123 Main St, Downtown'}</p>
            </div>
          </div>
          <div className="publishMeta">
            <div className="publishMetaItem">
              <span><LuRuler /></span>
              <div className="publishMetaText">
                <strong>Size</strong>
                <em>{formattedSize}</em>
              </div>
            </div>
            <div className="publishMetaItem">
              <span><LuBedDouble /></span>
              <div className="publishMetaText">
                <strong>Bedrooms</strong>
                <em>{bedrooms || '5'}</em>
              </div>
            </div>
            <div className="publishMetaItem">
              <span><LuBath /></span>
              <div className="publishMetaText">
                <strong>Bathrooms</strong>
                <em>{bathrooms || '4'}</em>
              </div>
            </div>
          </div>
          <h4>Key Features</h4>
          <div className="publishFeatures">
            <span><span className="publishFeatureIcon"><LuCheck /></span> {getFeatureText(features)}</span>
            <span><span className="publishFeatureIcon"><LuCheck /></span> Walk-in Closets</span>
            <span><span className="publishFeatureIcon"><LuCheck /></span> Gym/Fitness Center</span>
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
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [selectedPropertyGroup, setSelectedPropertyGroup] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedPrice, setSelectedPrice] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSizeUnit, setSelectedSizeUnit] = useState('Marla');
  const [selectedBedrooms, setSelectedBedrooms] = useState('');
  const [selectedBathrooms, setSelectedBathrooms] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedContactNumber, setSelectedContactNumber] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedImageFiles, setUploadedImageFiles] = useState([]); 
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('listingMode');
  const authUserForWelcome = getStoredAuthUser();
  const welcomeName = getDisplayNameFromUser(authUserForWelcome);
  const profileContactNumber = getContactFromUser(authUserForWelcome);
  const profileEmail = getEmailFromUser(authUserForWelcome);

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
    const rawContactNumber = selectedContactNumber || getContactFromUser(authUser) || '03331234567';
    const contactNumber = toApiPakistanPhone(rawContactNumber) || '+923331234567';
    const userEmail = selectedEmail || getEmailFromUser(authUser) || 'dummy@property.com';

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
      title: generatedTitle || `${selectedPropertyType} for ${selectedPurpose}`,
      description: generatedDescription,
      contacts: [contactNumber],
      ...(userEmail ? { email: userEmail } : {}),
      address: selectedAddress,
      bedrooms: selectedBedrooms,
      bathrooms: selectedBathrooms,
      features: Array.isArray(selectedFeature) ? selectedFeature : [selectedFeature],
    };

    try {
      const configuredApiEndpoint = (process.env.REACT_APP_PROPERTY_API_URL || '').trim();
      const absoluteApiEndpoint =
        `${normalizeApiBase(process.env.REACT_APP_API_BASE_URL || 'https://admin.pakistanproperty.com')}/api/agent/properties`;
      const primaryApiEndpoint = configuredApiEndpoint || absoluteApiEndpoint;
      const fallbackProxyEndpoint = '/api/agent/properties';
      const apiEndpointsToTry = process.env.NODE_ENV === 'development'
        ? [primaryApiEndpoint, fallbackProxyEndpoint]
        : [primaryApiEndpoint];
      const authToken =
        (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(authUser) || '').trim();

      if (!authToken) {
        throw new Error('Missing API token. Please login again and ensure token is stored.');
      }

      const buildFormData = () => {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value);
          }
        });
        uploadedImageFiles.forEach((file) => formData.append('images[]', file));
        return formData;
      };

      const parseResponseBody = async (response) => {
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const rawResponseText = await response.text();
        let parsedResponse = null;
        if (rawResponseText) {
          try {
            parsedResponse = JSON.parse(rawResponseText);
          } catch {
            parsedResponse = null;
          }
        }
        const trimmedResponseText = rawResponseText.trim();
        const looksLikeHtmlResponse =
          contentType.includes('text/html') ||
          trimmedResponseText.toLowerCase().startsWith('<!doctype html') ||
          trimmedResponseText.toLowerCase().startsWith('<html');

        return { parsedResponse, rawResponseText, trimmedResponseText, looksLikeHtmlResponse };
      };

      let lastError = null;

      for (const apiEndpoint of apiEndpointsToTry) {
        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: buildFormData(),
          });

          const { parsedResponse, rawResponseText, trimmedResponseText, looksLikeHtmlResponse } =
            await parseResponseBody(response);

          if (!response.ok) {
            if (looksLikeHtmlResponse && trimmedResponseText.includes('Cannot POST')) {
              throw new Error('Publish API endpoint not found. Please verify property API URL configuration.');
            }
            if (response.status === 401 || response.status === 403) {
              throw new Error('Unauthorized token. Please login again to refresh API token.');
            }
            const serverMessage =
              parsedResponse?.message ||
              parsedResponse?.error ||
              rawResponseText ||
              'Unknown server error';
            throw new Error(`Request failed (${response.status}). ${serverMessage}`);
          }

          if (looksLikeHtmlResponse) {
            throw new Error('API returned HTML instead of JSON. Please check auth token and API endpoint.');
          }

          setPublishMessage('Property saved successfully.');
          return;
        }
        catch (error) {
          lastError = error;
          const message = String(error?.message || '').toLowerCase();
          const isNetworkLikeError =
            error?.name === 'TypeError' ||
            message.includes('failed to fetch') ||
            message.includes('network') ||
            message.includes('cors') ||
            message.includes('load failed');
          const hasAnotherEndpoint = apiEndpoint !== apiEndpointsToTry[apiEndpointsToTry.length - 1];
          if (hasAnotherEndpoint && isNetworkLikeError) continue;
          throw error;
        }
      }

      if (lastError) throw lastError;
    } catch (error) {
      const isNetworkLikeError =
        error?.name === 'TypeError' ||
        String(error?.message || '').toLowerCase().includes('failed to fetch') ||
        String(error?.message || '').toLowerCase().includes('network') ||
        String(error?.message || '').toLowerCase().includes('cors');
      if (isNetworkLikeError) {
        setPublishMessage(
          'Failed to save property. Network/CORS blocked request. Login again, then restart dev server and retry.'
        );
      } else {
        setPublishMessage(`Failed to save property. ${error.message}`);
      }
    } finally {
      setPublishLoading(false);
    }
  };

  switch (currentPage) {
    case 'chatbot':
      return (
        <AiChatbotListingPage
          selectedPurpose={selectedPurpose}
          selectedPropertyType={selectedPropertyType}
          selectedAddress={selectedAddress}
          selectedPrice={selectedPrice}
          selectedSize={selectedSize}
          selectedSizeUnit={selectedSizeUnit}
          selectedBedrooms={selectedBedrooms}
          selectedBathrooms={selectedBathrooms}
          selectedFeature={selectedFeature}
          selectedUploadedImages={uploadedImages}
          selectedContactNumber={selectedContactNumber}
          selectedEmail={selectedEmail}
          profileContactNumber={profileContactNumber}
          profileEmail={profileEmail}
          generatedTitle={generatedTitle}
          generatedDescription={generatedDescription}
          onSetPurpose={setSelectedPurpose}
          onSetPropertyGroup={setSelectedPropertyGroup}
          onSetPropertyType={setSelectedPropertyType}
          onSetAddress={setSelectedAddress}
          onSetPrice={setSelectedPrice}
          onSetSize={(size, unit) => {
            setSelectedSize(size);
            setSelectedSizeUnit(unit);
          }}
          onSetBedrooms={setSelectedBedrooms}
          onSetBathrooms={setSelectedBathrooms}
          onSetFeature={setSelectedFeature}
          onUploadImages={(files) => {
            const newImages = files.map((file) => URL.createObjectURL(file));
            setUploadedImageFiles((prev) => [...prev, ...files]);
            setUploadedImages((prev) => [...prev, ...newImages]);
          }}
          onSetContactNumber={setSelectedContactNumber}
          onSetEmail={setSelectedEmail}
        />
      );
    case 'listingMode':
      return (
        <ListingModePage
          onAiListing={() => setCurrentPage('welcome')}
          onManualListing={() => {}}
        />
      );
    case 'welcome':
      return <WelcomePage welcomeName={welcomeName} onStart={() => setCurrentPage('chatbot')} />;
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
      return (
        <PropertyTypePage
          onSelectPropertyType={(type, group) => {
            setSelectedPropertyType(type);
            setSelectedPropertyGroup(group || '');
            setCurrentPage('address');
          }}
          onBack={() => setCurrentPage('purpose')}
        />
      );
    case 'address':
      return <AddressPage selectedPropertyType={selectedPropertyType} onBack={() => setCurrentPage('propertyType')} onSendAddress={(v) => { setSelectedAddress(v); setCurrentPage('price'); }} />;
    case 'price':
      return <PricePage address={selectedAddress} onBack={() => setCurrentPage('address')} onSelectPrice={(v) => { setSelectedPrice(formatPriceWithRs(v)); setCurrentPage('review'); }} />;
    case 'review':
      return <SizePage price={selectedPrice} onBack={() => setCurrentPage('price')} onSendSize={(size, unit) => { setSelectedSize(size); setSelectedSizeUnit(unit); setCurrentPage('ammenties'); }} />;
    case 'ammenties':
      return (
        <AmenitiesPage
          size={selectedSize}
          isPlotType={selectedPropertyGroup === 'Plots'}
          onBack={() => setCurrentPage('review')}
          onSendBedrooms={(v) => { setSelectedBedrooms(v); setCurrentPage('ammenties2'); }}
        />
      );
    case 'ammenties2':
      return (
        <AmenitiesPage2
          bedrooms={selectedBedrooms}
          isPlotType={selectedPropertyGroup === 'Plots'}
          onBack={() => setCurrentPage('ammenties')}
          onSendBathrooms={(v) => { setSelectedBathrooms(v); setCurrentPage('ammenties3'); }}
        />
      );
    case 'ammenties3':
      return (
        <AmenitiesPage3
          bathrooms={selectedBathrooms}
          isPlotType={selectedPropertyGroup === 'Plots'}
          onBack={() => setCurrentPage('ammenties2')}
          onSendFeatures={(v) => { setSelectedFeature(v); setCurrentPage('ammenties4'); }}
        />
      );
    case 'ammenties4':
      return (
        <AmenitiesPage4
          feature={selectedFeature}
          isPlotType={selectedPropertyGroup === 'Plots'}
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
          onContinue={() => setCurrentPage('aiDraft')}
        />
      );
    case 'aiDraft':
      return (
        <AiContentDraftPage
          onBack={() => setCurrentPage('picture')}
          onNext={() => setCurrentPage('genrate')}
          listingContext={{
            purpose: selectedPurpose,
            propertyType: selectedPropertyType,
            address: selectedAddress,
            price: selectedPrice,
            size: selectedSize,
            sizeUnit: selectedSizeUnit,
            bedrooms: selectedBedrooms,
            bathrooms: selectedBathrooms,
            features: selectedFeature,
          }}
          aiTitle={generatedTitle}
          aiDescription={generatedDescription}
          onTitleGenerated={setGeneratedTitle}
          onDescriptionGenerated={setGeneratedDescription}
        />
      );
    case 'genrate':
      return <GeneratePage onComplete={() => setCurrentPage('publish')} />;
    case 'publish':
      return (
        <PublishPage
          title={generatedTitle || `${selectedPropertyType} for ${selectedPurpose}`}
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
