import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LuX } from 'react-icons/lu';

function PpSageCustomSelect({ id, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const placeholderOption = options[0];
  const showSelectedStyle = (opt) =>
    opt === value && (placeholderOption === undefined || value !== placeholderOption);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  return (
    <div className="ppSageSelect" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="ppSageSelectTrigger ppAmenitySelect"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="ppSageSelectValue">{value}</span>
        <span className="ppSageSelectChevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="ppSageSelectList" role="listbox">
          {options.map((opt) => (
            <li key={opt} className="ppSageSelectItem" role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                className={`ppSageSelectOption ${showSelectedStyle(opt) ? 'isSelected' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const AMENITIES_SIDEBAR_TABS = [
  { id: 'main', label: 'Main Features' },
  { id: 'community', label: 'Community Features' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'healthcare', label: 'Healthcare Recreational' },
  { id: 'business', label: 'Business and Communication' },
  { id: 'nearby', label: 'Nearby Locations' },
  { id: 'other', label: 'Other Facilities' },
];

const MAIN_SELECTS = [
  {
    key: 'flooring',
    label: 'Flooring',
    options: ['Select option', 'Tiles', 'Marble', 'Wood', 'Carpet', 'Granite', 'Other'],
  },
  {
    key: 'electricityBackup',
    label: 'Electricity Backup',
    options: ['Select option', 'None', 'UPS', 'Generator', 'Solar', 'Solar + UPS', 'Other'],
  },
];

const MAIN_INPUTS = [
  { key: 'view', label: 'View', placeholder: 'Enter Data' },
  { key: 'builtInYear', label: 'Built-in Year', placeholder: 'Enter Data' },
  { key: 'floors', label: 'Floors', placeholder: 'Enter Data' },
  { key: 'otherMainFeatures', label: 'Other Main Features', placeholder: 'Enter Data' },
  { key: 'parkingSpaces', label: 'Parking Spaces', placeholder: 'Enter Data' },
];

const STATIC_MAIN_CHECKBOXES = [
  'Central Air Conditioning',
  'Double Glazed Windows',
  'Furnished',
  'Water Disposal',
  'Central Heating',
  'Basement',
];

const TAB_FILTERS = {
  community: /\b(pool|gym|club|community|garden|playground|cctv|elevator|lobby|reception|security|boundary|gated)\b/i,
  rooms: /\b(bed|kitchen|dining|laundry|servant|store|study|drawing|powder|tv lounge)\b/i,
  healthcare: /\b(hospital|clinic|jogging|sports|yoga|spa|fitness|recreation)\b/i,
  business: /\b(internet|broadband|fiber|intercom|satellite|cable|wifi|wi-?fi)\b/i,
  nearby: /\b(school|mosque|market|mall|highway|metro|bus|masjid|university|college)\b/i,
};

export function assignApiNamesToTabs(apiNames) {
  const list = [...new Set((apiNames || []).map((n) => String(n || '').trim()).filter(Boolean))];
  const buckets = {
    main: [],
    community: [],
    rooms: [],
    healthcare: [],
    business: [],
    nearby: [],
    other: [],
  };
  for (const name of list) {
    let placed = false;
    const entries = Object.entries(TAB_FILTERS);
    for (let i = 0; i < entries.length; i += 1) {
      const [tabId, regex] = entries[i];
      if (regex.test(name)) {
        buckets[tabId].push(name);
        placed = true;
        break;
      }
    }
    if (!placed) buckets.other.push(name);
  }
  return buckets;
}

export function buildAmenitiesSummary(formValues, checkedLabels) {
  const parts = [];
  const selectLabels = { flooring: 'Flooring', electricityBackup: 'Electricity Backup' };
  Object.entries(selectLabels).forEach(([key, label]) => {
    const v = String(formValues[key] || '').trim();
    if (v && !/^select option$/i.test(v)) parts.push(`${label}: ${v}`);
  });
  MAIN_INPUTS.forEach(({ key, label }) => {
    const v = String(formValues[key] || '').trim();
    if (v) parts.push(`${label}: ${v}`);
  });
  const checks = [...checkedLabels].filter(Boolean);
  if (checks.length) parts.push(checks.join(', '));
  return parts.join('; ').trim();
}

function CheckboxGrid({ items, checked, onToggle, disabled }) {
  if (!items.length) {
    return <p className="ppAmenityTabEmpty">Is category mein server se koi extra item nahi mila.</p>;
  }
  const mid = Math.ceil(items.length / 2);
  const col1 = items.slice(0, mid);
  const col2 = items.slice(mid);
  return (
    <div className="ppAmenityCheckboxGrid">
      <div className="ppAmenityCheckboxCol">
        {col1.map((item) => (
          <label key={item} className="ppAmenityCheckboxRow">
            <input
              type="checkbox"
              checked={checked.has(item)}
              onChange={() => onToggle(item)}
              disabled={disabled}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <div className="ppAmenityCheckboxCol">
        {col2.map((item) => (
          <label key={item} className="ppAmenityCheckboxRow">
            <input
              type="checkbox"
              checked={checked.has(item)}
              onChange={() => onToggle(item)}
              disabled={disabled}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_SUBTITLE_EN =
  'Enjoy modern spaces, essential facilities, and thoughtful details—bringing comfort, convenience, and style together in one place.';

const DEFAULT_SUBTITLE_UR =
  'Modern spaces, zaroori facilities aur behtar details — araam, suhulat aur style aik jagah.';

/**
 * Pakistan Property–style Features & Amenities UI (sidebar + white card).
 * Use inside a page or inside a full-screen overlay (chatbot).
 */
export default function FeaturesAmenitiesPanel({
  apiAmenityNames = [],
  amenitiesLoading = false,
  onCancel,
  onSubmit,
  subtitle,
  labels,
}) {
  const reactId = useId();
  const id = (key) => `${reactId}-${key}`;

  const [activeTab, setActiveTab] = useState('main');
  const [form, setForm] = useState(() => {
    const initial = {};
    MAIN_SELECTS.forEach(({ key, options }) => { initial[key] = options[0]; });
    MAIN_INPUTS.forEach(({ key }) => { initial[key] = ''; });
    return initial;
  });
  const [checked, setChecked] = useState(() => new Set());

  const tabBuckets = useMemo(() => assignApiNamesToTabs(apiAmenityNames), [apiAmenityNames]);

  const mainTabCheckboxItems = useMemo(() => {
    const fromApiMain = tabBuckets.main || [];
    const merged = [...STATIC_MAIN_CHECKBOXES, ...fromApiMain];
    return [...new Set(merged)];
  }, [tabBuckets]);

  const toggleCheck = (label) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleAdd = () => {
    const summary = buildAmenitiesSummary(form, checked);
    onSubmit?.(summary || '');
  };

  const tabItemsForActive = activeTab === 'main'
    ? mainTabCheckboxItems
    : (tabBuckets[activeTab] || []);

  const copy = {
    cancel: labels?.cancel || 'Cancel',
    add: labels?.add || 'Add Amenities',
    loading: labels?.loading || 'Pakistan Property se amenities load ho rahi hain...',
    closeAria: labels?.closeAria || 'Close',
  };

  const asideText = subtitle || DEFAULT_SUBTITLE_EN;

  return (
    <div className="ppFeaturesAmenitiesRoot ppFeaturesAmenitiesRootModal">
      <aside className="ppFeaturesAmenitiesAside">
        <h2 className="ppFeaturesAmenitiesTitle">Features &amp; Amenities</h2>
        <p className="ppFeaturesAmenitiesSubtitle">{asideText}</p>
        <nav className="ppFeaturesAmenitiesNav" aria-label="Amenity categories">
          {AMENITIES_SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`ppFeaturesAmenitiesNavBtn ${activeTab === tab.id ? 'isActive' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="ppFeaturesAmenitiesModal">
        <button type="button" className="ppFeaturesAmenitiesClose" aria-label={copy.closeAria} onClick={onCancel}>
          <LuX size={22} />
        </button>

        <div className="ppFeaturesAmenitiesModalBody">
          {amenitiesLoading && (
            <p className="ppAmenityLoadingBanner">{copy.loading}</p>
          )}

          {activeTab === 'main' && (
            <>
              <div className="ppAmenityFormGrid">
                {MAIN_SELECTS.map(({ key, label, options }) => (
                  <div key={key} className="ppAmenityField">
                    <label htmlFor={id(key)}>{label}</label>
                    <PpSageCustomSelect
                      id={id(key)}
                      value={form[key]}
                      options={options}
                      disabled={amenitiesLoading}
                      onChange={(next) => setForm((f) => ({ ...f, [key]: next }))}
                    />
                  </div>
                ))}
                {MAIN_INPUTS.map(({ key, label, placeholder }) => (
                  <div key={key} className="ppAmenityField">
                    <label htmlFor={id(key)}>{label}</label>
                    <input
                      id={id(key)}
                      className="ppAmenityInput"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <hr className="ppAmenityDivider" />
              <CheckboxGrid
                items={mainTabCheckboxItems}
                checked={checked}
                onToggle={toggleCheck}
                disabled={amenitiesLoading}
              />
            </>
          )}

          {activeTab !== 'main' && (
            <div className="ppAmenityTabPanel">
              <h3 className="ppAmenityTabHeading">
                {AMENITIES_SIDEBAR_TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <CheckboxGrid
                items={tabItemsForActive}
                checked={checked}
                onToggle={toggleCheck}
                disabled={amenitiesLoading}
              />
            </div>
          )}
        </div>

        <footer className="ppFeaturesAmenitiesFooter">
          <button type="button" className="ppAmenityCancelBtn" onClick={onCancel}>
            {copy.cancel}
          </button>
          <button
            type="button"
            className="ppAmenityPrimaryBtn"
            onClick={handleAdd}
            disabled={amenitiesLoading}
          >
            {copy.add}
          </button>
        </footer>
      </div>
    </div>
  );
}

export { DEFAULT_SUBTITLE_EN, DEFAULT_SUBTITLE_UR };
