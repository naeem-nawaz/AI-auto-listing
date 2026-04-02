import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import logo from '../../images/14.png';
import bg from '../../images/bg.jpg';
import assistantIcon from '../../images/div.png';
import {
  LuBath,
  LuBedDouble,
  LuCheck,
  LuMail,
  LuMapPin,
  LuPhone,
  LuPlus,
  LuRuler,
  LuSend,
  LuSparkles,
  LuUpload,
} from "react-icons/lu";
import { BotMessage, UserMessage } from '../material/ChatMaterial';
import PropertyLayout from '../material/PropertyLayout';
import OptionTabs from '../material/OptionTabs';
import FeaturesAmenitiesPage from './FeaturesAmenitiesPage';
import FeaturesAmenitiesPanel, { DEFAULT_SUBTITLE_EN, DEFAULT_SUBTITLE_UR } from './FeaturesAmenitiesPanel';
import {
  BATHROOM_OPTIONS,
  BEDROOM_OPTIONS,
  COMMERCIAL_PROPERTY_TYPES,
  HOME_PROPERTY_TYPES,
  PLOT_PROPERTY_TYPES,
  PRICE_OPTIONS,
  PROPERTY_TYPE_GROUPS,
  PURPOSE_OPTIONS,
  SIZE_UNITS,
} from '../material/materialData';
import citiesList from '../../citiesLocation/citiesList/cities.json';

const CHATBOT_PURPOSE_OPTIONS = ['Sell', 'Rent', 'Lease'];
const CHATBOT_PROPERTY_OPTIONS_BY_PURPOSE = {
  Sell: ['Home', 'Commercial', 'Plot'],
  Rent: ['Home', 'Commercial'],
  Lease: ['Home', 'Commercial'],
};
const CHATBOT_SUB_TYPE_OPTIONS = {
  Home: ['House', 'Flat', 'Upper Portion', 'Lower Portion', 'Farm House', 'Room', 'Penthouse'],
  Plot: ['Residential Plot', 'Commercial Plot', 'Agricultural Land', 'Industrial Land', 'Plot File', 'Plot Form'],
  Commercial: ['Office', 'Shop', 'Warehouse Portion', 'Factory', 'Building', 'Other'],
};
const CHATBOT_ALL_SUB_TYPES = Object.values(CHATBOT_SUB_TYPE_OPTIONS).flat();
const CHATBOT_SUB_CATEGORY_ID_BY_NAME = {
  House: 1,
  Flat: 2,
  'Upper Portion': 3,
  'Lower Portion': 4,
  'Farm House': 5,
  Room: 6,
  Penthouse: 7,
  'Residential Plot': 8,
  'Commercial Plot': 9,
  'Agricultural Land': 10,
  'Industrial Land': 11,
  'Plot File': 12,
  'Plot Form': 13,
  Office: 14,
  Shop: 15,
  'Warehouse Portion': 16,
  Factory: 17,
  Building: 18,
  Other: 19,
};
const getAllowedPropertyTypesForPurpose = (purpose) => {
  const key = String(purpose || '').trim();
  return CHATBOT_PROPERTY_OPTIONS_BY_PURPOSE[key] || CHATBOT_PROPERTY_OPTIONS_BY_PURPOSE.Sell;
};
const MIN_REQUIRED_IMAGES = 3;
const OFFLINE_LISTINGS_QUEUE_KEY = 'pp_offline_publish_queue_v1';
const OFFLINE_FLUSH_BATCH_SIZE = 5;
const BOT_TYPING_DELAY_MS = 1000;
const ASSISTANT_WORD_REVEAL_MS = 42;
const ASSISTANT_BUBBLE_GAP_MS = 520;
const ASSISTANT_WELCOME_BATCH_ID = 'welcome';

function newAssistantBatchId() {
  return `ab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function countAssistantWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function estimateAssistantRevealMs(text) {
  const w = Math.max(1, countAssistantWords(text));
  return w * ASSISTANT_WORD_REVEAL_MS;
}

function getAssistantBatchStartDelay(messages, index) {
  const cur = messages[index];
  if (!cur || cur.role !== 'assistant') return 0;
  const batchId = cur.assistantBatchId;
  if (batchId === undefined || batchId === null) return 0;
  let delay = 0;
  for (let j = 0; j < index; j += 1) {
    const m = messages[j];
    if (m.role !== 'assistant' || m.assistantBatchId !== batchId) continue;
    delay += estimateAssistantRevealMs(m.text) + ASSISTANT_BUBBLE_GAP_MS;
  }
  return delay;
}

/** Total time for sequential word reveal + gaps (matches AiAssistantBubbleRow + AssistantTypewriterText). */
function estimateSequentialAssistantStreamMs(texts) {
  const list = (Array.isArray(texts) ? texts : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  if (!list.length) return 0;
  let ms = 0;
  for (let i = 0; i < list.length; i += 1) {
    ms += estimateAssistantRevealMs(list[i]);
    if (i < list.length - 1) ms += ASSISTANT_BUBBLE_GAP_MS;
  }
  return ms + 200;
}

const PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE = '👋 Hello! I am your AI property assistant. Share your listing details, and I will capture them step by step.';
const PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION = 'What is the purpose of your listing?';
const AMENITIES_MODAL_SUBTITLE_AR = 'جدید جگہیں، ضروری سہولیات اور بہتر تفصیلات — آرام، سہولت اور سٹائل ایک ساتھ۔';

/**
 * Arabic-script Urdu is stripped by /[^\w\s]/ (JS \w is ASCII-only). Append Latin tokens so
 * parsePurpose, inferPropertyTypeFromText, location heuristics, and price hints still work.
 */
function urduScriptLatinHints(text) {
  const s = String(text || '');
  if (!/[\u0600-\u06FF]/.test(s)) return '';
  const hints = [];
  if (/فروخت|بیچنا|بیچنے|برائے\s*فروخت/.test(s)) hints.push('sell', 'sale', 'for sale');
  if (/کرایہ|کرائے|کرایے|کِرایہ/.test(s)) hints.push('rent', 'for rent');
  if (/لیز|اجارہ|ایجارہ|اجارے/.test(s)) hints.push('lease');
  if (/گھر/.test(s)) hints.push('house');
  if (/فلیٹ|اپارٹمنٹ/.test(s)) hints.push('flat', 'apartment');
  if (/پلاٹ|زمین\s*کا\s*قطعہ/.test(s)) hints.push('plot');
  if (/دکان|دکانیں/.test(s)) hints.push('shop');
  if (/دفتر|آفس/.test(s)) hints.push('office');
  if (/مرلہ|مرلے|مَرْلَہ/.test(s)) hints.push('marla');
  if (/کنال|کَنال|کانال/.test(s)) hints.push('kanal');
  if (/قیمت|مالیت|قدر/.test(s)) hints.push('price', 'qimat');
  if (/کروڑ|کَرور/.test(s)) hints.push('crore', 'cr');
  if (/لاکھ|لَاکھ/.test(s)) hints.push('lakh', 'lac');
  if (/روپے|پاکستانی\s*روپے|PKR|پے\s*کے\s*آر/i.test(s)) hints.push('pkr', 'rs');
  if (/ڈی\s*ایچ\s*ای|ڈی۔\s*ایچ۔\s*ای|ڈی\s*\.\s*ایچ\s*\.\s*ای|DHA/i.test(s)) hints.push('dha');
  if (/فیز|پھیس/.test(s)) hints.push('phase');
  if (/بلاک|بلاکوں/.test(s)) hints.push('block');
  if (/سیکٹر/.test(s)) hints.push('sector');
  if (/لاہور/.test(s)) hints.push('lahore');
  if (/کراچی/.test(s)) hints.push('karachi');
  if (/اسلام\s*آباد/.test(s)) hints.push('islamabad');
  if (/راولپنڈی/.test(s)) hints.push('rawalpindi');
  if (/فیصل\s*آباد/.test(s)) hints.push('faisalabad');
  if (/ملتان/.test(s)) hints.push('multan');
  if (/پشاور/.test(s)) hints.push('peshawar');
  if (/واقع|میں\s*واقع|مقام|پتہ|لوکیشن/i.test(s)) hints.push('located', 'location', 'address');
  return hints.join(' ');
}

/** DHA + phase from Urdu (فیز) or Latin hints — canonical for area DB lookup. */
function extractCanonicalDhaPhaseLabel(text) {
  const full = String(text || '');
  if (!full) return '';
  const uzPh = full.match(/فیز\s*(\d{1,2}|[\u06F0-\u06F9]{1,2})/);
  let n = uzPh?.[1];
  if (n && /[\u06F0-\u06F9]/.test(n)) {
    const map = {
      '\u06F0': '0', '\u06F1': '1', '\u06F2': '2', '\u06F3': '3', '\u06F4': '4',
      '\u06F5': '5', '\u06F6': '6', '\u06F7': '7', '\u06F8': '8', '\u06F9': '9',
    };
    n = n.split('').map((ch) => map[ch] || ch).join('');
  }
  if (n) return `DHA Phase ${n}`;
  const aug = /[\u0600-\u06FF]/.test(full) ? `${full} ${urduScriptLatinHints(full)}` : full;
  const loose = aug.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const m = loose.match(/\bdha\s*(?:phase|pahse|phse)?\s*(\d{1,2})\b/i)
    || loose.match(/\bphase\s*(\d{1,2})\b/i)
    || loose.match(/(\d{1,2})\s+dha\s+phase\b/i);
  return m?.[1] ? `DHA Phase ${m[1]}` : '';
}

/** Too short / neutral to infer language — keep last conversation language. */
function isAmbiguousLanguageInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return true;
  if (/[\u0600-\u06FF]/.test(raw)) return false;
  const lower = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (lower.length <= 2) return true;
  if (/^[\d\s,.\-+()]+$/.test(lower)) return true;
  const tokens = lower.split(' ');
  if (tokens.length === 1 && /^[a-z]+$/i.test(tokens[0]) && tokens[0].length <= 3) return true;
  const neutral = new Set([
    'ok', 'okay', 'k', 'kk', 'yes', 'no', 'yeah', 'yep', 'nope', 'thanks', 'thank you',
    'skip', 'done', 'next', 'haan', 'han', 'na', 'ji', 'jee', 'theek', 'thik', 'theek hai',
    'acha', 'accha', 'hmm', 'hm', 'shukriya',
  ]);
  if (neutral.has(lower)) return true;
  return false;
}

/** Classify user text: english | romanUrdu | urdu (Arabic script). */
function detectResponseStyle(text) {
  const raw = String(text || '').trim();
  if (!raw) return 'english';
  if (/[\u0600-\u06FF]/.test(raw)) return 'urdu';

  const lower = raw.toLowerCase();
  const englishPhraseRes = [
    /\bi\s+want\b/,
    /\bi\s+(am|would|'m|have|need)\b/,
    /\bplease\b/,
    /\bmy\s+property\b/,
    /\blocated\s+in\b/,
    /\bfor\s+sale\b/,
    /\bfor\s+rent\b/,
    /\bto\s+rent\b/,
    /\bto\s+sell\b/,
    /\blooking\s+to\b/,
    /\bwould\s+like\b/,
    /\bthe\s+(shop|house|flat|office|plot|building|store)\b/,
    /\brent(ed|ing)?\s+(a\s+|the\s+)?(shop|house|flat|plot|office|place)\b/,
    /\bon\s+[\w\s]+road\b/,
    /\bin\s+(lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|bahawalpur|quetta|sialkot|gujranwala)\b/,
    /\bhow\s+much\b/,
    /\bwhat\s+is\b/,
  ];
  if (englishPhraseRes.some((re) => re.test(lower))) return 'english';

  const words = lower
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const romanUrduWords = new Set([
    'hai', 'hain', 'ho', 'hon', 'hoon', 'mein', 'main', 'mai', 'hum', 'aap', 'tum', 'ap', 'mujhe',
    'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'apna', 'apni', 'apne',
    'kya', 'kyun', 'kab', 'kahan', 'kaise', 'bhi', 'nahi', 'nahin', 'na',
    'acha', 'theek', 'zaroor', 'shukriya', 'batao', 'bataen', 'batayein', 'lijiye',
    'chahta', 'chahti', 'chahte', 'chahiye', 'karna', 'karne', 'karwa', 'karwani', 'karwana',
    'raha', 'rahi', 'rahe', 'raho', 'rahna', 'dunga', 'dungi', 'denge',
    'liye', 'wala', 'wali', 'wale', 'saath', 'se', 'par', 'pe', 'agar', 'magar', 'lekin',
    'yeh', 'ye', 'wo', 'woh', 'jin', 'jis', 'jisme', 'unka', 'unke', 'unki',
    'bechna', 'bech', 'lena', 'leni', 'lenay', 'dikhana', 'mil', 'milta',
  ]);

  let romanScore = 0;
  words.forEach((w) => {
    if (romanUrduWords.has(w)) romanScore += 1;
  });

  const romanPhrases = [
    'karna chahte',
    'karna chahti',
    'list karna',
    'bata dein',
    'bata den',
    'share karein',
    'share karen',
    'kitne hain',
    'kitna hai',
    'ke liye',
    'dena chahte',
    'lena chahte',
  ];
  romanPhrases.forEach((p) => {
    if (lower.includes(p)) romanScore += 2;
  });

  const englishListingWords = new Set([
    'want', 'rent', 'rented', 'leasing', 'lease', 'sell', 'sale', 'sold', 'shop', 'house', 'flat', 'office', 'plot',
    'road', 'street', 'avenue', 'marla', 'kanal', 'sqft', 'bedroom', 'bedrooms', 'bathroom', 'bathrooms',
    'price', 'size', 'area',
  ]);
  let englishScore = 0;
  words.forEach((w) => {
    if (englishListingWords.has(w)) englishScore += 1;
  });

  if (romanScore >= 3) return 'romanUrdu';
  if (romanScore > englishScore + 1) return 'romanUrdu';
  return 'english';
}

function formatPriceWithRs(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed
    .replace(/^((rs|pkr|₨)\.?\s*)+/i, '')
    .trim();
  if (!normalized) return '';
  const compact = normalized.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const compactMatch = compact.match(/^(\d+(?:\.\d+)?)\s*(crore|core|cor|croe|croar|cr|lakh|lac|million|billion|hazar|hazaar|thousand|k|m)?$/i);
  if (compactMatch) {
    const amount = Number(compactMatch[1]);
    const unit = String(compactMatch[2] || '').toLowerCase();
    if (!Number.isNaN(amount)) {
      const multipliers = {
        crore: 10000000,
        core: 10000000,
        cor: 10000000,
        croe: 10000000,
        croar: 10000000,
        cr: 10000000,
        lakh: 100000,
        lac: 100000,
        million: 1000000,
        billion: 1000000000,
        hazar: 1000,
        hazaar: 1000,
        thousand: 1000,
        k: 1000,
        m: 1000000,
      };
      const factor = multipliers[unit] || 1;
      const numericValue = Math.round(amount * factor);
      return `Rs ${numericValue.toLocaleString('en-US')}`;
    }
  }
  return `Rs ${normalized}`;
}

function getFeatureText(features) {
  if (Array.isArray(features) && features.length) return features.join(', ');
  if (typeof features === 'string' && features.trim()) return features;
  return '';
}

function parseFeatureTokens(text) {
  return String(text || '')
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchUserFeaturesToApiCatalog(userTokens, apiNames = []) {
  if (!Array.isArray(apiNames) || !apiNames.length) return userTokens.slice();
  const pairs = apiNames.map((a) => {
    const label = String(a || '').trim();
    return [label.toLowerCase(), label];
  });
  const out = [];
  const seen = new Set();
  for (const raw of userTokens) {
    const lu = String(raw || '').trim().toLowerCase();
    const hit = pairs.find(([k]) => k === lu);
    if (hit && !seen.has(hit[1])) {
      seen.add(hit[1]);
      out.push(hit[1]);
    }
  }
  return out;
}

function normalizeListingPropertyGroupLabel(group) {
  const g = String(group || '').trim().toLowerCase();
  if (g.includes('plot')) return 'Plot';
  if (g.includes('commercial')) return 'Commercial';
  return 'Home';
}

function resolveSubCategoryMetaForAmenities({ propertyGroup, subTypeName }) {
  const detectedGroup = normalizeListingPropertyGroupLabel(propertyGroup);
  const categoryIdMap = { Home: 1, Plot: 2, Commercial: 3 };
  const categoryId = categoryIdMap[detectedGroup] || 1;
  const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const subTypeAliases = {
    agricultural: 'Agricultural Land',
    'industry land': 'Industrial Land',
    'industrial land': 'Industrial Land',
  };

  let sub = String(subTypeName || '').trim();
  const alias = subTypeAliases[norm(sub)];
  if (alias) sub = alias;

  const groupSubTypes = CHATBOT_SUB_TYPE_OPTIONS[detectedGroup] || [];
  const selectedSubTypeMatched = groupSubTypes.find((item) => norm(item) === norm(sub));

  const fallbackSubCategoryName = detectedGroup === 'Commercial'
    ? 'Shop'
    : detectedGroup === 'Plot'
      ? 'Residential Plot'
      : 'House';
  const finalSubCategoryName = selectedSubTypeMatched || fallbackSubCategoryName;
  const subCategoryId = CHATBOT_SUB_CATEGORY_ID_BY_NAME[finalSubCategoryName]
    || CHATBOT_SUB_CATEGORY_ID_BY_NAME[fallbackSubCategoryName]
    || 1;

  return {
    detectedGroup,
    categoryId,
    subCategoryId,
    finalSubCategoryName,
  };
}

function normalizeApiBase(url) {
  return String(url || '').replace(/\/+$/, '');
}

const IMAGE_UPLOAD_MAX_EDGE = 1920;
const IMAGE_UPLOAD_TARGET_BYTES = 900 * 1024;

async function optimizeImageForUpload(file) {
  if (!(file instanceof File)) return file;
  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('image/')) return file;
  if (file.size <= IMAGE_UPLOAD_TARGET_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const sourceWidth = Number(image.width || 0);
    const sourceHeight = Number(image.height || 0);
    if (!sourceWidth || !sourceHeight) return file;

    const scale = Math.min(1, IMAGE_UPLOAD_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const outputType = 'image/jpeg';
    const qualities = [0.86, 0.76, 0.66, 0.56];
    let blob = null;
    for (const quality of qualities) {
      // eslint-disable-next-line no-await-in-loop
      blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
      if (!blob) continue;
      if (blob.size <= IMAGE_UPLOAD_TARGET_BYTES) break;
    }
    if (!blob) return file;

    const originalName = String(file.name || 'image').replace(/\.[^.]+$/, '');
    return new File([blob], `${originalName}.jpg`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function optimizeImagesForUpload(files = []) {
  const inputFiles = Array.isArray(files) ? files : [];
  const optimized = [];
  for (const file of inputFiles) {
    // eslint-disable-next-line no-await-in-loop
    const nextFile = await optimizeImageForUpload(file);
    optimized.push(nextFile || file);
  }
  return optimized;
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

function extractAmenityNames(payload) {
  const queue = [payload];
  const visited = new Set();
  const names = [];
  const seenNames = new Set();
  const pickName = (item) => {
    if (typeof item === 'string') return String(item).trim();
    if (typeof item === 'number') return String(item).trim();
    return String(
      item?.name
      || item?.title
      || item?.amenity
      || item?.label
      || item?.amenity_name
      || item?.amenity_title
      || item?.feature
      || item?.feature_name
      || item?.value
      || item?.text
      || ''
    ).trim();
  };

  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== 'object') continue;
    if (visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach((item) => queue.push(item));
      continue;
    }

    if (typeof node === 'string' || typeof node === 'number') {
      const valueName = pickName(node);
      if (valueName) {
        const normalized = valueName.toLowerCase();
        if (!seenNames.has(normalized)) {
          seenNames.add(normalized);
          names.push(valueName);
        }
      }
      continue;
    }

    const candidate = pickName(node);
    if (candidate) {
      const normalized = candidate.toLowerCase();
      if (!seenNames.has(normalized)) {
        seenNames.add(normalized);
        names.push(candidate);
      }
    }

    Object.values(node).forEach((value) => {
      if (value && typeof value === 'object') queue.push(value);
    });
  }

  return names;
}

async function fetchAmenitiesByListingId(id, authToken) {
  const amenityId = Number(id);
  if (!amenityId || !authToken) return [];
  const baseApi = normalizeApiBase(process.env.REACT_APP_API_BASE_URL || 'https://admin.pakistanproperty.com');
  const endpoints = [
    `${baseApi}/api/agent/properties/amenities/${amenityId}`,
    `${baseApi}/agent/properties/amenities/${amenityId}`,
    `/api/agent/properties/amenities/${amenityId}`,
  ];
  for (const endpoint of endpoints) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!response.ok) continue;
      let parsed = null;
      // eslint-disable-next-line no-await-in-loop
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        // eslint-disable-next-line no-await-in-loop
        parsed = await response.json().catch(() => null);
      } else {
        // eslint-disable-next-line no-await-in-loop
        parsed = safeParseJson(await response.text());
      }
      if (!parsed || typeof parsed !== 'object') continue;
      const names = extractAmenityNames(parsed);
      if (names.length) return names;
    } catch {
      // ignore and try fallback endpoint
    }
  }
  return [];
}

async function fetchAmenitiesByFallbackIds(ids = [], authToken = '') {
  const uniqueIds = Array.from(new Set(
    (Array.isArray(ids) ? ids : [])
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  ));
  for (const id of uniqueIds) {
    // eslint-disable-next-line no-await-in-loop
    const names = await fetchAmenitiesByListingId(id, authToken);
    if (names.length) return names;
  }
  return [];
}

function sanitizePropertyTypeLabel(value, fallback = 'Property') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  const isEmailLike = /@/.test(raw) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
  const isPhoneLike = /^\+?\d[\d\s-]{7,}$/.test(raw);
  const hasOnlySymbolsOrDigits = /^[^a-zA-Z]*$/.test(raw);
  if (isEmailLike || isPhoneLike || hasOnlySymbolsOrDigits || lower.includes('.com') || lower.includes('.pk')) {
    return fallback;
  }
  if (/\b(?:rs|pkr|lakh|lac|crore|core|cr|million|billion|price|rent|lease|amount)\b/i.test(lower)) {
    return fallback;
  }
  return raw;
}

function buildAutoListingTitle({ size, sizeUnit, propertyType, purpose, address }) {
  const purposeText = String(purpose || 'Sell').toLowerCase();
  const purposeLabel = purposeText === 'rent' ? 'for Rent' : purposeText === 'lease' ? 'for Lease' : 'for Sale';
  const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';
  const safeType = sanitizePropertyTypeLabel(propertyType, 'Property');
  const cleanAddress = getDisplayLocationFromAddress(address);
  const locationText = cleanAddress || 'Pakistan';
  return `${sizeText ? `${sizeText} ` : ''}${safeType} ${purposeLabel} in ${locationText}`.replace(/\s+/g, ' ').trim();
}

function buildAutoListingDescription({
  purpose,
  propertyType,
  address,
  size,
  sizeUnit,
  bedrooms,
  bathrooms,
  features,
  price,
}) {
  const purposeText = String(purpose || 'Sell').toLowerCase();
  const purposeLabel = purposeText === 'rent' ? 'for rent' : purposeText === 'lease' ? 'for lease' : 'for sale';
  const safeType = sanitizePropertyTypeLabel(propertyType, 'property');
  const locationText = getDisplayLocationFromAddress(address) || 'a prime location in Pakistan';
  const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';
  const roomsText = [
    bedrooms ? `${bedrooms} bedrooms` : '',
    bathrooms ? `${bathrooms} bathrooms` : '',
  ].filter(Boolean).join(' and ');
  const featureText = String(features || '').trim();
  const priceText = String(price || '').trim();

  const base = [
    `A well-maintained ${safeType} ${purposeLabel} in ${locationText}.`,
    sizeText ? `The property offers ${sizeText} of usable area with a practical and comfortable layout.` : '',
    roomsText ? `It includes ${roomsText}, making it suitable for family living and long-term convenience.` : '',
    featureText ? `Key highlights include ${featureText}.` : 'The home provides strong everyday utility and a livable layout for end-users.',
    priceText ? `The asking price is ${priceText}.` : '',
    'This listing is a solid opportunity for genuine buyers and investors seeking location value, functionality, and future potential. Contact now to schedule a visit.',
  ].filter(Boolean);

  return base.join(' ').replace(/\s+/g, ' ').trim();
}

function parseAddressParts(addressText, cityRecords = []) {
  const fullAddress = String(addressText || '').replace(/\s+/g, ' ').replace(/^[,.:\s-]+|[,.:\s-]+$/g, '').trim();
  if (!fullAddress) {
    return { fullAddress: '', cityName: '', areaName: '' };
  }

  const latinAugmented = /[\u0600-\u06FF]/.test(fullAddress)
    ? `${fullAddress} ${urduScriptLatinHints(fullAddress)}`
    : fullAddress;
  const normalized = latinAugmented.toLowerCase();
  const normalizeLoose = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/q/g, 'k')
    .replace(/\bnager\b/g, 'nagar')
    .replace(/\s+/g, ' ')
    .trim();
  const levenshtein = (a, b) => {
    const s = String(a || '');
    const t = String(b || '');
    const m = s.length;
    const n = t.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;
    for (let i = 1; i <= m; i += 1) {
      for (let j = 1; j <= n; j += 1) {
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  };
  const similarity = (a, b) => {
    const x = normalizeLoose(a);
    const y = normalizeLoose(b);
    if (!x || !y) return 0;
    const distance = levenshtein(x, y);
    return 1 - (distance / Math.max(x.length, y.length));
  };

  const allCities = [...(Array.isArray(cityRecords) ? cityRecords : [])]
    .map((item) => ({
      city: String(item?.city || '').trim(),
      appCode: String(item?.app_code || '').trim(),
      geo: item?.geo_location || null,
    }))
    .filter((item) => item.city);
  let matchedCity = [...allCities]
    .sort((a, b) => b.city.length - a.city.length)
    .find((item) => normalized.includes(item.city.toLowerCase()));
  let matchedCityToken = matchedCity?.city || '';

  const hasLocationContextHint = /\b(?:location|located|address|area|city|near|in|at|phase|block|sector|town|society|scheme|colony|road|street|avenue|bypass|dha)\b/i.test(latinAugmented)
    || fullAddress.includes(',')
    || latinAugmented.includes(',');

  if (!matchedCity && hasLocationContextHint) {
    const normalizedWords = normalizeLoose(latinAugmented).split(' ').filter(Boolean);
    let best = null;
    let bestScore = 0;
    allCities.forEach((cityItem) => {
      const cityWordCount = normalizeLoose(cityItem.city).split(' ').filter(Boolean).length || 1;
      for (let i = 0; i <= normalizedWords.length - cityWordCount; i += 1) {
        const phrase = normalizedWords.slice(i, i + cityWordCount).join(' ');
        const score = similarity(phrase, cityItem.city);
        if (score > bestScore) {
          bestScore = score;
          best = cityItem;
          matchedCityToken = phrase;
        }
      }
    });
    if (best && bestScore >= 0.88) {
      matchedCity = best;
    }
  }

  const cityName = matchedCity?.city || '';
  const cityCode = matchedCity?.appCode || '';
  const latitude = matchedCity?.geo?.latitude;
  const longitude = matchedCity?.geo?.longitude;

  let areaName = '';
  if (cityName) {
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cityVariants = [cityName, matchedCityToken]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const stripSource = /[\u0600-\u06FF]/.test(fullAddress) ? latinAugmented : fullAddress;
    areaName = cityVariants.reduce((acc, cityVariant) => {
      const cityRegex = new RegExp(`\\b${escapeRegex(cityVariant)}\\b`, 'ig');
      return acc.replace(cityRegex, ' ');
    }, stripSource)
      .replace(/\s*,\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[,.:\s-]+|[,.:\s-]+$/g, '')
      .trim();
  }

  // Urdu + hints often leave a long junk `areaName` after stripping the city; that breaks DB lookup.
  if (cityName && /[\u0600-\u06FF]/.test(fullAddress)) {
    const canonical = extractCanonicalDhaPhaseLabel(fullAddress);
    if (canonical) areaName = canonical;
  }

  if (!areaName && fullAddress.includes(',')) {
    areaName = fullAddress
      .split(',')
      .slice(0, -1)
      .join(',')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return { fullAddress, cityName, cityCode, areaName, latitude, longitude, cityToken: matchedCityToken };
}

function getDisplayLocationFromAddress(addressText) {
  const raw = String(addressText || '').replace(/\s+/g, ' ').replace(/^[,.:\s-]+|[,.:\s-]+$/g, '').trim();
  if (!raw) return '';
  const parsed = parseAddressParts(raw, citiesList);
  const cityName = String(parsed?.cityName || '').trim();
  // Strict mode: only accept locations tied to known city data.
  if (!cityName) return '';
  const areaKeywordMatches = raw.match(/(?:dha\s*(?:phase|pahse|phse)\s*\d+|model\s*town|[a-z0-9]+\s*city|[a-z0-9]+\s*town|[a-z0-9]+\s*block\s*[a-z0-9]+|[a-z0-9]+\s*sector\s*[a-z0-9]+|[a-z0-9]+\s*society|[a-z0-9]+\s*scheme|[a-z0-9]+\s*colony|[a-z0-9]+\s*road|[a-z0-9]+\s*street|[a-z0-9]+\s*avenue|[a-z0-9]+\s*bypass)/ig) || [];
  const hintedArea = String(areaKeywordMatches[areaKeywordMatches.length - 1] || '').replace(/\s+/g, ' ').trim();
  const parsedArea = String(parsed?.areaName || '').replace(/\s+/g, ' ').trim();
  let areaName = hintedArea;

  const normalizeAreaLabel = (value) =>
    String(value || '')
      .replace(/\b(?:pahse|phse)\b/gi, 'Phase')
      .replace(/\b([a-z]+)(\d{1,3})\b/gi, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

  // Heuristic: if city exists but area was not detected, use nearby words before city.
  if (!areaName && cityName) {
    const aroundLocationMatch = raw.match(new RegExp(`(?:location|located|area)\\s*(?:is|ha|hai|:)?\\s*([^,]{2,60})\\s*${cityName}`, 'i'));
    const aroundLocationArea = String(aroundLocationMatch?.[1] || '')
      .replace(/\b(?:ma|mein|main|ka|ki|ke|jis|or|aur|ha|hai|hain|ho|cha|chahta|chata|chahte|krna|karna|reha|raha|price|sale|sell|rent|lease|house|plot|shop|flat|makan)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (aroundLocationArea) areaName = aroundLocationArea;
  }

  if (!areaName && cityName) {
    const directAreaBeforeCity = raw.match(new RegExp(`\\b([a-z][a-z0-9\\s-]{1,40})\\s+${String(cityName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
    const directArea = String(directAreaBeforeCity?.[1] || '')
      .replace(/\b(?:ma|mein|main|ka|ki|ke|jis|or|aur|ha|hai|hain|ho|cha|chahta|chata|chahte|krna|karna|reha|raha|price|sale|sell|rent|lease|house|plot|shop|flat|makan|located|location|bed|bedroom|bedrooms|bath|bathroom|bathrooms|with|attach|attached)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (directArea && directArea.split(' ').length <= 4) areaName = directArea;
  }

  if (!areaName && raw.includes(',')) {
    const commaAreaMatch = raw.match(/([a-z][a-z0-9\s-]{1,40})\s*,\s*([a-z][a-z0-9\s-]{1,40})(?:\s|$)/i);
    const commaArea = String(commaAreaMatch?.[1] || '')
      .replace(/\b(?:ma|mein|main|ka|ki|ke|jis|or|aur|ha|hai|hain|ho|cha|chahta|chata|chahte|krna|karna|reha|raha|price|sale|sell|rent|lease|house|plot|shop|flat|makan|located|location|address|area|ye)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (commaArea && commaArea.split(' ').length <= 4) areaName = commaArea;
  }

  if (!areaName && cityName) {
    const dhaPhrase = raw.match(/\bdha\s*(?:phase|pahse|phse)\s*\d+\b/i);
    if (dhaPhrase?.[0]) areaName = dhaPhrase[0];
  }

  if (!areaName && parsedArea) {
    const parsedAreaClean = String(parsedArea)
      .replace(/\b(?:ma|mein|main|ka|ki|ke|jis|or|aur|ha|hai|hain|ho|cha|chahta|chata|chahte|krna|karna|reha|raha|price|sale|sell|rent|lease|house|plot|shop|flat|makan|location|located)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (parsedAreaClean && parsedAreaClean.split(' ').length <= 4) {
      areaName = parsedAreaClean;
    }
  }

  if (!areaName && cityName) {
    const cityIndex = raw.toLowerCase().lastIndexOf(cityName.toLowerCase());
    if (cityIndex > 0) {
      const beforeCity = raw.slice(0, cityIndex).replace(/\s+/g, ' ').trim();
      const chunks = beforeCity
        .split(/,|\bin\b|\bma\b|\bmain\b|\blocated\b|\bat\b/gi)
        .map((item) => item.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const candidate = chunks[chunks.length - 1] || '';
      const cleanedCandidate = candidate
        .replace(/\b(?:house|flat|plot|home|commercial|sale|sell|rent|lease|price|bed|bedroom|bath|bathroom|parking|feature|with|or|jis|ki|ka|ha|hain|hoon|chahta|chata|krna|location|located|area|is)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedCandidate && cleanedCandidate.length >= 3) {
        areaName = cleanedCandidate;
      }
    }
  }

  // Final cleanup to avoid raw prompt text leaking into location.
  const cleanedArea = String(areaName || '')
    .replace(/\b(?:ma|main|mein|or|aur|jis|ki|ka|ha|hai|hain|hoon|cha|chahta|chata|chahte|krna|karna|reha|raha|price|sale|sell|rent|lease|plot|house|shop|flat|makan|location|located|bed|bedroom|bedrooms|bath|bathroom|bathrooms|with|attach|attached)\b/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const isAreaReasonable = cleanedArea && cleanedArea.length <= 40 && cleanedArea.split(' ').length <= 5;
  areaName = isAreaReasonable ? normalizeAreaLabel(cleanedArea) : '';

  if (cityName && areaName) return `${areaName}, ${cityName}`.replace(/\s+/g, ' ').trim();
  if (cityName) return cityName;
  return '';
}

function getCityLocationFileName(cityName) {
  const words = String(cityName || '')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  const [first, ...rest] = words;
  return `${first.charAt(0).toLowerCase()}${first.slice(1)}${rest
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join('')}`;
}

async function resolveAreaMetadata(cityName, areaName) {
  const normalizedArea = String(areaName || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(?:ye|yah|yeh|yha|yahan|waha|wahan|is|ki|ka|ke|ma|mein|main)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cityName || !normalizedArea) return null;
  const fileName = getCityLocationFileName(cityName);
  if (!fileName) return null;
  try {
    const module = await import(`../../citiesLocation/locations/${fileName}.json`);
    const locations = Array.isArray(module?.default) ? module.default : [];
    if (!locations.length) return null;
    const GENERIC_LOCATION_TOKENS = new Set([
      'city', 'town', 'society', 'scheme', 'colony', 'block', 'sector', 'phase',
      'road', 'street', 'avenue', 'near', 'area', 'location',
    ]);
    const normalize = (value) => String(value || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/q/g, 'k')
      .replace(/\bnager\b/g, 'nagar')
      .replace(/\b(?:ye|yah|yeh|yha|yahan|waha|wahan|is|ki|ka|ke|ma|mein|main)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const compact = (value) =>
      normalize(value)
        .replace(/\b([a-z]{2,})\s+pur\b/g, '$1pur')
        .replace(/\s+/g, '');
    const getMeaningfulTokens = (value) =>
      normalize(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !GENERIC_LOCATION_TOKENS.has(token));
    const simplify = (value) =>
      normalize(value)
        .replace(/\b(?:city|town|society|scheme|colony|block|sector|phase|road|street|avenue)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const levenshtein = (a, b) => {
      const s = String(a || '');
      const t = String(b || '');
      const m = s.length;
      const n = t.length;
      if (!m) return n;
      if (!n) return m;
      const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      for (let i = 0; i <= m; i += 1) dp[i][0] = i;
      for (let j = 0; j <= n; j += 1) dp[0][j] = j;
      for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
          const cost = s[i - 1] === t[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
        }
      }
      return dp[m][n];
    };
    const similarityScore = (a, b) => {
      const x = String(a || '').trim();
      const y = String(b || '').trim();
      if (!x || !y) return 0;
      const distance = levenshtein(x, y);
      return 1 - (distance / Math.max(x.length, y.length));
    };
    const compactTarget = compact(normalizedArea);

    const exact = locations.find((item) => normalize(item?.name) === normalizedArea);
    if (exact) return exact;
    const compactExact = locations.find((item) => compact(item?.name) === compactTarget);
    if (compactExact) return compactExact;
    const contains = locations.find((item) => normalize(item?.name).includes(normalizedArea));
    if (contains) return contains;
    const reverseContains = locations.find((item) => normalizedArea.includes(normalize(item?.name)));
    if (reverseContains) return reverseContains;
    const compactContains = locations.find((item) => compact(item?.name).includes(compactTarget));
    if (compactContains) return compactContains;
    const compactReverseContains = locations.find((item) => compactTarget.includes(compact(item?.name)));
    if (compactReverseContains) return compactReverseContains;

    // Token fallback: for short location hints like "bypass", match any area containing key token.
    const tokens = getMeaningfulTokens(normalizedArea);
    if (tokens.length) {
      let tokenMatch = null;
      let bestTokenScore = 0;
      locations.forEach((item) => {
        const name = normalize(item?.name);
        if (!name) return;
        const itemTokens = getMeaningfulTokens(name);
        const overlapCount = tokens.filter((token) => itemTokens.includes(token)).length;
        if (!overlapCount) return;
        const tokenCoverage = overlapCount / tokens.length;
        const score = tokenCoverage + (overlapCount * 0.1);
        if (score > bestTokenScore) {
          bestTokenScore = score;
          tokenMatch = item;
        }
      });
      if (tokenMatch && bestTokenScore >= 0.6) return tokenMatch;
    }

    const simplifiedTarget = simplify(normalizedArea);
    const targetTokens = getMeaningfulTokens(normalizedArea);
    let bestMatch = null;
    let bestScore = 0;
    let bestCompactScore = 0;
    locations.forEach((item) => {
      const locationName = normalize(item?.name);
      if (!locationName) return;
      const simplifiedLocation = simplify(locationName);
      const compactLocation = compact(locationName);
      const locationTokens = getMeaningfulTokens(locationName);
      const tokenOverlap = targetTokens.length
        ? targetTokens.filter((token) => locationTokens.includes(token)).length / targetTokens.length
        : 0;
      const compactSimilarity = similarityScore(compactTarget, compactLocation);
      const score = Math.max(
        similarityScore(normalizedArea, locationName),
        similarityScore(simplifiedTarget, simplifiedLocation),
        compactSimilarity
      ) + (tokenOverlap * 0.15);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
      if (compactSimilarity > bestCompactScore) {
        bestCompactScore = compactSimilarity;
      }
    });

    if (bestScore < 0.72) return null;
    if (targetTokens.length) {
      const bestTokens = getMeaningfulTokens(bestMatch?.name);
      const hasTokenOverlap = targetTokens.some((token) => bestTokens.includes(token));
      if (!hasTokenOverlap && bestCompactScore < 0.84) return null;
    }
    return bestMatch;
  } catch {
    return null;
  }
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getRuntimeAuthLikeObjects() {
  if (typeof window === 'undefined') return [];
  const candidates = [
    window.loginData,
    window.login_data,
    window.authData,
    window.auth_data,
    window.currentUser,
  ];
  return candidates.filter((item) => item && typeof item === 'object');
}

function getStorageAuthLikeObjects() {
  if (typeof window === 'undefined') return [];
  const buckets = [window.localStorage, window.sessionStorage];
  const scanned = [];
  const looksRelevantKey = (key) => /(login|auth|user|profile|account)/i.test(String(key || ''));
  const hasUsefulFields = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    const probes = [obj, obj.user, obj.data, obj.data?.user, obj.profile, obj.data?.profile];
    return probes.some((item) => item && typeof item === 'object' && (
      item.email || item.user_email || item.phone || item.phone_number || item.mobile || item.contact_number || item.token || item.api_token
    ));
  };

  buckets.forEach((storage) => {
    if (!storage) return;
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!looksRelevantKey(key)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = safeParseJson(raw);
      if (parsed && typeof parsed === 'object' && hasUsefulFields(parsed)) {
        scanned.push(parsed);
      }
    }
  });
  return scanned;
}

function queueListingForOfflinePublish(payload) {
  try {
    const existing = safeParseJson(localStorage.getItem(OFFLINE_LISTINGS_QUEUE_KEY));
    const queue = Array.isArray(existing) ? existing : [];
    const snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      payload,
    };
    const nextQueue = [snapshot, ...queue].slice(0, 50);
    localStorage.setItem(OFFLINE_LISTINGS_QUEUE_KEY, JSON.stringify(nextQueue));
    return nextQueue.length;
  } catch {
    return 0;
  }
}

function getOfflinePublishQueue() {
  const parsed = safeParseJson(localStorage.getItem(OFFLINE_LISTINGS_QUEUE_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function setOfflinePublishQueue(queue) {
  localStorage.setItem(OFFLINE_LISTINGS_QUEUE_KEY, JSON.stringify(Array.isArray(queue) ? queue : []));
}

function buildFormDataFromPayload(payload) {
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item));
    } else {
      formData.append(key, value);
    }
  });
  return formData;
}

async function flushOfflinePublishQueue({ apiEndpoints = [], authToken = '', timeoutMs = 15000, maxItems = OFFLINE_FLUSH_BATCH_SIZE }) {
  if (!authToken || !Array.isArray(apiEndpoints) || !apiEndpoints.length) return { flushed: 0, remaining: getOfflinePublishQueue().length };
  const queue = getOfflinePublishQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const processList = queue.slice(0, maxItems);
  const untouched = queue.slice(maxItems);
  const failed = [];
  let flushed = 0;

  for (const item of processList) {
    let delivered = false;
    for (const endpoint of apiEndpoints) {
      let timeoutId;
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        // eslint-disable-next-line no-await-in-loop
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: buildFormDataFromPayload(item?.payload || {}),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) continue;
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        // eslint-disable-next-line no-await-in-loop
        const text = await response.text();
        const trimmed = text.trim().toLowerCase();
        const isHtml = contentType.includes('text/html') || trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
        if (isHtml) continue;
        delivered = true;
        flushed += 1;
        break;
      } catch {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
    if (!delivered) failed.push(item);
  }

  setOfflinePublishQueue([...failed, ...untouched]);
  return { flushed, remaining: failed.length + untouched.length };
}

function getStoredAuthUser() {
  const possibleKeys = [
    'user',
    'authUser',
    'currentUser',
    'loginUser',
    'loginData',
    'login_data',
    'signupUser',
    'userData',
    'auth',
    'auth_data',
    'profile',
    'agent_user',
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeParseJson(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  }

  const storageObjects = getStorageAuthLikeObjects();
  if (storageObjects.length) return storageObjects[0];
  const runtimeObjects = getRuntimeAuthLikeObjects();
  if (runtimeObjects.length) return runtimeObjects[0];

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
  if (digits.startsWith('0') && digits.length === 11) return digits.slice(1);
  if (digits.startsWith('92') && digits.length === 12) return digits.slice(2);
  if (digits.startsWith('3') && digits.length === 10) return digits;
  return digits;
}

function isValidPakistanMobile(phoneValue) {
  return /^3\d{9}$/.test(String(phoneValue || '').trim());
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

function getCandidateUserSources(seed) {
  const queue = Array.isArray(seed) ? [...seed] : [seed];
  const seen = new Set();
  const sources = [];
  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== 'object') continue;
    if (seen.has(item)) continue;
    seen.add(item);
    sources.push(item);
    queue.push(item.user, item.data, item.data?.user, item.profile, item.data?.profile);
  }
  return sources;
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

  const storageObjectKeys = ['loginData', 'login_data', 'authUser', 'userData', 'auth', 'auth_data'];
  const storageObjects = storageObjectKeys
    .map((key) => safeParseJson(localStorage.getItem(key) || sessionStorage.getItem(key)))
    .filter((item) => item && typeof item === 'object');
  const scannedStorageObjects = getStorageAuthLikeObjects();
  const runtimeObjects = getRuntimeAuthLikeObjects();
  const userSources = getCandidateUserSources([user, ...storageObjects, ...scannedStorageObjects, ...runtimeObjects]);
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
  const emailKeys = ['email', 'user_email', 'login_email', 'agent_email'];
  const directStorageEmail = pickFirstValue(
    Object.fromEntries(
      emailKeys.map((key) => [key, localStorage.getItem(key) || sessionStorage.getItem(key)])
    ),
    emailKeys
  );
  const storageObjectKeys = ['loginData', 'login_data', 'authUser', 'userData', 'auth', 'auth_data'];
  const storageObjects = storageObjectKeys
    .map((key) => safeParseJson(localStorage.getItem(key) || sessionStorage.getItem(key)))
    .filter((item) => item && typeof item === 'object');
  const scannedStorageObjects = getStorageAuthLikeObjects();
  const runtimeObjects = getRuntimeAuthLikeObjects();
  const userSources = getCandidateUserSources([user, ...storageObjects, ...scannedStorageObjects, ...runtimeObjects]);
  for (const source of userSources) {
    const email = pickFirstValue(source, emailKeys);
    if (email) return String(email).trim();
  }
  return String(directStorageEmail || '').trim();
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
        <div className="listingModePanel">
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
    </div>
  );
}

function WelcomePage({ onStart, welcomeName }) {
  const welcomeText = `Welcome, ${welcomeName || 'John'}`;
  const subtitleText = 'Not sure where to begin? Our smart assistant will ask simple questions  to create your listing.';
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
          {subtitleWords.slice(0, subtitleVisibleCount).map((word, index) => (
            <React.Fragment key={`${word}-${index}`}>
              {word}
              {word.toLowerCase() === 'questions' ? <br /> : ' '}
            </React.Fragment>
          ))}
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

function PicturePage({ images, onBack, onAddMoreImages, onRemoveImage, onContinue }) {
  const fileInputRef = useRef(null);
  return (
    <PropertyLayout stepText="" progressPercent={100} showProgress={false} onBack={onBack} pageClassName="picturePage" contentClassName="pictureContent">
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
    const timer = setTimeout(() => onComplete?.(), 5000);
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
  const [titleStreamDone, setTitleStreamDone] = useState(true);
  const [descStreamDone, setDescStreamDone] = useState(true);
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

  useEffect(() => {
    setTitleStreamDone(!String(aiTitle || '').trim());
  }, [aiTitle]);

  useEffect(() => {
    setDescStreamDone(!String(aiDescription || '').trim());
  }, [aiDescription]);

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

  const getWordCount = (text) =>
    String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const finalizeSentence = (text) => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
  };

  const constrainDescriptionLength = (text, minWords = 100, maxWords = 130) => {
    let normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) normalized = getLocalFallbackDescription();

    const basePadding = [
      listingContext?.address ? `Located in ${listingContext.address}, this listing stands out for convenience, daily accessibility, and long-term value potential.` : '',
      listingContext?.size ? `The offered area of ${listingContext.size} ${listingContext?.sizeUnit || ''}`.trim() + ' supports practical use and future planning flexibility.' : '',
      listingContext?.price ? `The quoted price of ${listingContext.price} is aligned with current market expectations for serious buyers and investors.` : '',
      `Overall, this is a dependable option for clients seeking a balanced property with solid usability, location strength, and investment potential in Pakistan's active real-estate market.`,
    ].filter(Boolean);

    while (getWordCount(normalized) < minWords) {
      const nextSentence = basePadding.shift() || 'Contact now to schedule a visit and review full details before this opportunity is gone.';
      normalized = `${finalizeSentence(normalized)} ${nextSentence}`.trim();
    }

    let words = String(normalized).trim().split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      words = words.slice(0, maxWords);
      normalized = words.join(' ');
    } else {
      normalized = words.join(' ');
    }

    return finalizeSentence(normalized);
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

  const buildPromptFacts = (mode = 'all') => {
    const baseFacts = {
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

    const facts = mode === 'title'
      ? {
        address: baseFacts.address,
        city: baseFacts.city,
        size: baseFacts.size,
        sizeUnit: baseFacts.sizeUnit,
      }
      : baseFacts;

    return Object.entries(facts)
      .filter(([, value]) => String(value || '').trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  };

  const sanitizeAiText = (text, mode) => {
    const cleaned = String(text || '')
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^\s*(title|description)\s*:\s*/i, '')
      .replace(/^[-*\d.)]+\s*/gm, '')
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
    const promptFacts = buildPromptFacts(mode);
    const userPrompt = mode === 'title'
      ? `Write one professional property listing title using these facts:
${promptFacts || 'No structured facts available.'}

Previous title (avoid similar wording): ${previousTitle || 'N/A'}
Recent titles already used (avoid repeating words/patterns): 
${recentTitlesText}

Rules:
- Output exactly one line and only the title text.
- Keep it 7 to 12 words.
- Mention size and location naturally.
- Tone must be professional and market-ready.
- Do not mention bedrooms, bathrooms, or features.
- Use a clearly different phrasing pattern from previous/recent titles.
- No emojis, hashtags, quotation marks, or markdown.`
      : `Write one professional property listing description using these facts:
${promptFacts || 'No structured facts available.'}

Previous description (avoid similar wording): ${previousDescription || 'N/A'}
Recent descriptions already used (avoid repeating words/patterns):
${recentDescriptionsText}

Rules:
- Output one paragraph only (100 to 130 words).
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
      const safeDescription = constrainDescriptionLength(
        ensureUniqueDescription(
          sanitizeAiText(generatedText, 'description') || getLocalFallbackDescription()
        )
      );
      saveDescriptionToHistory(safeDescription);
      onDescriptionGenerated(safeDescription);
    } catch (error) {
      const fallbackDescription = constrainDescriptionLength(
        ensureUniqueDescription(getLocalFallbackDescription())
      );
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
          <button
            type="button"
            className="chatBubble aiDraftTriggerBubble"
            onClick={handleGenerateTitle}
            disabled={titleLoading || descriptionLoading || (Boolean(aiTitle) && !titleStreamDone)}
          >
            Generate Property Title
          </button>
        </div>
        <div className="chatRow userRow">
          {aiTitle && (
            <div className="chatBubble userTypeBubble aiDraftTitleBubble">
              <AssistantTypewriterText
                key={`title-${aiTitle.slice(0, 80)}`}
                text={aiTitle}
                onStreamComplete={() => setTitleStreamDone(true)}
              />
            </div>
          )}
        </div>

        <div className="chatRow">
          <div className="bot">
            <img src={assistantIcon} alt="Assistant icon" />
          </div>
          <button
            type="button"
            className="chatBubble aiDraftTriggerBubble"
            onClick={handleGenerateDescription}
            disabled={titleLoading || descriptionLoading || (Boolean(aiDescription) && !descStreamDone)}
          >
            Generate Description
          </button>
        </div>
        <div className="chatRow userRow">
          {aiDescription && (
            <div className="chatBubble userTypeBubble aiDraftDescriptionBubble">
              <AssistantTypewriterText
                key={`desc-${aiDescription.slice(0, 80)}`}
                text={aiDescription}
                onStreamComplete={() => setDescStreamDone(true)}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          className="continueBtn aiDraftNextBtn"
          onClick={onNext}
          disabled={titleLoading || descriptionLoading || !titleStreamDone || !descStreamDone}
        >
          Continue
        </button>
        {aiError && <p className="publishStatusText">{aiError}</p>}
      </div>
    </PropertyLayout>
  );
}

function AssistantTypewriterText({ text, revealImmediately = false, onRevealTick, onStreamComplete }) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const [visibleCount, setVisibleCount] = useState(() => (revealImmediately ? words.length : 0));

  useEffect(() => {
    if (revealImmediately) {
      setVisibleCount(words.length);
      onRevealTick?.();
      onStreamComplete?.();
      return undefined;
    }
    setVisibleCount(0);
    if (!words.length) {
      onRevealTick?.();
      onStreamComplete?.();
      return undefined;
    }
    onRevealTick?.();
    let index = 0;
    const ticker = setInterval(() => {
      index += 1;
      setVisibleCount(index);
      onRevealTick?.();
      if (index >= words.length) {
        clearInterval(ticker);
        onStreamComplete?.();
      }
    }, ASSISTANT_WORD_REVEAL_MS);
    return () => clearInterval(ticker);
  }, [text, words.length, revealImmediately]);

  return words.slice(0, visibleCount).join(' ');
}

function AiAssistantBubbleRow({
  text,
  startDelayMs = 0,
  revealImmediately = false,
  bubbleClassName = 'questionBubble',
  scrollEndRef,
  onStreamComplete,
}) {
  const [showRow, setShowRow] = useState(() => revealImmediately || startDelayMs === 0);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      scrollEndRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  useEffect(() => {
    if (revealImmediately || startDelayMs === 0) {
      setShowRow(true);
      return undefined;
    }
    const t = setTimeout(() => {
      setShowRow(true);
      scrollToEnd();
    }, startDelayMs);
    return () => clearTimeout(t);
  }, [revealImmediately, startDelayMs]);

  useEffect(() => {
    if (showRow) scrollToEnd();
  }, [showRow]);

  if (!showRow) return null;

  return (
    <BotMessage bubbleClassName={bubbleClassName}>
      <AssistantTypewriterText
        text={text}
        revealImmediately={revealImmediately}
        onRevealTick={scrollEndRef ? scrollToEnd : undefined}
        onStreamComplete={onStreamComplete}
      />
    </BotMessage>
  );
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
  onResetImages,
  onSetContactNumber,
  onSetEmail,
  onContinueAfterImages,
  persistedMessages,
  persistedDraft,
  persistedResponseStyle,
  onPersistChatState,
  returnToPublishOnSend,
  onReturnToPublishAfterSend,
}) {

  const [messages, setMessages] = useState(() => {
    if (!Array.isArray(persistedMessages) || !persistedMessages.length) return [];
    return persistedMessages.map((m) => (
      m.role === 'assistant' ? { ...m, revealAssistantImmediately: true } : m
    ));
  });
  const [inputText, setInputText] = useState('');
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState(() => (
    persistedResponseStyle === 'romanUrdu' || persistedResponseStyle === 'urdu' || persistedResponseStyle === 'english'
      ? persistedResponseStyle
      : ''
  ));
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [selectedCityForAddress, setSelectedCityForAddress] = useState('');
  const [cityAreas, setCityAreas] = useState([]);
  const [isAreasLoading, setIsAreasLoading] = useState(false);
  const [areasLoadError, setAreasLoadError] = useState('');
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [isImageOnlyView, setIsImageOnlyView] = useState(false);
  const [chatAmenityCatalog, setChatAmenityCatalog] = useState([]);
  const [chatAmenitiesLoading, setChatAmenitiesLoading] = useState(false);
  const [featuresAmenitiesModalOpen, setFeaturesAmenitiesModalOpen] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const composerInputRef = useRef(null);
  const imageFlowSnapshotRef = useRef([]);
  const assistantStreamHoldTimerRef = useRef(null);
  const [assistantUiStreamHold, setAssistantUiStreamHold] = useState(false);

  const beginAssistantUiStreamHoldFromTexts = (...textArgs) => {
    const flat = textArgs.flat().map((t) => String(t || '').trim()).filter(Boolean);
    const ms = estimateSequentialAssistantStreamMs(flat);
    if (assistantStreamHoldTimerRef.current) {
      clearTimeout(assistantStreamHoldTimerRef.current);
      assistantStreamHoldTimerRef.current = null;
    }
    if (ms <= 0) {
      setAssistantUiStreamHold(false);
      return;
    }
    setAssistantUiStreamHold(true);
    assistantStreamHoldTimerRef.current = setTimeout(() => {
      setAssistantUiStreamHold(false);
      assistantStreamHoldTimerRef.current = null;
    }, ms);
  };

  useEffect(() => () => {
    if (assistantStreamHoldTimerRef.current) clearTimeout(assistantStreamHoldTimerRef.current);
  }, []);

  const [draft, setDraft] = useState(() => {
    if (persistedDraft && typeof persistedDraft === 'object') {
      return {
        purpose: persistedDraft.purpose || '',
        propertyType: persistedDraft.propertyType || '',
        address: persistedDraft.address || '',
        price: persistedDraft.price || '',
        size: persistedDraft.size || '',
        sizeUnit: persistedDraft.sizeUnit || 'Marla',
        bedrooms: persistedDraft.bedrooms || '',
        bathrooms: persistedDraft.bathrooms || '',
        features: persistedDraft.features || '',
        subType: persistedDraft.subType || '',
        useProfileContact: persistedDraft.useProfileContact || ((profileContactNumber || profileEmail) ? 'yes' : ''),
        images: persistedDraft.images || ((selectedUploadedImages?.length || 0) ? `uploaded:${selectedUploadedImages.length}` : ''),
        contactNumber: persistedDraft.contactNumber || selectedContactNumber || profileContactNumber || '',
        email: persistedDraft.email || selectedEmail || profileEmail || '',
      };
    }
    return {
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
      useProfileContact: (profileContactNumber || profileEmail) ? 'yes' : '',
      images: (selectedUploadedImages?.length || 0) ? `uploaded:${selectedUploadedImages.length}` : '',
      contactNumber: selectedContactNumber || profileContactNumber || '',
      email: selectedEmail || profileEmail || '',
    };
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

  const allCityNames = Array.isArray(citiesList)
    ? Array.from(new Set(citiesList.map((item) => String(item?.city || '').trim()).filter(Boolean)))
    : [];

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
    if (lower === 'home' || CHATBOT_SUB_TYPE_OPTIONS.Home.some((item) => normalizeType(item) === lower)) return 'Home';
    if (lower === 'commercial' || CHATBOT_SUB_TYPE_OPTIONS.Commercial.some((item) => normalizeType(item) === lower)) return 'Commercial';
    if (lower === 'plot' || CHATBOT_SUB_TYPE_OPTIONS.Plot.some((item) => normalizeType(item) === lower)) return 'Plot';
    if (lower.includes('plot')) return 'Plot';
    if (['office', 'shop', 'warehouse', 'factory', 'building', 'commercial'].some((item) => lower.includes(item))) return 'Commercial';
    return 'Home';
  };

  const isPlotType = (data) => getPropertyGroup(data?.propertyType) === 'Plot';
  const isCommercialType = (data) => {
    return getPropertyGroup(data?.propertyType) === 'Commercial';
  };
  const isShopType = (data) => {
    const subType = normalizeType(data?.subType);
    const propertyType = normalizeType(data?.propertyType);
    return subType.includes('shop') || propertyType.includes('shop');
  };
  /** Skip bed/bath only (plots/shops). Features & amenities always collected. */
  const shouldSkipBedroomsBathroomsForPlotOrShop = (data) => isPlotType(data) || isShopType(data);

  const hasProfileContact = Boolean((profileContactNumber || '').trim() || (profileEmail || '').trim());

  const getCurrentStage = (data) => {
    for (const key of stageOrder) {
      if (key === 'subType') {
        const group = getPropertyGroup(data?.propertyType);
        if (isShopType(data)) continue;
        if (!String(group || '').trim()) continue;
        if (String(data?.subType || '').trim()) continue;
      }
      if ((key === 'bedrooms' || key === 'bathrooms') && shouldSkipBedroomsBathroomsForPlotOrShop(data)) continue;
      if (key === 'useProfileContact') continue;
      if (key === 'email' && data?.useProfileContact === 'yes' && String(data?.email || '').trim()) continue;
      if (key === 'contactNumber' && data?.useProfileContact === 'yes' && String(data?.contactNumber || '').trim()) continue;
      if (String(data?.[key] || '').trim()) continue;
      return key;
    }
    return 'complete';
  };

  /** Once user speaks clearly in Urdu / Roman Urdu / English, keep the whole listing flow in that language. */
  const isFlowLanguageLocked = responseStyle === 'urdu'
    || responseStyle === 'romanUrdu'
    || responseStyle === 'english';

  const resolveReplyLang = (style) => {
    if (style === 'urdu' || style === 'romanUrdu' || style === 'english') return style;
    return responseStyle || 'english';
  };

  const getPromptForStage = (stage, style) => {
    const lang = resolveReplyLang(style);
    const pick = (en, ro, ar) => (lang === 'urdu' ? ar : lang === 'romanUrdu' ? ro : en);
    if (stage === 'purpose') {
      return pick(
        PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION,
        'Apni listing ka purpose batayein: Sell, Rent ya Lease?',
        'اپنی لسٹنگ کا مقصد بتائیں: فروخت، کرایہ، یا لیز؟',
      );
    }
    if (stage === 'propertyType') {
      const allowedGroupsText = getAllowedPropertyTypesForPurpose(draft?.purpose).join(', ');
      return pick(
        `Great, please confirm the category — ${allowedGroupsText}.`,
        `Zabardast, category confirm kar dein — ${allowedGroupsText}.`,
        `زبردست، براہ کرم قسم کی تصدیق کریں — ${allowedGroupsText}۔`,
      );
    }
    if (stage === 'subType') {
      return pick(
        'Perfect. What is the exact sub-type? (House, Shop, Office, Flat, etc.)',
        'Perfect. Exact sub-type kya hai? (House, Shop, Office, Flat, waghera)',
        'بہترین۔ درست ذیلی قسم کیا ہے؟ (House, Shop, Office, Flat وغیرہ)',
      );
    }
    if (stage === 'address') {
      return pick(
        'Nice. Please share location (Area, City) — for example DHA Phase 6, Lahore.',
        'Acha. Location share karein (Area, City) — maslan DHA Phase 6, Lahore.',
        'اچھا۔ مقام بتائیں (علاقہ، شہر) — مثلاً DHA Phase 6, Lahore۔',
      );
    }
    if (stage === 'size') {
      return pick(
        'Please share area size as well (for example 5 Marla, 10 Marla, 1 Kanal).',
        'Area size bhi bata dein (maslan 5 Marla, 10 Marla, 1 Kanal).',
        'رقبہ بھی بتائیں (مثلاً 5 Marla، 10 Marla، 1 Kanal)۔',
      );
    }
    if (stage === 'price') {
      const purpose = String(draft?.purpose || '').toLowerCase();
      if (purpose === 'sell') {
        return pick(
          'What is your expected asking price?',
          'Expected price kitni rakhna chahte hain?',
          'آپ کتنی قیمت متوقع رکھتے ہیں؟',
        );
      }
      if (purpose === 'rent') {
        return pick(
          'What is your expected monthly rent?',
          'Expected monthly rent kitna rakhna chahte hain?',
          'متوقع ماہانہ کرایہ کتنا ہے؟',
        );
      }
      if (purpose === 'lease') {
        return pick(
          'What is your expected lease amount?',
          'Expected lease amount kitna rakhna chahte hain?',
          'متوقع لیز رقم کتنی ہے؟',
        );
      }
      return pick(
        'Please share the expected amount.',
        'Expected amount bata dein.',
        'براہ کرم متوقع رقم بتائیں۔',
      );
    }
    if (stage === 'bedrooms') {
      return isCommercialType(draft)
        ? pick(
          'How many bedrooms are there? (If not applicable, type "skip".)',
          'Bedrooms kitne hain? (Agar apply nahi karta to "skip" likh dein.)',
          'کتنے بیڈ روم ہیں؟ (اگر لاگو نہیں تو "skip" لکھیں۔)',
        )
        : pick(
          'How many bedrooms are there?',
          'Bedrooms kitne hain?',
          'کتنے بیڈ روم ہیں؟',
        );
    }
    if (stage === 'bathrooms') {
      return isCommercialType(draft)
        ? pick(
          'How many bathrooms are there? (If not applicable, type "skip".)',
          'Bathrooms kitne hain? (Agar apply nahi karta to "skip" likh dein.)',
          'کتنے باتھ روم ہیں؟ (اگر لاگو نہیں تو "skip" لکھیں۔)',
        )
        : pick(
          'How many bathrooms are there?',
          'Bathrooms kitne hain?',
          'کتنے باتھ روم ہیں؟',
        );
    }
    if (stage === 'features') {
      return pick(
        'Select amenities from the Pakistan Property list below, or type them. Use Done when finished.',
        'Pakistan Property ki amenities list se neeche select karein, ya type kar dein. Done se aage barhein.',
        'ذیل میں Pakistan Property کی سہولیات منتخب کریں یا ٹائپ کریں۔ مکمل ہونے پر Done دبائیں۔',
      );
    }
    if (stage === 'useProfileContact') {
      return pick(
        'Would you like to use profile contact details?',
        'Kya profile wala contact use karna hai?',
        'کیا پروفائل والا رابطہ استعمال کرنا ہے؟',
      );
    }
    if (stage === 'email') {
      return pick(
        'Please share your email address.',
        'Email address share karein.',
        'اپنا ای میل بتائیں۔',
      );
    }
    if (stage === 'contactNumber') {
      return pick(
        'Please share contact number (3XXXXXXXXX).',
        'Contact number share karein (3XXXXXXXXX).',
        'رابطہ نمبر بتائیں (3XXXXXXXXX)۔',
      );
    }
    if (stage === 'images') {
      return pick(
        `Great. Please upload images — minimum ${MIN_REQUIRED_IMAGES} photos are required. Click or drag and drop.`,
        `Great. Ab images upload karein — kam az kam ${MIN_REQUIRED_IMAGES} photos zaroori hain. Click ya drag & drop.`,
        `بہترین۔ تصاویر اپلوڈ کریں — کم از کم ${MIN_REQUIRED_IMAGES} تصاویر ضروری ہیں۔ کلک یا ڈریگ اینڈ ڈراپ۔`,
      );
    }
    return pick(
      'Excellent, basic listing details are complete. You can proceed to publish.',
      'Zabardast, basic listing details complete ho gayi hain. Ab aage publish kar sakte hain.',
      'بہترین، بنیادی تفصیلات مکمل ہیں۔ اب شائع کر سکتے ہیں۔',
    );
  };

  const getInvalidStageReply = (stage, style) => {
    const lang = resolveReplyLang(style);
    const pick = (en, ro, ar) => (lang === 'urdu' ? ar : lang === 'romanUrdu' ? ro : en);
    const allowedTypeHint = getAllowedPropertyTypesForPurpose(draft?.purpose).join(', ');
    const stageHints = {
      purpose: pick(
        'Please choose one: Sell, Rent, or Lease.',
        'Sell, Rent ya Lease mein se ek choose karein.',
        'ایک منتخب کریں: فروخت، کرایہ، یا لیز۔',
      ),
      propertyType: pick(
        `Please mention a valid type: ${allowedTypeHint}.`,
        `${allowedTypeHint} mein se valid type likhein.`,
        `درست قسم لکھیں: ${allowedTypeHint}۔`,
      ),
      subType: pick(
        'Please provide a sub-type like House, Flat, Shop, or Office.',
        'House, Flat, Shop, Office jaisa sub-type likhein.',
        'ذیلی قسم لکھیں جیسے House, Flat, Shop, Office۔',
      ),
      address: pick(
        'Please provide area and city, for example DHA Phase 6, Lahore.',
        'Area aur city ke sath location batayein, maslan DHA Phase 6, Lahore.',
        'علاقہ اور شہر کے ساتھ مقام بتائیں، مثلاً DHA Phase 6, Lahore۔',
      ),
      size: pick(
        'Please provide size as number + unit, for example 5 Marla.',
        'Size number + unit likhein, maslan 5 Marla.',
        'سائز نمبر + یونٹ میں لکھیں، مثلاً 5 Marla۔',
      ),
      price: pick(
        'Please provide price/rent in numbers, for example Rs 3,500,000 or rent 35,000.',
        'Price/rent number mein batayein, maslan Rs 3500000 ya rent 35000.',
        'قیمت/کرایہ نمبروں میں بتائیں۔',
      ),
      bedrooms: pick(
        'Please provide bedroom count in numbers.',
        'Bedrooms ki ginti number mein batayein.',
        'بیڈ روم کی تعداد نمبر میں لکھیں۔',
      ),
      bathrooms: pick(
        'Please provide bathroom count in numbers.',
        'Bathrooms ki ginti number mein batayein.',
        'باتھ روم کی تعداد نمبر میں لکھیں۔',
      ),
      features: pick(
        'Please choose amenities from the Pakistan Property list for this sub-category.',
        'Pakistan Property list se amenities select karein jo is sub-category ke liye maujood hain.',
        'اس ذیلی زمرے کے لیے Pakistan Property فہرست سے سہولیات منتخب کریں۔',
      ),
      email: pick(
        'Please provide a valid email format, for example name@email.com.',
        'Valid email format dein, maslan name@email.com.',
        'درست ای میل فارمیٹ دیں۔',
      ),
      contactNumber: pick(
        'Please provide valid Pakistani mobile number in 3XXXXXXXXX format (without 0 and +92).',
        'Valid Pakistani mobile number dein, format 3XXXXXXXXX (0 aur +92 ke baghair).',
        'درست موبائل نمبر 3XXXXXXXXX (بغیر 0 اور +92)۔',
      ),
      images: pick(
        `Invalid input. Please upload at least ${MIN_REQUIRED_IMAGES} photos.`,
        `Invalid. Kam az kam ${MIN_REQUIRED_IMAGES} photos upload karein.`,
        `غلط۔ کم از کم ${MIN_REQUIRED_IMAGES} تصاویر اپلوڈ کریں۔`,
      ),
    };
    const hint = stageHints[stage] || pick(
      'Please share a little more clear detail.',
      'Thori si aur clear detail share karein.',
      'ذرا مزید واضح تفصیل بتائیں۔',
    );
    return pick(
      `Got it. I just need a bit more clarity at this point. ${hint}`,
      `Samajh gaya, bas is point par thori clear detail chahiye. ${hint}`,
      `سمجھ گیا، اس مرحلے پر تھوڑی وضاحت درکار ہے۔ ${hint}`,
    );
  };

  const normalizeInputForUnderstanding = (text) => {
    const original = String(text || '');
    const augmented = /[\u0600-\u06FF]/.test(original)
      ? `${original} ${urduScriptLatinHints(original)}`
      : original;
    return augmented
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(?:mai|main|mein|mn|mna)\b/g, ' ')
      .replace(/\b(?:amrla|mrla|marlay|marle|marley)\b/g, ' marla ')
      .replace(/\b(?:sirf|only)\s+upper\s+(?:wala\s+)?portion\b/g, ' upper portion ')
      .replace(/\b(?:sirf|only)\s+lower\s+(?:wala\s+)?portion\b/g, ' lower portion ')
      .replace(/\b(?:sirf|only)\s+(?:upper|uper|upr)\s+(?:wala|walla)?\s*(?:part|hissa|hisa|portion)\b/g, ' upper portion ')
      .replace(/\b(?:sirf|only)\s+(?:lower|neecha|necha|neechy|nechy|niche)\s+(?:wala|walla)?\s*(?:part|hissa|hisa|portion)\b/g, ' lower portion ')
      .replace(/\b(?:sirf|only)\s+(?:uper|upr|upper)\s+(?:wala\s+)?portion\b/g, ' upper portion ')
      .replace(/\b(?:sirf|only)\s+(?:nechy|neechy|niche|lower)\s+(?:wala\s+)?portion\b/g, ' lower portion ')
      .replace(/\bupper\s+(?:wala\s+)?portion\b/g, ' upper portion ')
      .replace(/\blower\s+(?:wala\s+)?portion\b/g, ' lower portion ')
      .replace(/\b(?:upper|uper|upr)\s+(?:wala|walla)?\s*(?:part|hissa|hisa|portion)\b/g, ' upper portion ')
      .replace(/\b(?:lower|neecha|necha|neechy|nechy|niche)\s+(?:wala|walla)?\s*(?:part|hissa|hisa|portion)\b/g, ' lower portion ')
      .replace(/\b(?:uper|upr)\s+(?:wala\s+)?portion\b/g, ' upper portion ')
      .replace(/\b(?:nechy|neechy|niche)\s+(?:wala\s+)?portion\b/g, ' lower portion ')
      .replace(/\b(?:residential|residentila|residential|resdential)\b/g, ' residential ')
      // Local phrasing: "kiraya/kariya par charna/chrana" => rent intent.
      .replace(/\b(?:kiraya|kiraye|kiraaye|kiray|kiraiya|kiraiye|kiraiy|kraya|kraye|karaya|karaye|kariya|kariyae|kariyai|karyia)\s+par\s+(?:charna|charana|chrana|chrana|charhana|charhane|charhanna|chadana|chadna|chadanae|dena|dene)\b/g, ' rent ')
      .replace(/\b[a-z]*haish[a-z]*(?:\s*gah)?\b/g, ' house ')
      .replace(/\b[a-z]*hayish[a-z]*(?:\s*gah)?\b/g, ' house ')
      .replace(/\b(?:ghr|ghar|gahr|makan|makaan|home|rehayish|rehayashi|rahaish|rahaishi|rehaish|rehaishi|rehash|rahash|reahash|rehayishgah|rehayish\s*gah|rahaishgah|rahaish\s*gah|rehaishgah|rehaish\s*gah|rehashgah|rehash\s*gah|rahashgah|rahash\s*gah|reahashgah|reahash\s*gah)\b/g, ' house ')
      .replace(/\b(?:bechna|bechni|bechani|bechne|bechana|bechanaa|beechana|beechanaa|beechani|beechna|beechne|bechra|farokht|farokhti|farukht|farukhti|frokht|forokht|farokhat|farukhat|rarokht|farot|farout|farouth)\b/g, ' sell ')
      .replace(/\b(?:kiraya|kiraye|kiraaye|kiray|kiraiya|kiraiye|kiraiy|kraya|kraye|karaya|karaye|kirae|kariya|kariyae|kariyai|karyia|ijara|ijarah)\b/g, ' rent ')
      .replace(/\b(?:dena|dene|daina)\b/g, ' ')
      .replace(/\b(?:dukan|dukkan)\b/g, ' shop ')
      .replace(/\b(?:daftar)\b/g, ' office ')
      .replace(/\b(?:zameen|qita|qita zameen)\b/g, ' plot ')
      .replace(/\b(?:jaga|jgah|jagah|location|loc)\b/g, ' location ')
      .replace(/\b(?:kamra|kamray|kamre)\b/g, ' bedroom ')
      .replace(/\b(?:wash room|washroom|bath room|ghusalkhana)\b/g, ' bathroom ')
      .replace(/\b(?:attach|attached)\b/g, ' attached ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parsePurpose = (text) => {
    const raw = normalizeInputForUnderstanding(text);
    if (!raw) return '';
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const hasAny = (keywords) => keywords.some((keyword) => normalized.includes(keyword));

    const sellKeywords = [
      'sell', 'sale', 'for sale', 'selling', 'bechna', 'bechni', 'bechani', 'bechne', 'bechana', 'bechanaa', 'beechana', 'beechanaa', 'beechani', 'beechna', 'beechne', 'bechra', 'farokht', 'farukht', 'frokht', 'forokht', 'farokhat', 'farukhat', 'rarokht', 'farot', 'farout', 'farouth',
    ];
    const rentKeywords = [
      'rent', 'for rent', 'kiraya', 'kiraye', 'kiraaye', 'kiray', 'kiraiya', 'kiraiye', 'kiraiy', 'kraya', 'kraye', 'karaya', 'karaye', 'kirae', 'kariya', 'kariyae', 'kariyai', 'karyia', 'rent dena', 'rent pe',
    ];
    const leaseKeywords = [
      'lease', 'ijara', 'ijarah',
    ];

    if (hasAny(leaseKeywords)) return 'Lease';
    if (hasAny(rentKeywords)) return 'Rent';
    if (hasAny(sellKeywords)) return 'Sell';
    if (normalized.includes('buy') || normalized.includes('khareed')) return 'Sell';
    return '';
  };

  const toDisplayCase = (text) =>
    String(text || '')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const parseSize = (text, options = {}) => {
    const { allowBareNumber = false } = options;
    const raw = String(text || '').trim();
    if (!raw) return null;
    const urMarla = raw.match(/(\d+(?:\.\d+)?)\s*(?:مرلہ|مرلے|مَرْلَہ)/);
    if (urMarla?.[1]) return { value: urMarla[1], unit: 'Marla' };
    const urKanal = raw.match(/(\d+(?:\.\d+)?)\s*(?:کنال|کَنال|کانال)/);
    if (urKanal?.[1]) return { value: urKanal[1], unit: 'Kanal' };
    const lower = raw.toLowerCase();

    const explicitPatterns = [
      { unit: 'Kanal', regex: /(\d+(?:\.\d+)?)\s*kanal\b/i },
      { unit: 'Marla', regex: /(\d+(?:\.\d+)?)\s*(?:marla|marlay|marle|marley|amrla|mrla)\b/i },
      { unit: 'Square Feet ( Sq. Ft.)', regex: /(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|square\s*feet|feet)\b/i },
      { unit: 'Square Feet ( Sq. Ft.)', regex: /(?:sq\.?\s*ft|square\s*feet|feet)\s*(\d+(?:\.\d+)?)/i },
      { unit: 'Square Yards ( Sq. Yd.)', regex: /(\d+(?:\.\d+)?)\s*(?:sq\.?\s*yd|square\s*yards?)\b/i },
      { unit: 'Square Yards ( Sq. Yd.)', regex: /(?:sq\.?\s*yd|square\s*yards?)\s*(\d+(?:\.\d+)?)/i },
      { unit: 'Square Meters ( Sq. M.)', regex: /(\d+(?:\.\d+)?)\s*(?:sq\.?\s*m|square\s*meters?)\b/i },
      { unit: 'Square Meters ( Sq. M.)', regex: /(?:sq\.?\s*m|square\s*meters?)\s*(\d+(?:\.\d+)?)/i },
    ];

    for (const pattern of explicitPatterns) {
      const match = raw.match(pattern.regex);
      if (match?.[1]) {
        return { value: match[1], unit: pattern.unit };
      }
    }

    const hasSizeHint = /\b(?:size|area)\b/i.test(lower);
    if (!allowBareNumber && !hasSizeHint) return null;

    const numberMatch = raw.match(/\d+(?:\.\d+)?/);
    if (!numberMatch) return null;
    return { value: numberMatch[0], unit: 'Marla' };
  };

  const inferPropertyTypeFromText = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';
    if (/@/.test(raw) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return '';
    const directGroupInput = normalizeType(raw).replace(/\s+/g, ' ').trim();
    if (directGroupInput === 'home') return 'Home';
    if (directGroupInput === 'commercial') return 'Commercial';
    if (directGroupInput === 'plot' || directGroupInput === 'plots') return 'Plot';

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

    const lower = normalizeInputForUnderstanding(raw);
    const normalized = lower.replace(/\s+/g, ' ').trim();
    // "Upper/Lower Portion" is a Home-group subtype.
    // Keep inferred property type as the group ("Home"), not "House".
    if (/\b(?:upper|lower)\s*(?:portion|part|hissa|hisa)\b/i.test(normalized)) {
      return 'Home';
    }
    if (
      /\b(?:upper portion|lower portion|portion)\b/i.test(normalized)
      && /\b(?:house|home|residential)\b/i.test(normalized)
    ) {
      return 'Home';
    }
    const matched = [...knownTypes].sort((a, b) => b.length - a.length).find((item) => lower.includes(item));
    if (matched) {
      if (matched === 'apartment') return 'Apartment';
      if (matched === 'farm house' || matched === 'farmhouse') return 'Farm House';
      return toDisplayCase(matched);
    }

    // Roman-Urdu / local wording support.
    const localTypeMatchers = [
      { keywords: ['house'], type: 'House' },
      { keywords: ['dukan', 'shop'], type: 'Shop' },
      { keywords: ['daftar', 'office'], type: 'Office' },
      { keywords: ['plot'], type: 'Plot' },
      { keywords: ['flat', 'apartment'], type: 'Apartment' },
      { keywords: ['villa'], type: 'Villa' },
    ];
    const localMatch = localTypeMatchers.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
    if (localMatch) return localMatch.type;
    // If text carries "house + lower/upper portion" intent, keep group as Home.
    if (
      /\bhouse\b/i.test(normalized)
      && /\b(?:upper|lower)\s*(?:portion|part|hissa|hisa)\b/i.test(normalized)
    ) {
      return 'Home';
    }

    // Keep strict to avoid garbage types like "muja krni ha".
    return '';
  };

  const inferSubTypeFromText = (text, group) => {
    const options = CHATBOT_SUB_TYPE_OPTIONS[group] || [];
    const normalizedRaw = normalizeInputForUnderstanding(text);
    const lower = normalizeType(normalizedRaw).replace(/\s+/g, ' ').trim();
    if (!lower) return '';
    if (/\bupper\s*(?:portion|part|hissa|hisa)\b/i.test(lower)) return 'Upper Portion';
    if (/\blower\s*(?:portion|part|hissa|hisa)\b/i.test(lower)) return 'Lower Portion';
    if (group === 'Home') {
      if (/\bupper\s*(?:portion|part|hissa|hisa)\b/i.test(lower)) return 'Upper Portion';
      if (/\blower\s*(?:portion|part|hissa|hisa)\b/i.test(lower)) return 'Lower Portion';
    }
    const exact = options.find((item) => normalizeType(item).replace(/\s+/g, ' ').trim() === lower);
    if (exact) return exact;
    const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const byLength = [...options].sort((a, b) => String(b).length - String(a).length);
    const wordBoundaryMatch = byLength.find((item) => {
      const normalizedItem = normalizeType(item).replace(/\s+/g, ' ').trim();
      if (!normalizedItem) return false;
      const pattern = normalizedItem
        .split(' ')
        .filter(Boolean)
        .map((part) => escapeRegex(part))
        .join('\\s+');
      if (!pattern) return false;
      return new RegExp(`\\b${pattern}\\b`, 'i').test(lower);
    });
    if (wordBoundaryMatch) return wordBoundaryMatch;
    const contains = byLength.find((item) => {
      const normalizedItem = normalizeType(item).replace(/\s+/g, ' ').trim();
      return normalizedItem && lower.includes(normalizedItem);
    });
    return contains || '';
  };

  const toGroupName = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'home') return 'Home';
    if (normalized === 'commercial') return 'Commercial';
    if (normalized === 'plot') return 'Plot';
    return '';
  };

  const parsePriceFromText = (text) => {
    const raw = String(text || '').trim();
    const lower = raw.toLowerCase();
    const normalized = normalizeInputForUnderstanding(raw);
    const hasUrduMoneyCue = /[\u0600-\u06FF]/.test(raw) && /قیمت|کروڑ|لاکھ|روپے|پیسے|لاکھوں|کروڑوں/.test(raw);
    const hasCurrencyHint = hasUrduMoneyCue || /\b(?:rs|pkr|price|qimat|qeemat|keemat|budget|amount|lakh|lac|crore|core|cor|croe|croar|cr|million|billion|hazar|hazaar|thousand)\b/i.test(`${lower} ${normalized}`);
    const hasRentWithNumber =
      /\b(?:rent|lease)\b(?:\s+\w+){0,4}\s*\d[\d,]*(?:\.\d+)?/i.test(normalized)
      || /\b\d[\d,]*(?:\.\d+)?(?:\s+\w+){0,3}\s*(?:rent|lease)\b/i.test(normalized);
    const hasCompactNumberHint = /\b\d+(?:\.\d+)?\s*(?:k|m)\b/i.test(lower);
    const hasPriceHint = hasCurrencyHint || hasCompactNumberHint || hasRentWithNumber;
    if (!hasPriceHint) return '';
    const hintMatch = raw.match(/(?:price|qimat|qeemat|keemat|rs|pkr|rent|lease)\s*[:-]?\s*(\d[\d,]*(?:\.\d+)?(?:\s*(?:hazar|hazaar|thousand|lakh|lac|crore|core|cor|croe|croar|cr|million|billion)\b|\s*[km](?![a-z]))?)/i);
    if (hintMatch?.[1]) return formatPriceWithRs(hintMatch[1]);
    const candidates = [...raw.matchAll(/\d[\d,]*(?:\.\d+)?(?:\s*(?:hazar|hazaar|thousand|lakh|lac|crore|core|cor|croe|croar|cr|million|billion)\b|\s*[km](?![a-z]))?/gi)]
      .map((item) => {
        const value = String(item?.[0] || '').trim();
        const start = Number(item?.index ?? -1);
        const end = start >= 0 ? start + value.length : -1;
        const afterText = end >= 0 ? raw.slice(end).trimStart().toLowerCase() : '';
        const isSizeContinuation = /^(?:marla|marlay|marle|marley|kanal|sq\.?\s*ft|sqft|square\s*feet|sq\.?\s*yd|square\s*yards?|sq\.?\s*m|square\s*meters?|yard|yards|meter|meters)\b/.test(afterText);
        const hasMoneyUnit = /\b(?:hazar|hazaar|thousand|lakh|lac|crore|core|cor|croe|croar|cr|million|billion)\b|[km](?![a-z])$/i.test(value);
        return { value, isSizeContinuation, hasMoneyUnit };
      })
      .filter((item) => item.value && (!item.isSizeContinuation || item.hasMoneyUnit))
      .map((item) => item.value);
    if (!candidates.length) return '';
    const best = candidates.sort((a, b) => b.replace(/[^\d]/g, '').length - a.replace(/[^\d]/g, '').length)[0];
    return formatPriceWithRs(best);
  };

  const parsePriceForPriceStage = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';

    const strict = parsePriceFromText(raw);
    if (strict) return strict;

    // Accept bare numbers or lightly noisy numeric input during price step.
    const bareNumber = raw.match(/^\s*\d[\d,]*(?:\.\d+)?\s*$/);
    if (bareNumber?.[0]) return formatPriceWithRs(bareNumber[0]);

    // If user entered size-centric text without any money hint, reject.
    const lower = raw.toLowerCase();
    const hasMoneyHint = /\b(?:rs|pkr|price|qimat|qeemat|keemat|budget|rent|lease|amount|hazar|hazaar|thousand|lakh|lac|crore|core|cor|croe|croar|cr|million|billion|k|m)\b/i.test(lower);
    const hasSizeHint = /\b(?:marla|marlay|marle|marley|kanal|sq\.?\s*ft|sqft|square\s*feet|sq\.?\s*yd|square\s*yards?|sq\.?\s*m|square\s*meters?|yard|meter)\b/i.test(lower);
    if (hasSizeHint && !hasMoneyHint) return '';

    const looseMatch = raw.match(/(\d[\d,]*(?:\.\d+)?(?:\s*(?:hazar|hazaar|thousand|lakh|lac|crore|core|cor|croe|croar|cr|million|billion)\b|\s*[km](?![a-z]))?)/i);
    if (!looseMatch?.[1]) return '';
    return formatPriceWithRs(looseMatch[1]);
  };

  const isLikelyDirectPriceInput = (text) => {
    const raw = String(text || '').trim().toLowerCase();
    if (!raw) return false;
    if (/^\d[\d,]*(?:\.\d+)?$/.test(raw)) return true;
    return /^\d[\d,]*(?:\.\d+)?\s*(?:hazar|hazaar|thousand|lakh|lac|crore|core|cr|million|billion|k|m)$/.test(raw);
  };

  const parseAddressFromText = (text, force = false) => {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const lower = normalizeInputForUnderstanding(raw);
    const withoutSizeContext = raw
      .replace(/\barea\s*size\b/gi, ' ')
      .replace(/\bsize\s*(?:is|ha|hai|:)?\s*\d+(?:\.\d+)?\s*(?:marla|marlay|marle|marley|kanal|sq\s*ft|sqft|square\s*feet|yard|yards|meter|meters|sq\s*yd|sq\s*m)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|marlay|marle|marley|kanal|sq\s*ft|sqft|square\s*feet|yard|yards|meter|meters|sq\s*yd|sq\s*m)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const normalizedLocation = getDisplayLocationFromAddress(withoutSizeContext || raw);
    if (normalizedLocation) return normalizedLocation;

    const locationHints = [
      'dha', 'phase', 'block', 'sector', 'town', 'city', 'road', 'street', 'avenue',
      'society', 'scheme', 'colony', 'lahore', 'karachi', 'islamabad', 'rawalpindi',
      'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala', 'hyderabad',
    ];
    const hasLocationHint = locationHints.some((item) => lower.includes(item));
    if (!force && !hasLocationHint) return '';

    let candidate = withoutSizeContext || raw;
    const dhaIndex = lower.indexOf('dha');
    if (dhaIndex >= 0) {
      candidate = (withoutSizeContext || raw).slice(dhaIndex).trim();
    } else {
      const inIndex = lower.lastIndexOf(' in ');
      if (inIndex >= 0 && (withoutSizeContext || raw).length > inIndex + 4) {
        candidate = (withoutSizeContext || raw).slice(inIndex + 4).trim();
      }
    }

    candidate = candidate
      .replace(/\b(?:sell|buy|rent|house|flat|plot|shop|office|apartment|villa|studio|townhouse)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleaned = candidate.length >= 4 ? candidate : '';
    const normalized = getDisplayLocationFromAddress(cleaned);
    if (normalized) return normalized;
    // Strict mode: if it doesn't resolve to known location data, treat as missing.
    if (!force) return '';
    return '';
  };

  const hasExplicitLocationIntent = (text) => {
    const orig = String(text || '');
    if (!orig.trim()) return false;
    const raw = orig.toLowerCase();
    if (/[\u0600-\u06FF]/.test(orig) && /ڈی\s*ایچ\s*ای|ڈی۔\s*ایچ۔\s*ای|لاہور|کراچی|اسلام\s*آباد|راولپنڈی|فیصل\s*آباد|ملتان|پشاور|فیز|بلاک|سیکٹر|مقام|پتہ|واقع|سڑک|کالونی|سوسائٹی/.test(orig)) {
      return true;
    }
    const hasSizeOnlyAreaContext =
      /\barea\s*size\b/i.test(raw)
      || /\bsize\s*(?:is|ha|hai|:)?\s*\d+(?:\.\d+)?\s*(?:marla|marlay|marle|marley|kanal|sq\s*ft|sqft|square\s*feet|yard|yards|meter|meters|sq\s*yd|sq\s*m)\b/i.test(raw)
      || /\barea\s*\d+(?:\.\d+)?\s*(?:marla|marlay|marle|marley|kanal|sq\s*ft|sqft|square\s*feet|yard|yards|meter|meters|sq\s*yd|sq\s*m)\b/i.test(raw);
    const hasStrongLocationKeyword = /\b(?:location|located|address|jaga|jagah|dha|phase|block|sector|town|society|scheme|colony|road|street|avenue|bypass)\b/i.test(raw);
    // Keep this strict to avoid false "invalid location" on normal sentences like:
    // "ma aik shop sale krna chahta hoon".
    if (hasSizeOnlyAreaContext && !hasStrongLocationKeyword && !raw.includes(',')) return false;
    return hasStrongLocationKeyword
      || /\b(?:lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala|hyderabad|bahawalpur|bahawalnagar)\b/i.test(raw);
  };

  const shouldValidateLocationInput = (text, stage) => {
    const raw = String(text || '').toLowerCase();
    const currentStage = String(stage || '').toLowerCase();
    if (!raw && !String(text || '').trim()) return false;
    if (currentStage === 'address') return true;

    const normHints = normalizeInputForUnderstanding(String(text || ''));
    const hasDirectLocationCue = /\b(?:location|located|address|jaga|jagah)\b/i.test(raw)
      || /\b(?:location|located|address)\b/i.test(normHints);
    const hasKnownCityMention = /\b(?:lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala|hyderabad|bahawalpur|bahawalnagar)\b/i.test(raw)
      || /\b(?:lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala|hyderabad|bahawalpur|bahawalnagar)\b/i.test(normHints);
    const hasDhaLikeAreaCue = /\b(?:dha|phase|block|sector|society|scheme|colony|bypass)\b/i.test(raw)
      || /\b(?:dha|phase|block|sector|society|scheme|colony|bypass)\b/i.test(normHints);
    const hasUrduLocationCue = /[\u0600-\u06FF]/.test(String(text || '')) && /لاہور|کراچی|اسلام\s*آباد|ڈی\s*ایچ\s*ای|فیز|بلاک|سیکٹر/.test(String(text || ''));
    return hasDirectLocationCue || hasKnownCityMention || hasDhaLikeAreaCue || hasUrduLocationCue;
  };

  const getAreaCandidateNearCity = (text, cityName) => {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const city = String(cityName || '').trim();
    if (!raw) return '';
    const cityEscaped = city ? city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const takeLastCaptured = (matches) => {
      if (!Array.isArray(matches) || !matches.length) return '';
      return String(matches[matches.length - 1]?.[1] || '').trim();
    };
    const locationScopedMatches = cityEscaped
      ? [...raw.matchAll(new RegExp(`(?:location|located)\\s*(?:is|ha|hai|:)?\\s*([a-z0-9\\s-]{2,60})\\s+${cityEscaped}\\b`, 'ig'))]
      : [];
    const genericScopedMatches = cityEscaped
      ? [...raw.matchAll(new RegExp(`(?:address|area)\\s*(?:is|ha|hai|:)?\\s*([a-z0-9\\s-]{2,60})\\s+${cityEscaped}\\b`, 'ig'))]
      : [];
    const nearCityMatch = cityEscaped
      ? raw.match(new RegExp(`\\b([a-z0-9\\s-]{2,60})\\s+${cityEscaped}\\b`, 'i'))
      : null;
    const anchoredSegment = raw.match(/(?:location|located|address|area)\s*(?:is|ha|hai|:)?\s*([^,.;]{2,80})/i);
    const commaNearEndMatch = raw.match(/([a-z0-9\s-]{2,50})\s*,\s*([a-z0-9\s-]{2,40})(?:\s|$)/i);
    const candidate = String(
      takeLastCaptured(locationScopedMatches)
      || takeLastCaptured(genericScopedMatches)
      || nearCityMatch?.[1]
      || anchoredSegment?.[1]
      || commaNearEndMatch?.[1]
      || ''
    )
      .replace(/\b(?:ye|yah|yeh|yha|yahan|waha|wahan|location|located|address|area|ma|mein|main|is|ha|hai|hain|or|aur|ka|ki|ke|jis|with|price|rent|sale|sell|lease|house|flat|shop|plot|makan|size)\b/gi, ' ')
      .replace(/\b(?:rs|pkr)\s*\d[\d,]*(?:\.\d+)?\b/gi, ' ')
      .replace(/\b\d{4,}\b/g, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = candidate.split(' ').filter(Boolean);
    if (words.length > 4) return words.slice(-4).join(' ');
    return candidate;
  };

  const parseCountByKeywords = (text, keywords = []) => {
    const raw = normalizeInputForUnderstanding(text);
    if (!raw || !keywords.length) return '';
    const keywordPattern = keywords.join('|');

    // Prefer the nearest/latest numeric mention for the keyword.
    // Handles text like "1 bed or 2 bath" correctly for bathrooms => 2.
    const numberBeforeKeywordMatches = [
      ...raw.matchAll(new RegExp(`\\b(\\d+)\\b(?:\\s+(?!\\d)\\w+){0,3}\\s*(?:${keywordPattern})\\b`, 'ig')),
    ];
    const numberBeforeKeyword = numberBeforeKeywordMatches[numberBeforeKeywordMatches.length - 1];
    if (numberBeforeKeyword?.[1]) return numberBeforeKeyword[1];

    // e.g. "bedrooms 5", "bathroom total 4"
    const keywordBeforeNumberMatches = [
      ...raw.matchAll(new RegExp(`\\b(?:${keywordPattern})\\b(?:\\s+(?!\\d)\\w+){0,3}\\s*(\\d+)\\b`, 'ig')),
    ];
    const keywordBeforeNumber = keywordBeforeNumberMatches[keywordBeforeNumberMatches.length - 1];
    if (keywordBeforeNumber?.[1]) return keywordBeforeNumber[1];

    return '';
  };

  const parseBedroomsFromText = (text) => {
    return parseCountByKeywords(text, ['bed', 'beds', 'bedroom', 'bedrooms', 'room', 'rooms', 'kamra', 'kamray', 'kamre']);
  };

  const parseBathroomsFromText = (text) => {
    return parseCountByKeywords(text, ['bath', 'baths', 'bathroom', 'bathrooms', 'washroom', 'washrooms', 'ghusalkhana']);
  };

  const hasAttachedBathroomIntent = (text) => {
    const raw = normalizeInputForUnderstanding(text);
    if (!raw) return false;
    return /\b(?:attach|attached)\s*(?:bath|bathroom|bathrooms|washroom|washrooms)\b/i.test(raw)
      || /\b(?:bath|bathroom|bathrooms|washroom|washrooms)\s*(?:attach|attached)\b/i.test(raw);
  };

  const parseFeaturesFromText = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return '';
    const featureHints = [];
    if (/\bparking\b/.test(raw)) featureHints.push('Parking');
    if (/\bgarden\b/.test(raw)) featureHints.push('Garden');
    if (/\bsecurity\b/.test(raw)) featureHints.push('Security');
    if (/\bgas\b/.test(raw)) featureHints.push('Gas');
    if (/\bsolar\b/.test(raw)) featureHints.push('Solar');
    if (/\bups\b|\binverter\b/.test(raw)) featureHints.push('UPS');
    return featureHints.join(', ');
  };

  const extractFactsFromText = (text, currentDraft, stage, options = {}) => {
    const { allowOverwrite = false } = options;
    const raw = String(text || '').trim();
    if (!raw) return {};

    const next = {};
    const purpose = parsePurpose(raw);
    const propertyType = inferPropertyTypeFromText(raw);
    const parsedGroupName = toGroupName(propertyType);
    const inferredGroup = getPropertyGroup(currentDraft?.propertyType || parsedGroupName || propertyType);
    const normalizedRaw = normalizeType(raw).replace(/\s+/g, ' ').trim();
    const isDirectGroupOnlyInput = ['home', 'commercial', 'plot', 'plots'].includes(normalizedRaw);
    const inferredSubType = isDirectGroupOnlyInput ? '' : inferSubTypeFromText(raw, inferredGroup);
    const parsedSize = parseSize(raw);
    const parsedPrice = parsePriceFromText(raw);
    const parsedAddress = parseAddressFromText(raw, stage === 'address');
    const parsedBedrooms = parseBedroomsFromText(raw);
    const parsedBathrooms = parseBathroomsFromText(raw);
    const parsedFeatures = parseFeaturesFromText(raw);
    const parsedContactNumber = parseContactNumber(raw);
    const parsedEmail = parseEmail(raw);
    const incomingTypeValue = parsedGroupName || propertyType;
    const currentTypeValue = String(currentDraft?.propertyType || '').trim();
    const incomingSubTypeValue = inferredSubType || (
      !isDirectGroupOnlyInput && propertyType && !parsedGroupName ? propertyType : ''
    );
    const currentSubTypeValue = String(currentDraft?.subType || '').trim();
    const canUpdateTypeNow = ['purpose', 'propertyType', 'subType'].includes(String(stage || '').toLowerCase());

    if ((allowOverwrite || !currentDraft.purpose) && purpose) next.purpose = purpose;
    if (incomingTypeValue) {
      if (allowOverwrite) {
        next.propertyType = incomingTypeValue;
      } else if (!currentTypeValue && canUpdateTypeNow) {
        next.propertyType = incomingTypeValue;
      } else if (canUpdateTypeNow && normalizeType(currentTypeValue) !== normalizeType(incomingTypeValue)) {
        next.propertyType = incomingTypeValue;
      }
    }
    if (incomingSubTypeValue) {
      if (allowOverwrite) {
        next.subType = incomingSubTypeValue;
      } else if (!currentSubTypeValue && canUpdateTypeNow) {
        next.subType = incomingSubTypeValue;
      } else if (canUpdateTypeNow && normalizeType(currentSubTypeValue) !== normalizeType(incomingSubTypeValue)) {
        next.subType = incomingSubTypeValue;
      }
    }
    if ((allowOverwrite || !currentDraft.size) && parsedSize) {
      next.size = parsedSize.value;
      next.sizeUnit = parsedSize.unit;
    }
    if ((allowOverwrite || !currentDraft.price) && parsedPrice) next.price = parsedPrice;
    const hasLocationCueInText = hasExplicitLocationIntent(raw);
    if (parsedAddress) {
      const currentAddress = String(currentDraft?.address || '').trim();
      const parsedAddressValue = String(parsedAddress || '').trim();
      const isAddressChanged = currentAddress && parsedAddressValue
        && currentAddress.toLowerCase() !== parsedAddressValue.toLowerCase();
      if (
        allowOverwrite
        || !currentAddress
        || (hasLocationCueInText && isAddressChanged)
      ) {
        next.address = parsedAddress;
      }
    }
    if ((allowOverwrite || !currentDraft.bedrooms) && parsedBedrooms) next.bedrooms = parsedBedrooms;
    if ((allowOverwrite || !currentDraft.bathrooms) && parsedBathrooms) next.bathrooms = parsedBathrooms;
    if ((allowOverwrite || !currentDraft.bathrooms) && !parsedBathrooms && hasAttachedBathroomIntent(raw)) {
      const inferredFromBeds = String(parsedBedrooms || currentDraft?.bedrooms || '').trim();
      if (/^\d+$/.test(inferredFromBeds)) next.bathrooms = inferredFromBeds;
    }
    if ((allowOverwrite || !currentDraft.features) && parsedFeatures) next.features = parsedFeatures;
    if ((allowOverwrite || !currentDraft.contactNumber) && parsedContactNumber) next.contactNumber = parsedContactNumber;
    if ((allowOverwrite || !currentDraft.email) && parsedEmail) next.email = parsedEmail;

    return next;
  };

  const parseContactNumber = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';

    const direct = normalizePakistanPhone(raw);
    if (isValidPakistanMobile(direct)) return direct;

    // Accept embedded phone number inside natural text.
    const embeddedCandidates = [
      ...raw.matchAll(/(?:\+?92|0)?\s*3\d{2}[\s-]?\d{7}\b/g),
    ].map((item) => String(item?.[0] || '').trim()).filter(Boolean);

    for (const candidate of embeddedCandidates) {
      const normalized = normalizePakistanPhone(candidate);
      if (isValidPakistanMobile(normalized)) return normalized;
    }

    return '';
  };

  const parseEmail = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const direct = raw.toLowerCase().replace(/^[<("'\s]+|[>)"'\s.,;:!?]+$/g, '');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) return direct;
    const embedded = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (!embedded?.[0]) return '';
    const cleaned = String(embedded[0]).toLowerCase().replace(/^[<("'\s]+|[>)"'\s.,;:!?]+$/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) return '';
    return cleaned;
  };

  const isLikelyDirectEmailInput = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return false;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return true;
    return Boolean(raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i));
  };

  const isLikelyDirectContactInput = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return false;
    return Boolean(raw.match(/^(?:\+?92|0)?\s*3\d{2}[\s-]?\d{7}$/));
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
      const parsedGroupName = toGroupName(inferredTypeRaw);
      const group = getPropertyGroup(parsedGroupName || inferredTypeRaw);
      const allowedGroups = getAllowedPropertyTypesForPurpose(currentDraft?.purpose);
      if (!allowedGroups.includes(group)) return { ok: false, nextDraft: currentDraft };
      const normalizedInput = normalizeType(trimmed).replace(/\s+/g, ' ').trim();
      const isDirectGroupSelection = ['home', 'commercial', 'plot', 'plots'].includes(normalizedInput);
      const inferredSubType = isDirectGroupSelection ? '' : inferSubTypeFromText(trimmed, group);
      const shouldUseDirectSubType = Boolean(inferredTypeRaw && !parsedGroupName && !isDirectGroupSelection);
      const resolvedSubType = inferredSubType || (shouldUseDirectSubType ? inferredTypeRaw : '');

      return {
        ok: true,
        nextDraft: {
          ...currentDraft,
          propertyType: group,
          // Reset stale subtype when user only chooses a broad category
          // (Home/Commercial/Plot), so subtype question appears next.
          subType: resolvedSubType,
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
      const address = parseAddressFromText(trimmed, true) || getDisplayLocationFromAddress(trimmed);
      if (!address) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, address } };
    }

    if (stage === 'price') {
      const price = parsePriceForPriceStage(trimmed);
      if (!price) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, price } };
    }

    if (stage === 'size') {
      const parsed = parseSize(trimmed, { allowBareNumber: true });
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
      const bedrooms = parseBedroomsFromText(trimmed) || (/^\d+$/.test(trimmed) ? trimmed : '');
      if (!bedrooms) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, bedrooms } };
    }

    if (stage === 'bathrooms') {
      if (isCommercialType(currentDraft) && /^skip$/i.test(trimmed)) {
        return { ok: true, nextDraft: { ...currentDraft, bathrooms: 'Skip' } };
      }
      let bathrooms = parseBathroomsFromText(trimmed) || (/^\d+$/.test(trimmed) ? trimmed : '');
      if (!bathrooms && hasAttachedBathroomIntent(trimmed)) {
        const fromBedrooms = String(currentDraft?.bedrooms || '').trim();
        if (/^\d+$/.test(fromBedrooms)) bathrooms = fromBedrooms;
      }
      if (!bathrooms) return { ok: false, nextDraft: currentDraft };
      return { ok: true, nextDraft: { ...currentDraft, bathrooms } };
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

  const getProfessionalLocation = (addressText) => {
    const raw = String(addressText || '').replace(/\s+/g, ' ').trim();
    if (!raw) return 'a prime location in Pakistan';
    const lower = raw.toLowerCase();

    const cityMatch = [...allCityNames]
      .sort((a, b) => b.length - a.length)
      .find((city) => lower.includes(String(city).toLowerCase()));

    const localityMatch = raw.match(
      /\b([a-z0-9\s-]{2,40}\b(?:town|phase|block|sector|society|scheme|colony|city|road|street|avenue)\b(?:\s*[a-z0-9-]{0,20})?)/i
    );

    if (cityMatch && localityMatch) {
      return `${toDisplayCase(localityMatch[1].trim())}, ${cityMatch}`;
    }
    if (cityMatch) return cityMatch;
    if (localityMatch) return toDisplayCase(localityMatch[1].trim());

    return 'a prime location in Pakistan';
  };

  const enforceMinDescriptionWords = (text, data, minWords = 100) => {
    let normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) normalized = 'A professionally prepared property listing is ready for serious buyers and investors.';

    const locationText = getProfessionalLocation(data?.address);
    const countWords = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
    const details = [
      `The location in ${locationText} offers convenient access to daily facilities, transport links, and a dependable neighborhood environment for long-term living.`,
      data?.size ? `With an area of ${data.size} ${data?.sizeUnit || ''}`.trim() + ', the property supports practical planning, comfortable use, and flexible future improvements.' : '',
      data?.price ? `The asking price of ${data.price} is positioned to attract genuine buyers while maintaining strong value for both end-users and investment-focused clients.` : '',
      'Overall, this listing combines location quality, functional specifications, and market relevance, making it a solid option for anyone looking for a reliable property opportunity.',
      'For complete details, visit scheduling, and document discussion, please get in touch today so this opportunity can be reviewed without delay.',
    ].filter(Boolean);

    while (countWords(normalized) < minWords) {
      const nextLine = details.shift() || 'Reach out now to discuss terms and secure this listing at the earliest convenience.';
      normalized = `${normalized} ${nextLine}`.replace(/\s+/g, ' ').trim();
    }

    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  };

  const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;

  const padToMinWords = (text, minWords, fillers) => {
    let out = String(text || '').replace(/\s+/g, ' ').trim();
    let i = 0;
    while (wordCount(out) < minWords && fillers.length && i < fillers.length * 4) {
      out = `${out} ${fillers[i % fillers.length]}`.replace(/\s+/g, ' ').trim();
      i += 1;
    }
    if (!/[.!?؟۔]$/.test(out)) out = `${out}.`;
    return out;
  };

  const buildListingSummaryText = (data, style = 'english') => {
    const lang = style === 'urdu' || style === 'romanUrdu' ? style : 'english';
    const locationText = getProfessionalLocation(data?.address);
    const propertyTypeText = data?.subType || data?.propertyType || (lang === 'urdu' ? 'جائیداد' : 'Property');
    const purposeText = (data?.purpose || 'Sell').toLowerCase();

    if (lang === 'english') {
      const purposeLabel = purposeText === 'rent' ? 'for Rent' : purposeText === 'lease' ? 'for Lease' : 'for Sale';
      const sizeText = data?.size ? `${data.size} ${data?.sizeUnit || ''}`.trim() : '';
      const hasBedrooms = Boolean(data?.bedrooms && data?.bedrooms !== 'Skip');
      const hasBathrooms = Boolean(data?.bathrooms && data?.bathrooms !== 'Skip');
      const title = `${sizeText ? `${sizeText} ` : ''}${propertyTypeText} ${purposeLabel} in ${locationText}`.replace(/\s+/g, ' ').trim();
      const highlights = [
        data?.size ? `The property spans ${sizeText}.` : '',
        hasBedrooms || hasBathrooms
          ? `It offers ${[
            hasBedrooms ? `${data.bedrooms} bedrooms` : '',
            hasBathrooms ? `${data.bathrooms} bathrooms` : '',
          ].filter(Boolean).join(' and ')}.`
          : '',
        data?.features ? `Notable features include ${data.features}.` : '',
        data?.price ? `The asking price is ${data.price}.` : '',
      ].filter(Boolean).join(' ');
      const baseDescription = `Presenting a well-maintained ${propertyTypeText} ${purposeLabel.toLowerCase()} in ${locationText}. ${highlights} This listing is ideal for buyers and investors seeking a practical property in a strong location with everyday convenience and long-term value potential.`;
      const description = enforceMinDescriptionWords(baseDescription, data, 100);
      return `Title: ${title}\nDescription: ${description}\nPlease upload photos to continue.`;
    }

    if (lang === 'romanUrdu') {
      const purposeLabel = purposeText === 'rent' ? 'rent ke liye' : purposeText === 'lease' ? 'lease ke liye' : 'sale ke liye';
      const sizeText = data?.size ? `${data.size} ${data?.sizeUnit || ''}`.trim() : '';
      const hasBedrooms = Boolean(data?.bedrooms && data?.bedrooms !== 'Skip');
      const hasBathrooms = Boolean(data?.bathrooms && data?.bathrooms !== 'Skip');
      const title = `${sizeText ? `${sizeText} ` : ''}${propertyTypeText} ${locationText} mein ${purposeLabel}`.replace(/\s+/g, ' ').trim();
      const parts = [
        data?.size ? `Raqba lagbhag ${sizeText} hai.` : '',
        hasBedrooms || hasBathrooms
          ? `${[hasBedrooms ? `${data.bedrooms} bedrooms` : '', hasBathrooms ? `${data.bathrooms} bathrooms` : ''].filter(Boolean).join(' aur ')} hain.`
          : '',
        data?.features ? `Khaas features: ${data.features}.` : '',
        data?.price ? `Expected amount: ${data.price}.` : '',
      ].filter(Boolean);
      const baseDescription = `Yeh ${propertyTypeText} ${locationText} par ${purposeLabel} available hai. ${parts.join(' ')} Location practical hai aur daily needs ke liye suitable hai.`;
      const description = padToMinWords(baseDescription, 85, [
        'Serious buyers aur investors ke liye yeh option achha balance deta hai.',
        'Agar detail chahiye to seedha rabta kar sakte hain.',
        'Neighbourhood me rehne ki suhulat aur access behtar hai.',
      ]);
      return `Title: ${title}\nDescription: ${description}\nAb photos upload kar ke aage barhein.`;
    }

    const purposeUr = purposeText === 'rent' ? 'کرایے' : purposeText === 'lease' ? 'لیز' : 'فروخت';
    const sizeText = data?.size ? `${data.size} ${data?.sizeUnit || ''}`.trim() : '';
    const hasBedrooms = Boolean(data?.bedrooms && data?.bedrooms !== 'Skip');
    const hasBathrooms = Boolean(data?.bathrooms && data?.bathrooms !== 'Skip');
    const title = `${propertyTypeText} — ${locationText} — ${purposeUr}${sizeText ? ` — ${sizeText}` : ''}`.replace(/\s+/g, ' ').trim();
    const parts = [
      data?.size ? `رقبہ تقریباً ${sizeText} ہے۔` : '',
      hasBedrooms || hasBathrooms
        ? `${hasBedrooms ? `${data.bedrooms} بیڈ روم` : ''}${hasBedrooms && hasBathrooms ? '، ' : ''}${hasBathrooms ? `${data.bathrooms} باتھ روم` : ''}۔`
        : '',
      data?.features ? `خصوصیات: ${data.features}۔` : '',
      data?.price ? `قیمت: ${data.price}۔` : '',
    ].filter(Boolean);
    const baseDescription = `یہ ${propertyTypeText} ${locationText} میں ${purposeUr} کے لیے دستیاب ہے۔ ${parts.join(' ')} مقام اور سہولت کے اعتبار سے اچھی پیشکش ہے۔`;
    const description = padToMinWords(baseDescription, 70, [
      'سنجیدہ خریداروں کے لیے قابل غور موقع ہے۔',
      'مزید تفصیلات کے لیے رابطہ کریں۔',
      'علاقے میں رہائش اور رسائی کی سہولت بہتر ہے۔',
    ]);
    return `عنوان: ${title}\nتفصیل: ${description}\nجاری رکھنے کے لیے تصاویر اپلوڈ کریں۔`;
  };

  const getFallbackReply = (question, replyLang) => {
    const q = String(question || '').toLowerCase();
    const lang = resolveReplyLang(replyLang);
    const pick = (en, ro, ar) => (lang === 'urdu' ? ar : lang === 'romanUrdu' ? ro : en);
    if (q.includes('price') || q.includes('rate')) {
      return pick(
        'Keep pricing aligned with nearby comparable listings and highlight clear value points in title/description.',
        'Pricing ko aas paas listings ke sath align rakhein aur title/description me clear value points dikhayein.',
        'قیمت قریبی لسٹنگز کے مطابق رکھیں اور عنوان/تفصیل میں واضح نکات شامل کریں۔',
      );
    }
    if (q.includes('title')) {
      return pick(
        'Keep the title short, clear, and focused on location + property type. Avoid over-promising words.',
        'Title short aur clear rakhein — location + property type par focus. Zyada claim wale words avoid karein.',
        'عنوان مختصر اور واضح رکھیں — مقام اور قسم پر توجہ۔ حد سے زیادہ وعدے نہ کریں۔',
      );
    }
    if (q.includes('description')) {
      return pick(
        'In description, mention location benefit first, then size/specs, then key features, and end with a simple call-to-action.',
        'Description me pehle location ka faida, phir size/specs, phir key features, aur end me simple call-to-action.',
        'تفصیل میں پہلے مقام کا فائدہ، پھر سائز/خصوصیات، پھر اہم نکات، اور آخر میں آسان اپیل۔',
      );
    }
    return pick(
      'Ask a specific question and I will give targeted suggestions to strengthen the listing.',
      'Koi specific sawal pooch lein, main listing ko mazboot banane ke liye targeted suggestion dunga.',
      'کوئی مخصوص سوال پوچھیں، میں لسٹنگ مضبوط کرنے کے لیے تجاویز دوں گا۔',
    );
  };

  const looksLikeChatPropertyTypeLabel = (text) => {
    const t = normalizeType(String(text || '')).replace(/\s+/g, ' ').trim();
    if (!t) return false;
    if (['home', 'commercial', 'plot'].includes(t)) return true;
    return CHATBOT_ALL_SUB_TYPES.some((item) => normalizeType(item) === t);
  };

  const looksLikeLocationSnippet = (text) => {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return false;
    const p = parseAddressParts(raw, citiesList);
    if (p?.cityName) return true;
    const lower = raw.toLowerCase();
    return allCityNames.some((city) => {
      const c = String(city || '').trim().toLowerCase();
      return c && lower.includes(c);
    });
  };

  const buildConfirmationTemplate = ({
    replyLang: style,
    sizeLabel,
    readableType,
    readablePurpose,
    priceLabel,
    locationLabel,
    bedroomsLabel,
    bathroomsLabel,
  }) => {
    const lang = resolveReplyLang(style);
    const subjectEnglish = `${sizeLabel ? `${sizeLabel} ` : ''}${readableType}`.replace(/\s+/g, ' ').trim();

    if (lang === 'romanUrdu') {
      const purposeUrduText = readablePurpose === 'rent' ? 'rent ke liye' : readablePurpose === 'lease' ? 'lease ke liye' : 'sale ke liye';
      const subjectUr = `${sizeLabel ? `${sizeLabel} ka ` : ''}${readableType}`.replace(/\s+/g, ' ').trim();
      const details = [];
      if (locationLabel) details.push(`location ${locationLabel}`);
      if (priceLabel) {
        if (readablePurpose === 'rent') details.push(`rent ${priceLabel}`);
        else if (readablePurpose === 'lease') details.push(`lease ${priceLabel}`);
        else details.push(`price ${priceLabel}`);
      }
      if (bedroomsLabel && bathroomsLabel) details.push(`${bedroomsLabel} bedrooms aur ${bathroomsLabel} bathrooms hain`);
      else if (bedroomsLabel) details.push(`${bedroomsLabel} bedrooms mention kiye`);
      else if (bathroomsLabel) details.push(`${bathroomsLabel} bathrooms mention kiye`);
      const detailsText = details.length ? ` — ${details.join(' — ')}` : '';
      return `Perfect! Aap ${subjectUr} ko ${purposeUrduText} list karna chahte hain${detailsText}.`;
    }

    if (lang === 'urdu') {
      const detailsAr = [];
      if (locationLabel) detailsAr.push(`مقام: ${locationLabel}`);
      if (priceLabel) {
        if (readablePurpose === 'rent') detailsAr.push(`کرایہ: ${priceLabel}`);
        else if (readablePurpose === 'lease') detailsAr.push(`لیز: ${priceLabel}`);
        else detailsAr.push(`قیمت: ${priceLabel}`);
      }
      if (bedroomsLabel && bathroomsLabel) detailsAr.push(`${bedroomsLabel} بیڈ روم، ${bathroomsLabel} باتھ روم`);
      else if (bedroomsLabel) detailsAr.push(`${bedroomsLabel} بیڈ روم`);
      else if (bathroomsLabel) detailsAr.push(`${bathroomsLabel} باتھ روم`);
      const tail = detailsAr.length ? ` (${detailsAr.join('، ')})` : '';
      const purposeAr = readablePurpose === 'rent' ? 'کرایے' : readablePurpose === 'lease' ? 'لیز' : 'فروخت';
      return `بہترین! آپ ${subjectEnglish} کو ${purposeAr} کے لیے لسٹ کرنا چاہتے ہیں${tail}۔`;
    }

    const englishDetails = [];
    if (locationLabel) englishDetails.push(`located in ${locationLabel}`);
    if (priceLabel) {
      if (readablePurpose === 'rent') englishDetails.push(`with a rent of ${priceLabel}`);
      else if (readablePurpose === 'lease') englishDetails.push(`with a lease amount of ${priceLabel}`);
      else englishDetails.push(`with an asking price of ${priceLabel}`);
    }
    if (bedroomsLabel && bathroomsLabel) englishDetails.push(`featuring ${bedroomsLabel} bedrooms and ${bathroomsLabel} bathrooms`);
    else if (bedroomsLabel) englishDetails.push(`featuring ${bedroomsLabel} bedrooms`);
    else if (bathroomsLabel) englishDetails.push(`featuring ${bathroomsLabel} bathrooms`);
    const englishDetailText = englishDetails.length ? ` ${englishDetails.join(' and ')}.` : '.';
    return `Great! You want to list ${subjectEnglish} for ${readablePurpose}${englishDetailText}`;
  };

  const summarizeCapturedFacts = (previousDraft, nextDraft, userText = '', replyLang) => {
    const picked = [];
    const prev = previousDraft || {};
    const next = nextDraft || {};
    const isNewValue = (key) => {
      const before = String(prev?.[key] || '').trim();
      const after = String(next?.[key] || '').trim();
      return !before && !!after;
    };
    const isUpdatedValue = (key) => {
      const before = String(prev?.[key] || '').trim();
      const after = String(next?.[key] || '').trim();
      return !!after && before.toLowerCase() !== after.toLowerCase();
    };

    if (isNewValue('purpose')) picked.push('purpose');
    if (isNewValue('propertyType')) picked.push('property type');
    if (isNewValue('subType')) picked.push('sub-type');
    if (isNewValue('address')) picked.push('location');
    if (isNewValue('size')) picked.push('size');
    if (isNewValue('price')) picked.push('price');
    if (isNewValue('bedrooms')) picked.push('bedrooms');
    if (isNewValue('bathrooms')) picked.push('bathrooms');
    if (isNewValue('features')) picked.push('features');

    if (!picked.length) return '';

    const purposeText = String(next?.purpose || '').toLowerCase();
    const readablePurpose = purposeText === 'rent' ? 'rent' : purposeText === 'lease' ? 'lease' : 'sale';
    const rawTypeValue = String(next?.subType || next?.propertyType || '').trim();
    const normalizedTypeValue = normalizeType(rawTypeValue);
    const isKnownTypeValue = (
      ['home', 'commercial', 'plot'].includes(normalizedTypeValue)
      || CHATBOT_ALL_SUB_TYPES.some((item) => normalizeType(item) === normalizedTypeValue)
    );
    let readableType = (isKnownTypeValue ? rawTypeValue : 'property').toLowerCase();
    const sizeLabel = next?.size ? `${next.size} ${next?.sizeUnit || ''}`.trim() : '';
    const priceLabel = isUpdatedValue('price') ? String(next?.price || '').trim() : '';
    const parsedLocation = parseAddressParts(next?.address, citiesList);
    const displayLocation = getDisplayLocationFromAddress(next?.address);
    let locationLabel = '';
    if (isUpdatedValue('address') && parsedLocation?.cityName) {
      locationLabel = String(displayLocation || '').replace(/\s+/g, ' ').trim();
      if (!locationLabel) {
        const areaOnly = String(parsedLocation?.areaName || '').replace(/\s+/g, ' ').trim();
        locationLabel = areaOnly
          ? `${areaOnly}, ${parsedLocation.cityName}`.replace(/\s+/g, ' ').trim()
          : String(parsedLocation.cityName || '').trim();
      }
    }

    if (looksLikeLocationSnippet(readableType) && !looksLikeChatPropertyTypeLabel(readableType)) {
      const sub = String(next?.subType || '').trim();
      const grp = String(next?.propertyType || '').trim();
      const pick = [sub, grp].find((x) => x && !looksLikeLocationSnippet(x) && looksLikeChatPropertyTypeLabel(x))
        || [sub, grp].find((x) => x && !looksLikeLocationSnippet(x));
      readableType = pick ? pick.replace(/\s+/g, ' ').trim().toLowerCase() : 'property';
    }
    if (locationLabel && looksLikeChatPropertyTypeLabel(locationLabel) && !looksLikeLocationSnippet(locationLabel)) {
      locationLabel = String(getDisplayLocationFromAddress(next?.address) || '').replace(/\s+/g, ' ').trim();
    }
    if (locationLabel && looksLikeChatPropertyTypeLabel(locationLabel) && !looksLikeLocationSnippet(locationLabel)) {
      locationLabel = '';
    }
    const bedroomsLabel = isUpdatedValue('bedrooms') ? String(next?.bedrooms || '').trim() : '';
    const bathroomsLabel = isUpdatedValue('bathrooms') ? String(next?.bathrooms || '').trim() : '';
    const hasStructuredSummary = Boolean(sizeLabel || priceLabel || locationLabel || bedroomsLabel || bathroomsLabel || isNewValue('purpose') || isNewValue('propertyType') || isNewValue('subType'));
    const lang = resolveReplyLang(replyLang);
    if (hasStructuredSummary) {
      return buildConfirmationTemplate({
        replyLang,
        sizeLabel,
        readableType,
        readablePurpose,
        priceLabel,
        locationLabel,
        bedroomsLabel,
        bathroomsLabel,
      });
    }
    const compact = picked.slice(0, 4).join(', ');
    if (lang === 'romanUrdu') return `Perfect! Main ne aap ki ${compact} details note kar li hain.`;
    if (lang === 'urdu') return `بہترین! میں نے آپ کی ${compact} تفصیلات نوٹ کر لی ہیں۔`;
    return `Great! I have captured your ${compact}.`;
  };

  const toLocationFileName = (cityName) => {
    const words = String(cityName || '')
      .replace(/[^a-zA-Z0-9 ]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return '';
    const [first, ...rest] = words;
    return `${first.charAt(0).toLowerCase()}${first.slice(1)}${rest
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join('')}`;
  };

  const loadAreasForCity = async (cityName) => {
    const fileName = toLocationFileName(cityName);
    if (!fileName) {
      setCityAreas([]);
      setAreasLoadError('City areas file not found.');
      return;
    }

    setIsAreasLoading(true);
    setAreasLoadError('');
    setCityAreas([]);
    try {
      const module = await import(`../../citiesLocation/locations/${fileName}.json`);
      const rawAreas = Array.isArray(module?.default) ? module.default : [];
      const areaNames = Array.from(
        new Set(rawAreas.map((item) => String(item?.name || '').replace(/\s+/g, ' ').trim()).filter(Boolean))
      );
      setCityAreas(areaNames);
      if (!areaNames.length) {
        setAreasLoadError('No areas found for selected city.');
      }
    } catch {
      setAreasLoadError('No areas file found for selected city.');
      setCityAreas([]);
    } finally {
      setIsAreasLoading(false);
    }
  };

  const requestAiDiscussionReply = async (userText, history, replyLang) => {
    const apiKey = (process.env.REACT_APP_OPENAI_API_KEY || '').trim();
    const lang = resolveReplyLang(replyLang);
    if (!apiKey) return getFallbackReply(userText, replyLang);

    const recentMessages = history.slice(-10).map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.text,
    }));

    const systemPrompt = lang === 'urdu'
      ? 'You are a Pakistani property listing assistant. Reply only in Urdu (Arabic script). Keep it natural, human, and simple — 2–4 short lines. Stay in Urdu unless the user clearly switches language.'
      : lang === 'romanUrdu'
        ? 'You are a Pakistani property listing assistant. Reply only in Roman Urdu (Urdu written in Latin letters). Keep it natural, human, and simple — 2–4 short lines. Stay in Roman Urdu unless the user clearly switches language.'
        : 'You are a Pakistani property listing assistant. Reply only in clear, simple English — 2–4 short lines. Stay in English unless the user clearly switches language.';

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
            content: systemPrompt,
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

  const normalizeRefinedCommandTypos = (text) => {
    return String(text || '')
      .replace(/\b(?:lak)\b/gi, 'lakh')
      .replace(/\b(?:amrla|mrla|marlay|marle|marley)\b/gi, 'marla')
      .replace(/\b(?:upper|uper|upr)\s+(?:wala|walla)?\s*(?:part|hissa|hisa)\b/gi, 'upper portion')
      .replace(/\b(?:lower|neecha|necha|neechy|nechy|niche)\s+(?:wala|walla)?\s*(?:part|hissa|hisa)\b/gi, 'lower portion')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const parseRefinementJson = (rawContent, sourceText) => {
    const fallback = {
      original_text: sourceText,
      clean_text: sourceText,
      refined_text: sourceText,
      intent: null,
      property_type: null,
      location: null,
      price: null,
    };
    const raw = String(rawContent || '').trim();
    if (!raw) return fallback;
    const tryParse = (value) => {
      try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    let parsed = tryParse(raw);
    if (!parsed) {
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      parsed = fenced?.[1] ? tryParse(String(fenced[1]).trim()) : null;
    }
    if (!parsed) return fallback;

    return {
      original_text: String(parsed?.original_text || sourceText).trim() || sourceText,
      clean_text: normalizeRefinedCommandTypos(String(parsed?.clean_text || sourceText).trim() || sourceText),
      refined_text: normalizeRefinedCommandTypos(String(parsed?.refined_text || parsed?.clean_text || sourceText).trim() || sourceText),
      intent: parsed?.intent ? String(parsed.intent).trim().toUpperCase() : null,
      property_type: parsed?.property_type ? String(parsed.property_type).trim() : null,
      location: parsed?.location ? String(parsed.location).trim() : null,
      price: parsed?.price ? String(parsed.price).trim() : null,
    };
  };

  const mapRefinedIntentToPurpose = (intent) => {
    const value = String(intent || '').trim().toUpperCase();
    if (value === 'SELL' || value === 'BUY') return 'Sell';
    if (value === 'RENT') return 'Rent';
    if (value === 'LEASE') return 'Lease';
    return '';
  };

  const requestAiCommandRefinement = async (rawText) => {
    const sourceText = String(rawText || '').trim();
    if (!sourceText) return parseRefinementJson('', '');
    const apiKey = (process.env.REACT_APP_OPENAI_API_KEY || '').trim();
    if (!apiKey) return parseRefinementJson('', sourceText);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `You are a command-refinement parser for Pakistan property listing chat.
Return ONLY valid JSON with this exact schema:
{
  "original_text": string,
  "clean_text": string,
  "refined_text": string,
  "intent": "SELL" | "BUY" | "RENT" | "LEASE" | null,
  "property_type": string | null,
  "location": string | null,
  "price": string | null
}

Rules:
- Understand Roman Urdu, Urdu (latin), and English mixed text.
- Correct typos but keep user's meaning.
- Normalize common typos: "lak" => "lakh", "amrla/mrla/marlay" => "marla".
- "dukan/dukkan" => shop.
- "ghar/ghr/makan/rehaish" => house/home intent.
- "bechna/farokht" => SELL.
- "kiraya/karyia/kariya rent par dena" => RENT.
- "upper portion/lower portion/neecha hissa/part" should be preserved in refined_text.
- If location is not clearly provided, set location to null (do not hallucinate).
- If price is not clearly provided, set price to null.
- Keep refined_text concise and useful for downstream extraction.`,
          },
          {
            role: 'user',
            content: sourceText,
          },
        ],
      }),
    });

    if (!response.ok) return parseRefinementJson('', sourceText);
    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    return parseRefinementJson(content, sourceText);
  };

  const enrichRefinedCommandForParsing = (originalText, refinedText) => {
    const fallback = String(originalText || '').replace(/\s+/g, ' ').trim();
    const base = String(refinedText || fallback).replace(/\s+/g, ' ').trim();
    if (!base) return fallback;

    const mergedForInference = `${fallback} ${base}`.trim();
    const purpose = parsePurpose(mergedForInference);
    const propertyType = inferPropertyTypeFromText(mergedForInference);
    const normalizedBase = normalizeInputForUnderstanding(base);
    const additions = [];

    if (purpose === 'Sell' && !/\b(?:sell|sale|for sale|selling)\b/i.test(normalizedBase)) {
      additions.push('for sale');
    } else if (purpose === 'Rent' && !/\b(?:rent|for rent)\b/i.test(normalizedBase)) {
      additions.push('for rent');
    } else if (purpose === 'Lease' && !/\blease\b/i.test(normalizedBase)) {
      additions.push('for lease');
    }

    const typeTokenByName = {
      House: 'house',
      Apartment: 'apartment',
      Flat: 'flat',
      Plot: 'plot',
      Shop: 'shop',
      Office: 'office',
      Villa: 'villa',
      'Farm House': 'farm house',
      Room: 'room',
      Building: 'building',
      Warehouse: 'warehouse',
      Factory: 'factory',
    };
    const typeToken = typeTokenByName[propertyType];
    if (typeToken && !normalizedBase.includes(typeToken)) {
      additions.push(typeToken);
    }

    if (!additions.length) return base;
    return `${base} ${additions.join(' ')}`.replace(/\s+/g, ' ').trim();
  };

  const getInitialAssistantMessages = () => {
    const lang = responseStyle === 'urdu' || responseStyle === 'romanUrdu' ? responseStyle : 'english';
    const welcomeText = lang === 'urdu'
      ? '👋 السلام علیکم! میں آپ کا AI پراپرٹی اسسٹنٹ ہوں۔ اپنی لسٹنگ کی تفصیلات بتائیں، میں قدم بہ قدم نوٹ کروں گا۔'
      : lang === 'romanUrdu'
        ? '👋 Salam! Main aap ka AI property assistant hoon. Apni listing ki details batayein, main qadam ba qadam note karunga.'
        : PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE;
    const purposeText = lang === 'urdu'
      ? 'آپ کی لسٹنگ کا مقصد کیا ہے؟ (فروخت، کرایہ، یا لیز)'
      : lang === 'romanUrdu'
        ? 'Apni listing ka purpose kya hai? Sell, Rent ya Lease?'
        : PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION;
    return [
      {
        role: 'assistant',
        text: welcomeText,
        assistantBatchId: ASSISTANT_WELCOME_BATCH_ID,
      },
      {
        role: 'assistant',
        text: purposeText,
        assistantBatchId: ASSISTANT_WELCOME_BATCH_ID,
      },
    ];
  };

  useEffect(() => {
    if (!messages.length) {
      setMessages(getInitialAssistantMessages());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onPersistChatState?.({ messages, draft, responseStyle: responseStyle || '' });
  }, [messages, draft, responseStyle, onPersistChatState]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isReplyLoading]);

  const showBotTypingDelay = async () => {
    setIsReplyLoading(true);
    await new Promise((resolve) => setTimeout(resolve, BOT_TYPING_DELAY_MS));
    setIsReplyLoading(false);
  };

  const handleSend = async (overrideText, options = {}) => {
    const editMessageIndex = Number.isInteger(options?.editMessageIndex) ? options.editMessageIndex : null;
    const isEditingMessage = editMessageIndex !== null;
    const isEventLikeOverride = Boolean(
      overrideText
      && typeof overrideText === 'object'
      && (typeof overrideText.preventDefault === 'function' || Object.prototype.hasOwnProperty.call(overrideText, 'target'))
    );
    const hasDirectOverride = !isEventLikeOverride
      && overrideText !== undefined
      && overrideText !== null
      && (typeof overrideText === 'string' || typeof overrideText === 'number');
    const userText = String(hasDirectOverride ? overrideText : inputText).trim();
    if (!userText || isReplyLoading || assistantUiStreamHold) return;
    const ambiguousLang = isAmbiguousLanguageInput(userText);
    const detectedLang = detectResponseStyle(userText);
    const replyLang = isFlowLanguageLocked
      ? responseStyle
      : (ambiguousLang ? 'english' : detectedLang);
    if (!isFlowLanguageLocked && !ambiguousLang) {
      setResponseStyle(detectedLang);
    }
    const pickMsg = (en, ro, ar) => (replyLang === 'urdu' ? ar : replyLang === 'romanUrdu' ? ro : en);
    const stageBeforeRefinement = getCurrentStage(draft);
    let refinementMeta = parseRefinementJson('', userText);
    let refinedUserText = userText;
    const deterministicFactsPreview = extractFactsFromText(userText, draft, stageBeforeRefinement, { allowOverwrite: false });
    const isLikelyStructuredSelectionInput = (() => {
      const normalized = normalizeType(userText).replace(/\s+/g, ' ').trim();
      if (!normalized) return false;
      const knownTokens = new Set([
        ...CHATBOT_PURPOSE_OPTIONS.map((item) => normalizeType(item)),
        ...Object.keys(CHATBOT_SUB_TYPE_OPTIONS).map((item) => normalizeType(item)),
        ...CHATBOT_ALL_SUB_TYPES.map((item) => normalizeType(item)),
        'yes',
        'no',
        'skip',
      ]);
      if (knownTokens.has(normalized)) return true;
      // Purely numeric/compact values are already handled deterministically in stage parsers.
      if (/^\d[\d,\s.]*$/.test(normalized)) return true;
      return false;
    })();
    const skipRefinementForPrice = stageBeforeRefinement === 'price' && isLikelyDirectPriceInput(userText);
    const skipRefinementForEmail = stageBeforeRefinement === 'email' && isLikelyDirectEmailInput(userText);
    const skipRefinementForContact = stageBeforeRefinement === 'contactNumber' && isLikelyDirectContactInput(userText);
    const skipRefinementForDeterministic = isLikelyStructuredSelectionInput && Boolean(
      deterministicFactsPreview?.purpose
      || deterministicFactsPreview?.propertyType
      || deterministicFactsPreview?.subType
      || deterministicFactsPreview?.size
      || deterministicFactsPreview?.price
      || deterministicFactsPreview?.bedrooms
      || deterministicFactsPreview?.bathrooms
      || deterministicFactsPreview?.features
      || deterministicFactsPreview?.contactNumber
      || deterministicFactsPreview?.email
    );
    // English-biased refinement often mangles Urdu script; local extractFacts + urduScriptLatinHints handle it.
    const skipRefinementForUrduScript = /[\u0600-\u06FF]/.test(userText);
    if (!(skipRefinementForPrice || skipRefinementForEmail || skipRefinementForContact || skipRefinementForDeterministic || skipRefinementForUrduScript)) {
      try {
        refinementMeta = await withTimeout(requestAiCommandRefinement(userText), 4000);
        refinedUserText = String(
          refinementMeta?.refined_text
          || refinementMeta?.clean_text
          || userText
        ).trim();
      } catch {
        refinedUserText = userText;
      }
    }
    refinedUserText = enrichRefinedCommandForParsing(userText, refinedUserText);

    const userMessage = { role: 'user', text: userText };
    const buildMessagesAfterEdit = (sourceMessages) => {
      if (editMessageIndex === null) return sourceMessages;
      const safeIndex = Math.max(0, Math.min(editMessageIndex, sourceMessages.length - 1));
      const before = sourceMessages.slice(0, safeIndex);
      return [...before, { role: 'user', text: userText }];
    };

    setInputText('');
    if (editMessageIndex === null) {
      setMessages((prev) => [...prev, userMessage]);
    }

    const baseDraft = draft;
    const stage = getCurrentStage(baseDraft);
    const rawHasLocationIntent = hasExplicitLocationIntent(userText);
    const rawParsedLocation = parseAddressFromText(userText, true);
    const inferredFactsFromRefined = extractFactsFromText(refinedUserText, baseDraft, stage, { allowOverwrite: isEditingMessage });
    const inferredFactsFromRaw = extractFactsFromText(userText, baseDraft, stage, { allowOverwrite: isEditingMessage });
    const refinedPurpose = mapRefinedIntentToPurpose(refinementMeta?.intent);
    const effectivePurposeForType = inferredFactsFromRaw?.purpose || refinedPurpose || baseDraft?.purpose;
    const refinedPropertyGroup = refinementMeta?.property_type ? getPropertyGroup(refinementMeta.property_type) : '';
    const canUseRefinedPropertyType = Boolean(
      refinementMeta?.property_type
      && refinedPropertyGroup
      && getAllowedPropertyTypesForPurpose(effectivePurposeForType).includes(refinedPropertyGroup),
    );
    const hasRawTypeOrSubType = Boolean(
      String(inferredFactsFromRaw?.propertyType || '').trim()
      || String(inferredFactsFromRaw?.subType || '').trim(),
    );
    let inferredFacts = {
      ...inferredFactsFromRefined,
      ...(inferredFactsFromRaw?.purpose ? { purpose: inferredFactsFromRaw.purpose } : {}),
      ...(inferredFactsFromRaw?.price ? { price: inferredFactsFromRaw.price } : {}),
      ...(inferredFactsFromRaw?.size ? { size: inferredFactsFromRaw.size, sizeUnit: inferredFactsFromRaw.sizeUnit } : {}),
      ...(inferredFactsFromRaw?.propertyType ? { propertyType: inferredFactsFromRaw.propertyType } : {}),
      ...(inferredFactsFromRaw?.subType ? { subType: inferredFactsFromRaw.subType } : {}),
      ...(inferredFactsFromRaw?.contactNumber ? { contactNumber: inferredFactsFromRaw.contactNumber } : {}),
      ...(inferredFactsFromRaw?.email ? { email: inferredFactsFromRaw.email } : {}),
      ...(refinedPurpose ? { purpose: refinedPurpose } : {}),
      ...(!hasRawTypeOrSubType && canUseRefinedPropertyType ? {
        subType: toDisplayCase(refinementMeta.property_type),
        propertyType: refinedPropertyGroup || inferredFactsFromRaw?.propertyType || inferredFactsFromRefined?.propertyType,
      } : {}),
      ...(
        refinementMeta?.location
        && !String(inferredFactsFromRaw?.address || '').trim()
        && !String(rawParsedLocation || '').trim()
          ? { address: refinementMeta.location }
          : {}
      ),
      ...(refinementMeta?.price ? { price: formatPriceWithRs(refinementMeta.price) } : {}),
    };
    if (!rawHasLocationIntent && !rawParsedLocation && stage !== 'address' && inferredFacts?.address) {
      // Prevent AI refinement from injecting a location user never provided.
      const { address, ...rest } = inferredFacts;
      inferredFacts = rest;
    }
    let workingDraft = { ...baseDraft, ...inferredFacts };
    // When current step is category selection, clear stale subtype unless
    // user explicitly provided a subtype in this same message.
    if (
      stage === 'propertyType'
      && String(workingDraft?.propertyType || '').trim()
      && !String(inferredFacts?.subType || '').trim()
    ) {
      workingDraft = { ...workingDraft, subType: '' };
    }
    const parsedLocationFromInput = rawParsedLocation;
    const hasLocationIntent = rawHasLocationIntent;
    const shouldValidateLocation = shouldValidateLocationInput(userText, stage);
    const hasAddressAlready = Boolean(String(baseDraft?.address || '').trim());
    const hasAddressAfterParse = Boolean(String(workingDraft?.address || '').trim());
    const isInvalidLocationInput = shouldValidateLocation && hasLocationIntent && !parsedLocationFromInput && !hasAddressAlready && !hasAddressAfterParse;
    const normalizeLoose = (value) => String(value || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/q/g, 'k')
      .replace(/\bnager\b/g, 'nagar')
      .replace(/\s+/g, ' ')
      .trim();

    let isInvalidAreaInput = false;
    if (hasLocationIntent) {
      const parsedFromRaw = parseAddressParts(userText, citiesList);
      const cityFromInput = String(parsedFromRaw?.cityName || '').trim();
      // Prefer parser-derived area first (more exact for values like "Model City - Block A").
      // Keep regex candidate as fallback only.
      const areaFromInput = String(parsedFromRaw?.areaName || '').trim()
        || getAreaCandidateNearCity(userText, cityFromInput);
      const normalizeCityAware = (value) => String(value || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/q/g, 'k')
        .replace(/\bnager\b/g, 'nagar')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedCity = normalizeCityAware(cityFromInput);
      const hasAreaDetailInInput = Boolean(areaFromInput || userText.includes(','));
      const areaMetaFromCandidate = (cityFromInput && areaFromInput)
        ? await resolveAreaMetadata(cityFromInput, areaFromInput)
        : null;
      const areaMetaFromRaw = cityFromInput ? await resolveAreaMetadata(cityFromInput, userText) : null;
      const pickedAreaMeta = [areaMetaFromCandidate, areaMetaFromRaw].find((item) => {
        const areaName = normalizeCityAware(item?.name);
        return areaName && areaName !== normalizedCity;
      });

      if (cityFromInput && pickedAreaMeta?.name) {
        workingDraft = {
          ...workingDraft,
          address: `${pickedAreaMeta.name}, ${cityFromInput}`.replace(/\s+/g, ' ').trim(),
        };
      } else if (cityFromInput && areaFromInput) {
        let areaMeta = await resolveAreaMetadata(cityFromInput, areaFromInput);
        let resolvedAreaName = normalizeCityAware(areaMeta?.name);
        if (!areaMeta?.name || !resolvedAreaName || resolvedAreaName === normalizedCity) {
          const canonical = extractCanonicalDhaPhaseLabel(userText);
          if (canonical && canonical.trim().toLowerCase() !== areaFromInput.trim().toLowerCase()) {
            areaMeta = await resolveAreaMetadata(cityFromInput, canonical);
            resolvedAreaName = normalizeCityAware(areaMeta?.name);
          }
        }
        if (areaMeta?.name && resolvedAreaName && resolvedAreaName !== normalizedCity) {
          workingDraft = {
            ...workingDraft,
            address: `${areaMeta.name}, ${cityFromInput}`.replace(/\s+/g, ' ').trim(),
          };
        } else {
          const canonical = extractCanonicalDhaPhaseLabel(userText);
          const allowFreeformDha = Boolean(
            canonical
            && /^dha\s*phase\s*\d+/i.test(canonical)
            && (/ڈی\s*ایچ\s*ای|dha|phase|فیز/i.test(userText)),
          );
          if (allowFreeformDha) {
            workingDraft = {
              ...workingDraft,
              address: `${canonical}, ${cityFromInput}`.replace(/\s+/g, ' ').trim(),
            };
          } else {
            isInvalidAreaInput = true;
          }
        }
      } else if (cityFromInput && !areaFromInput) {
        const locationText = normalizeLoose(userText);
        const cityText = normalizeLoose(cityFromInput);
        const hasOnlyCity = locationText === cityText || locationText.endsWith(` ${cityText}`);
        if (!hasOnlyCity || hasAreaDetailInInput) {
          isInvalidAreaInput = true;
        }
      }
    }

    if (isEditingMessage) {
      const editedBaseMessages = buildMessagesAfterEdit(messages);
      setDraft(workingDraft);
      syncDraftToParent(workingDraft);

      if (isInvalidAreaInput) {
        await showBotTypingDelay();
        const invalidAreaEditText = pickMsg(
          'Invalid area. City was matched, but the area was not found in valid list. Please provide a correct area name.',
          'Invalid area. City match ho gaya, lekin area valid list me nahi mila. Please sahi area name dein.',
          'غلط علاقہ۔ شہر مل گیا مگر علاقہ فہرست میں نہیں۔ درست نام بتائیں۔',
        );
        beginAssistantUiStreamHoldFromTexts(invalidAreaEditText);
        setMessages([
          ...editedBaseMessages,
          { role: 'assistant', text: invalidAreaEditText },
        ]);
        return;
      }

      if (isInvalidLocationInput) {
        await showBotTypingDelay();
        const invalidLocEditText = pickMsg(
          'Invalid location. Please select a valid area and city (e.g. DHA Phase 8, Lahore).',
          'Invalid location. Please valid area aur city select karein (maslan DHA Phase 8, Lahore).',
          'غلط مقام۔ درست علاقہ اور شہر منتخب کریں (مثلاً DHA Phase 8, Lahore)۔',
        );
        beginAssistantUiStreamHoldFromTexts(invalidLocEditText);
        setMessages([
          ...editedBaseMessages,
          { role: 'assistant', text: invalidLocEditText },
        ]);
        return;
      }
      if (returnToPublishOnSend) {
        await showBotTypingDelay();
        const returnPublishText = pickMsg(
          'Update saved. Returning to publish preview.',
          'Update save ho gaya. Publish preview par wapas ja rahe hain.',
          'اپ ڈیٹ محفوظ۔ اشاعت کے پیش نظارہ پر واپس۔',
        );
        beginAssistantUiStreamHoldFromTexts(returnPublishText);
        setMessages([
          ...editedBaseMessages,
          { role: 'assistant', text: returnPublishText },
        ]);
        onReturnToPublishAfterSend?.();
        return;
      }

      const nextStage = getCurrentStage(workingDraft);
      const ackText = summarizeCapturedFacts(draft, workingDraft, userText, replyLang);
      await showBotTypingDelay();
      const assistantReplyBatch = newAssistantBatchId();
      if (nextStage === 'images') {
        beginAssistantUiStreamHoldFromTexts(
          ackText,
          buildListingSummaryText(workingDraft, replyLang),
          getPromptForStage('images', replyLang),
        );
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatch }] : []),
          { role: 'assistant', text: buildListingSummaryText(workingDraft, replyLang), assistantBatchId: assistantReplyBatch },
          { role: 'assistant', text: getPromptForStage('images', replyLang), assistantBatchId: assistantReplyBatch },
        ]);
      } else if (nextStage === 'complete') {
        const completeText = pickMsg(
          'Great! Basic listing details are complete. You can now ask for title, description, pricing, or listing strategy.',
          'Great! Basic listing details complete ho gayi hain. Ab title, description, pricing ya strategy par seedha mashwara le sakte hain.',
          'بہترین! بنیادی تفصیلات مکمل۔ اب عنوان، تفصیل، قیمت یا حکمت عملی پوچھ سکتے ہیں۔',
        );
        beginAssistantUiStreamHoldFromTexts(ackText, completeText);
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatch }] : []),
          {
            role: 'assistant',
            assistantBatchId: assistantReplyBatch,
            text: completeText,
          },
        ]);
      } else {
        beginAssistantUiStreamHoldFromTexts(ackText, getPromptForStage(nextStage, replyLang));
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatch }] : []),
          { role: 'assistant', text: getPromptForStage(nextStage, replyLang), assistantBatchId: assistantReplyBatch },
        ]);
      }
      return;
    }

    if (stage !== 'complete') {
      if (!String(workingDraft[stage] || '').trim()) {
        const stageSensitiveAnswer = ['price', 'email', 'contactNumber'].includes(stage)
          ? userText
          : refinedUserText;
        const { ok, nextDraft } = applyAnswerToDraft(stage, stageSensitiveAnswer, workingDraft);
        if (!ok) {
          await showBotTypingDelay();
          const inv = getInvalidStageReply(stage, replyLang);
          beginAssistantUiStreamHoldFromTexts(inv);
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: inv },
          ]);
          return;
        }
        workingDraft = nextDraft;
      }

      if (!String(workingDraft[stage] || '').trim()) {
        await showBotTypingDelay();
        const inv2 = getInvalidStageReply(stage, replyLang);
        beginAssistantUiStreamHoldFromTexts(inv2);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: inv2 },
        ]);
        return;
      }

      setDraft(workingDraft);
      syncDraftToParent(workingDraft);

      if (isInvalidAreaInput) {
        await showBotTypingDelay();
        const abInvalidArea = newAssistantBatchId();
        const invalidAreaBody = pickMsg(
          'Invalid area. City is correct, but area was not found in valid data. Please select a valid area.',
          'Invalid area. City theek hai, lekin area valid data me nahi mila. Please valid area select karein.',
          'غلط علاقہ۔ شہر درست ہے مگر علاقہ ڈیٹا میں نہیں۔ درست علاقہ منتخب کریں۔',
        );
        const addrPrompt = getPromptForStage('address', replyLang);
        beginAssistantUiStreamHoldFromTexts(invalidAreaBody, addrPrompt);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            assistantBatchId: abInvalidArea,
            text: invalidAreaBody,
          },
          { role: 'assistant', text: addrPrompt, assistantBatchId: abInvalidArea },
        ]);
        return;
      }

      if (isInvalidLocationInput) {
        await showBotTypingDelay();
        const abInvalidLoc = newAssistantBatchId();
        const invalidLocBody = pickMsg(
          'Invalid location. Please enter a valid location from available city/area data.',
          'Invalid location. Please available city/area data se valid location likhein.',
          'غلط مقام۔ دستیاب شہر/علاقے کے مطابق درست مقام لکھیں۔',
        );
        const addrPrompt2 = getPromptForStage('address', replyLang);
        beginAssistantUiStreamHoldFromTexts(invalidLocBody, addrPrompt2);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            assistantBatchId: abInvalidLoc,
            text: invalidLocBody,
          },
          { role: 'assistant', text: addrPrompt2, assistantBatchId: abInvalidLoc },
        ]);
        return;
      }
      if (returnToPublishOnSend) {
        onReturnToPublishAfterSend?.();
        return;
      }

      const nextStage = getCurrentStage(workingDraft);
      const ackText = summarizeCapturedFacts(draft, workingDraft, userText, replyLang);
      await showBotTypingDelay();
      const assistantReplyBatchMain = newAssistantBatchId();
      if (nextStage === 'images') {
        beginAssistantUiStreamHoldFromTexts(
          ackText,
          buildListingSummaryText(workingDraft, replyLang),
          getPromptForStage('images', replyLang),
        );
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatchMain }] : []),
          { role: 'assistant', text: buildListingSummaryText(workingDraft, replyLang), assistantBatchId: assistantReplyBatchMain },
          { role: 'assistant', text: getPromptForStage('images', replyLang), assistantBatchId: assistantReplyBatchMain },
        ]);
      } else if (nextStage === 'complete') {
        const completeTextMain = pickMsg(
          'Great! Basic listing details are complete. You can now ask for title, description, pricing, or listing strategy.',
          'Great! Basic listing details complete ho gayi hain. Ab title, description, pricing ya strategy par seedha mashwara le sakte hain.',
          'بہترین! بنیادی تفصیلات مکمل۔ اب عنوان، تفصیل، قیمت یا حکمت عملی پوچھ سکتے ہیں۔',
        );
        beginAssistantUiStreamHoldFromTexts(ackText, completeTextMain);
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatchMain }] : []),
          {
            role: 'assistant',
            assistantBatchId: assistantReplyBatchMain,
            text: completeTextMain,
          },
        ]);
      } else {
        beginAssistantUiStreamHoldFromTexts(ackText, getPromptForStage(nextStage, replyLang));
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText, assistantBatchId: assistantReplyBatchMain }] : []),
          { role: 'assistant', text: getPromptForStage(nextStage, replyLang), assistantBatchId: assistantReplyBatchMain },
        ]);
      }
      return;
    }

    if (returnToPublishOnSend) {
      setDraft(workingDraft);
      syncDraftToParent(workingDraft);
      onReturnToPublishAfterSend?.();
      return;
    }

    setIsReplyLoading(true);
    const replyStartTime = Date.now();
    try {
      const historyForAi = editMessageIndex !== null ? buildMessagesAfterEdit(messages) : [...messages, userMessage];
      const reply = await withTimeout(requestAiDiscussionReply(userText, historyForAi, replyLang), 25000);
      const elapsed = Date.now() - replyStartTime;
      if (elapsed < BOT_TYPING_DELAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, BOT_TYPING_DELAY_MS - elapsed));
      }
      const discussionReply = reply || getFallbackReply(userText, replyLang);
      beginAssistantUiStreamHoldFromTexts(discussionReply);
      setMessages((prev) => [...prev, { role: 'assistant', text: discussionReply }]);
    } catch {
      const elapsed = Date.now() - replyStartTime;
      if (elapsed < BOT_TYPING_DELAY_MS) {
        await new Promise((resolve) => setTimeout(resolve, BOT_TYPING_DELAY_MS - elapsed));
      }
      const fb = getFallbackReply(userText, replyLang);
      beginAssistantUiStreamHoldFromTexts(fb);
      setMessages((prev) => [...prev, { role: 'assistant', text: fb }]);
    } finally {
      setIsReplyLoading(false);
    }
  };

  const handleAddressCitySelect = (cityName) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    const pickedCity = String(cityName || '').trim();
    if (!pickedCity) return;
    setSelectedCityForAddress(pickedCity);
    setInputText('');
    loadAreasForCity(pickedCity);
  };

  const handleAddressAreaSelect = (areaName) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    const pickedArea = String(areaName || '').trim();
    if (!pickedArea || !selectedCityForAddress) return;
    const composedAddress = `${pickedArea}, ${selectedCityForAddress}`;
    setAddressDropdownOpen(false);
    setSelectedCityForAddress('');
    setCityAreas([]);
    setAreasLoadError('');
    handleSend(composedAddress);
  };

  const handleEditPreviousUserMessage = (messageText, messageIndex) => {
    const value = String(messageText || '');
    if (!value) return;
    setEditingMessageIndex(messageIndex);
    setEditingMessageText(value);
  };

  const handleCancelMessageEdit = () => {
    setEditingMessageIndex(null);
    setEditingMessageText('');
  };

  const handleSubmitMessageEdit = async () => {
    const edited = String(editingMessageText || '').trim();
    if (!edited || isReplyLoading || editingMessageIndex === null) return;
    const targetIndex = editingMessageIndex;
    handleCancelMessageEdit();
    await handleSend(edited, { editMessageIndex: targetIndex });
  };

  const handleUploadImagesClick = () => {
    if (imageInputRef.current) imageInputRef.current.click();
  };

  const processSelectedImages = (files) => {
    if (!files.length) return;

    onUploadImages(files);
    const totalImages = (selectedUploadedImages?.length || 0) + files.length;
    const hasMinimumImages = totalImages >= MIN_REQUIRED_IMAGES;

    const nextDraft = {
      ...draft,
      images: hasMinimumImages ? `uploaded:${totalImages}` : '',
    };
    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const lang = responseStyle || 'english';
    const imgPick = (en, ro, ar) => (lang === 'urdu' ? ar : lang === 'romanUrdu' ? ro : en);
    const fileLabel = files.length === 1 ? '1 image' : `${files.length} images`;
    const uploadedMessage = imgPick(
      `Uploaded ${fileLabel} successfully.`,
      `${fileLabel} upload ho gaye hain.`,
      `${fileLabel} اپلوڈ ہو گئیں۔`,
    );
    const followup = hasMinimumImages
      ? (
        getCurrentStage(nextDraft) === 'complete'
          ? imgPick(
            'Great! Basic listing details are complete. You can now ask for title, description, pricing, or listing strategy.',
            'Great! Basic listing details complete ho gayi hain. Ab title, description, pricing ya strategy par mashwara le sakte hain.',
            'بہترین! بنیادی تفصیلات مکمل۔ اب عنوان، تفصیل، قیمت یا حکمت عملی پوچھ سکتے ہیں۔',
          )
          : getPromptForStage(getCurrentStage(nextDraft), lang)
      )
      : imgPick(
        `Invalid. Please upload at least ${MIN_REQUIRED_IMAGES} photos. ${totalImages} uploaded so far.`,
        `Invalid. Kam az kam ${MIN_REQUIRED_IMAGES} photos chahiye. Abhi ${totalImages} upload ${totalImages === 1 ? 'hui' : 'huin'}.`,
        `غلط۔ کم از کم ${MIN_REQUIRED_IMAGES} تصاویر درکار۔ ابھی ${totalImages} اپلوڈ۔`,
      );

    imageFlowSnapshotRef.current = messages;
    beginAssistantUiStreamHoldFromTexts(followup);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: uploadedMessage },
      { role: 'assistant', text: followup },
    ]);
    setIsImageOnlyView(hasMinimumImages);

    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImagesSelected = (event) => {
    const files = Array.from(event.target.files || []);
    processSelectedImages(files);
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsImageDragActive(false);
    const files = Array.from(event.dataTransfer?.files || []);
    processSelectedImages(files);
  };

  const handleImageOnlyContinue = () => {
    const totalImages = selectedUploadedImages?.length || 0;
    const hasMinimumImages = totalImages >= MIN_REQUIRED_IMAGES
      || (() => {
        const match = String(draft?.images || '').match(/uploaded:(\d+)/i);
        return Number(match?.[1] || 0) >= MIN_REQUIRED_IMAGES;
      })();
    if (!hasMinimumImages) {
      const lang = responseStyle || 'english';
      const minImgErr = lang === 'urdu'
        ? `غلط۔ کم از کم ${MIN_REQUIRED_IMAGES} تصاویر اپلوڈ کریں۔`
        : lang === 'romanUrdu'
          ? `Invalid. Kam az kam ${MIN_REQUIRED_IMAGES} photos upload karein.`
          : `Invalid. Please upload at least ${MIN_REQUIRED_IMAGES} photos.`;
      beginAssistantUiStreamHoldFromTexts(minImgErr);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: minImgErr },
      ]);
      return;
    }

    if (typeof onContinueAfterImages === 'function') {
      onContinueAfterImages();
      return;
    }
    setIsImageOnlyView(false);
  };

  const handleImageOnlyBack = () => {
    setIsImageOnlyView(false);
    setIsImageDragActive(false);
    setDraft((prev) => ({ ...prev, images: '' }));
    if (typeof onResetImages === 'function') onResetImages();
    if (Array.isArray(imageFlowSnapshotRef.current) && imageFlowSnapshotRef.current.length) {
      setMessages(imageFlowSnapshotRef.current);
    }
  };

  const handlePurposeQuickSelect = (purposeValue) => {
    if (isReplyLoading || assistantUiStreamHold) return;
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
    const lang = responseStyle || 'english';
    const qPick = (en, ro, ar) => (lang === 'urdu' ? ar : lang === 'romanUrdu' ? ro : en);
    const followup = nextStage === 'complete'
      ? qPick(
        'Great! Basic listing details are complete. You can ask the next question about title, description, or pricing.',
        'Great! Basic listing details complete ho gayi hain. Ab title, description ya pricing par agla sawal pooch sakte hain.',
        'بہترین! بنیادی تفصیلات مکمل۔ اب عنوان، تفصیل یا قیمت کے بارے میں پوچھ سکتے ہیں۔',
      )
      : qPick(
        `Great, you selected ${purposeText}. ${getPromptForStage(nextStage, lang)}`,
        `Acha, aap ne ${purposeText} choose kiya. ${getPromptForStage(nextStage, lang)}`,
        `اچھا، آپ نے ${purposeText} منتخب کیا۔ ${getPromptForStage(nextStage, lang)}`,
      );

    beginAssistantUiStreamHoldFromTexts(followup);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: followup }]);
  };

  const handleUseProfileQuickSelect = (value) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'useProfileContact') return;
    const textValue = value === 'yes' ? 'Yes' : 'No';

    const userMessage = { role: 'user', text: textValue };
    const { ok, nextDraft } = applyAnswerToDraft('useProfileContact', textValue, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);

    const nextStage = getCurrentStage(nextDraft);
    const useProfPrompt = getPromptForStage(nextStage, responseStyle || 'english');
    beginAssistantUiStreamHoldFromTexts(useProfPrompt);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: useProfPrompt }]);
  };

  const handlePropertyTypeQuickSelect = (value) => {
    if (isReplyLoading || assistantUiStreamHold) return;
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
    const ptPrompt = getPromptForStage(nextStage, responseStyle || 'english');
    beginAssistantUiStreamHoldFromTexts(ptPrompt);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: ptPrompt }]);
  };

  const handleSubTypeQuickSelect = (value) => {
    if (isReplyLoading || assistantUiStreamHold) return;
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
    const stPrompt = getPromptForStage(nextStage, responseStyle || 'english');
    beginAssistantUiStreamHoldFromTexts(stPrompt);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: stPrompt }]);
  };

  const handleBedroomQuickSelect = (value, index) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'bedrooms') return;

    const selectedValue = index === 5 ? '6' : String(value || '').trim();
    if (!selectedValue) return;
    const userMessage = { role: 'user', text: selectedValue };
    const { ok, nextDraft } = applyAnswerToDraft('bedrooms', selectedValue, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);
    const nextStage = getCurrentStage(nextDraft);
    const bedPrompt = getPromptForStage(nextStage, responseStyle || 'english');
    beginAssistantUiStreamHoldFromTexts(bedPrompt);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: bedPrompt }]);
  };

  const handleBathroomQuickSelect = (value, index) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    const stage = getCurrentStage(draft);
    if (stage !== 'bathrooms') return;

    const selectedValue = index === 5 ? '6' : String(value || '').trim();
    if (!selectedValue) return;
    const userMessage = { role: 'user', text: selectedValue };
    const { ok, nextDraft } = applyAnswerToDraft('bathrooms', selectedValue, draft);
    if (!ok) return;

    setDraft(nextDraft);
    syncDraftToParent(nextDraft);
    const nextStage = getCurrentStage(nextDraft);
    const bathPrompt = getPromptForStage(nextStage, responseStyle || 'english');
    beginAssistantUiStreamHoldFromTexts(bathPrompt);
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: bathPrompt }]);
  };

  const activeStage = getCurrentStage(draft);

  const commitFeaturesFromModal = (summaryText) => {
    if (isReplyLoading || assistantUiStreamHold) return;
    setDraft((currentDraft) => {
      const stage = getCurrentStage(currentDraft);
      if (stage !== 'features') return currentDraft;
      const raw = String(summaryText || '').trim();
      const userMessage = { role: 'user', text: raw || '(none selected)' };
      const { ok, nextDraft } = applyAnswerToDraft('features', raw || '', currentDraft);
      if (!ok) return currentDraft;
      syncDraftToParent(nextDraft);
      const nextStage = getCurrentStage(nextDraft);
      const featPrompt = getPromptForStage(nextStage, responseStyle || 'english');
      beginAssistantUiStreamHoldFromTexts(featPrompt);
      setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: featPrompt }]);
      return nextDraft;
    });
  };

  const showFlowStepChrome = !assistantUiStreamHold;
  const isFeaturesStageOpenUi = activeStage === 'features' && showFlowStepChrome;
  const amenitiesUiLang = responseStyle || 'english';
  const isRomanAmenitiesUi = amenitiesUiLang === 'romanUrdu';
  const isUrduScriptAmenitiesUi = amenitiesUiLang === 'urdu';

  useEffect(() => {
    if (activeStage !== 'features') setFeaturesAmenitiesModalOpen(false);
  }, [activeStage]);

  useEffect(() => {
    if (!featuresAmenitiesModalOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setFeaturesAmenitiesModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [featuresAmenitiesModalOpen]);

  useEffect(() => {
    const group = String(draft.propertyType || '').trim();
    const sub = String(draft.subType || '').trim();
    if (!sub || !group) {
      setChatAmenityCatalog([]);
      return undefined;
    }
    const token = (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(getStoredAuthUser()) || '').trim();
    if (!token) {
      setChatAmenityCatalog([]);
      return undefined;
    }
    const meta = resolveSubCategoryMetaForAmenities({ propertyGroup: group, subTypeName: sub });
    let cancelled = false;
    setChatAmenitiesLoading(true);
    fetchAmenitiesByFallbackIds([meta.subCategoryId, meta.categoryId, 1], token)
      .then((names) => {
        if (!cancelled) setChatAmenityCatalog(Array.isArray(names) ? names : []);
      })
      .catch(() => {
        if (!cancelled) setChatAmenityCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setChatAmenitiesLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only on category/sub-type change
  }, [draft.propertyType, draft.subType]);

  const addressSearch = String(inputText || '').trim().toLowerCase();
  const filteredCities = allCityNames
    .filter((name) => name.toLowerCase().includes(addressSearch))
    .slice(0, 24);
  const filteredAreas = cityAreas
    .filter((name) => name.toLowerCase().includes(addressSearch))
    .slice(0, 30);

  useEffect(() => {
    if (activeStage === 'address') return;
    setAddressDropdownOpen(false);
    setSelectedCityForAddress('');
    setCityAreas([]);
    setAreasLoadError('');
  }, [activeStage]);

  if (isImageOnlyView) {
    return (
      <PropertyLayout
        stepText=""
        progressPercent={0}
        showProgress={false}
        onBack={handleImageOnlyBack}
        pageClassName="picturePage"
        contentClassName="pictureContent"
      >
        <div className="picturePanel">
          <input
            ref={imageInputRef}
            type="file"
            className="hiddenUploadInput"
            accept=".png,.jpg,.jpeg,.gif"
            multiple
            onChange={handleImagesSelected}
          />
          <button className="uploadArea pictureUploadArea" onClick={handleUploadImagesClick}>
            <span className="uploadIconWrap"><LuUpload /></span>
            <span className="uploadText">Click to upload or drag and drop</span>
            <span className="uploadHint">PNG, JPG, GIF up to 10MB</span>
          </button>
          {!!selectedUploadedImages?.length && (
            <div className="imageGrid">
              {selectedUploadedImages.map((item, index) => (
                <div key={`${item}-${index}`} className="imageCard">
                  <img src={item} alt={`Uploaded ${index + 1}`} className="imageThumb" />
                  {index === 0 && <span className="mainBadge">Main</span>}
                </div>
              ))}
              <button className="imageCard addImageCard" onClick={handleUploadImagesClick}>
                <LuPlus />
                <span>Add more</span>
              </button>
            </div>
          )}
          <button className="continueBtn" onClick={handleImageOnlyContinue}>Continue & Preview</button>
        </div>
      </PropertyLayout>
    );
  }

  return (
    <>
      <PropertyLayout
        stepText=""
        progressPercent={0}
        showProgress={false}
        pageClassName="aiChatbotPage"
        contentClassName="aiChatbotContent"
      >
      <div className="aiChatbotShell">
        {returnToPublishOnSend && (
          <div className="aiPublishEditBadge">
            Editing from Publish - Send to return
          </div>
        )}
        <div className="chatBlock aiChatbotBlock aiChatbotMessages">
          {messages.map((message, index) =>
            message.role === 'assistant' ? (
              <AiAssistantBubbleRow
                key={`a-${index}`}
                text={message.text}
                startDelayMs={
                  message.revealAssistantImmediately
                    ? 0
                    : getAssistantBatchStartDelay(messages, index)
                }
                revealImmediately={Boolean(message.revealAssistantImmediately)}
                bubbleClassName="questionBubble"
                scrollEndRef={messagesEndRef}
              />
            ) : (
              <UserMessage
                key={`u-${index}`}
                onEditStart={() => handleEditPreviousUserMessage(message.text, index)}
                isEditing={editingMessageIndex === index}
                editValue={editingMessageText}
                onEditValueChange={setEditingMessageText}
                onEditCancel={handleCancelMessageEdit}
                onEditSubmit={handleSubmitMessageEdit}
                isSendDisabled={isReplyLoading || assistantUiStreamHold || !String(editingMessageText || '').trim()}
              >
                {message.text}
              </UserMessage>
            )
          )}
          {isReplyLoading && (
            <BotMessage bubbleClassName="questionBubble">
              <span className="aiTypingDots" aria-label="AI is typing">
                <span className="aiTypingDot" />
                <span className="aiTypingDot" />
                <span className="aiTypingDot" />
              </span>
            </BotMessage>
          )}
        {activeStage === 'purpose' && showFlowStepChrome && (
          <div className="aiPurposeInlineOptions">
            {CHATBOT_PURPOSE_OPTIONS.map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handlePurposeQuickSelect(item)}
                disabled={isReplyLoading || assistantUiStreamHold}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'propertyType' && showFlowStepChrome && (
          <div className="aiPurposeInlineOptions">
            {getAllowedPropertyTypesForPurpose(draft?.purpose).map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handlePropertyTypeQuickSelect(item)}
                disabled={isReplyLoading || assistantUiStreamHold}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'subType' && showFlowStepChrome && (
          <div className="aiPurposeInlineOptions">
            {(CHATBOT_SUB_TYPE_OPTIONS[getPropertyGroup(draft?.propertyType)] || []).map((item) => (
              <button
                key={item}
                className="purposeChip aiQuickPurposeBtn"
                onClick={() => handleSubTypeQuickSelect(item)}
                disabled={isReplyLoading || assistantUiStreamHold}
              >
                {item}
              </button>
            ))}
          </div>
        )}
        {activeStage === 'bedrooms' && showFlowStepChrome && (
          <OptionTabs
            options={BEDROOM_OPTIONS}
            containerClassName="bedroomOptions"
            buttonClassName="bedroomChip"
            onOptionClick={(item, index) => handleBedroomQuickSelect(item, index)}
          />
        )}
        {activeStage === 'bathrooms' && showFlowStepChrome && (
          <OptionTabs
            options={BATHROOM_OPTIONS}
            containerClassName="bedroomOptions"
            buttonClassName="bedroomChip"
            onOptionClick={(item, index) => handleBathroomQuickSelect(item, index)}
          />
        )}
        {activeStage === 'useProfileContact' && hasProfileContact && showFlowStepChrome && (
          <div className="aiPurposeInlineOptions">
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={() => handleUseProfileQuickSelect('yes')}
              disabled={isReplyLoading || assistantUiStreamHold}
            >
              Yes
            </button>
            <button
              type="button"
              className="purposeChip aiQuickPurposeBtn"
              onClick={() => handleUseProfileQuickSelect('no')}
              disabled={isReplyLoading || assistantUiStreamHold}
            >
              No
            </button>
          </div>
        )}
        {activeStage === 'images' && showFlowStepChrome && (
          <div className="aiImageUploadPanel">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hiddenUploadInput"
              onChange={handleImagesSelected}
            />
            <div
              className={`aiImageDropZone ${isImageDragActive ? 'aiImageDropZoneActive' : ''}`}
              onClick={handleUploadImagesClick}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isImageDragActive) setIsImageDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsImageDragActive(false);
              }}
              onDrop={handleImageDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleUploadImagesClick();
                }
              }}
            >
              <span className="uploadIconWrap"><LuUpload /></span>
              <span className="uploadText">Click to upload or drag and drop</span>
              <span className="uploadHint">PNG, JPG, GIF up to 10MB</span>
            </div>
          </div>
        )}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="aiChatbotComposerBar">
          <div className={`aiChatbotInputRow ${isFeaturesStageOpenUi ? 'aiChatbotInputRowAmenitiesInbox' : ''}`.trim()}>
            <input
              ref={composerInputRef}
              className="addressInput aiChatbotTextInput"
              placeholder={
                activeStage === 'address'
                  ? 'Select your city or area...'
                  : (isFeaturesStageOpenUi
                    ? (isUrduScriptAmenitiesUi
                      ? 'فارم کھولنے کے لیے کلک کریں'
                      : isRomanAmenitiesUi
                        ? 'Form kholnay ke liye click karein'
                        : 'Click to open form')
                    : 'Type your message here...')
              }
              readOnly={isFeaturesStageOpenUi}
              value={inputText}
              onChange={(event) => {
                setInputText(event.target.value);
                if (activeStage === 'address') {
                  setAddressDropdownOpen(true);
                }
              }}
              onClick={() => {
                if (isFeaturesStageOpenUi && !isReplyLoading) setFeaturesAmenitiesModalOpen(true);
              }}
              onFocus={() => {
                if (activeStage === 'address') {
                  setAddressDropdownOpen(true);
                }
              }}
              onBlur={() => {
                if (activeStage !== 'address') return;
                setTimeout(() => setAddressDropdownOpen(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (assistantUiStreamHold) return;
                  if (isFeaturesStageOpenUi) {
                    if (!isReplyLoading) setFeaturesAmenitiesModalOpen(true);
                    return;
                  }
                  handleSend();
                }
              }}
              disabled={isReplyLoading || assistantUiStreamHold}
            />
            <button className="sendBtn aiChatbotSendBtn" onClick={() => handleSend()} disabled={isReplyLoading || assistantUiStreamHold || !inputText.trim()}>
              <LuSend />
            </button>
          </div>
          {activeStage === 'address' && addressDropdownOpen && showFlowStepChrome && (
            <div className="addressDropdownPanel">
              {!selectedCityForAddress && (
                <>
                  <div className="addressDropdownTitle">Select City</div>
                  {filteredCities.map((cityName) => (
                    <button
                      key={cityName}
                      type="button"
                      className="addressDropdownItem"
                      disabled={isReplyLoading || assistantUiStreamHold}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleAddressCitySelect(cityName)}
                    >
                      {cityName}
                    </button>
                  ))}
                  {!filteredCities.length && (
                    <button type="button" className="addressDropdownItem addressDropdownEmptyItem" disabled>
                      No matching city found
                    </button>
                  )}
                </>
              )}

              {selectedCityForAddress && (
                <>
                  <div className="addressDropdownTitle">Select Area</div>
                  <button
                    type="button"
                    className="addressDropdownItem addressDropdownBackItem"
                    disabled={isReplyLoading || assistantUiStreamHold}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSelectedCityForAddress('');
                      setCityAreas([]);
                      setAreasLoadError('');
                      setInputText('');
                    }}
                  >
                    Change City
                  </button>
                  <button type="button" className="addressDropdownItem addressDropdownPinnedItem" disabled>
                    {selectedCityForAddress}
                  </button>
                  {isAreasLoading && (
                    <button type="button" className="addressDropdownItem addressDropdownEmptyItem" disabled>
                      Loading areas...
                    </button>
                  )}
                  {!isAreasLoading && filteredAreas.map((areaName) => (
                    <button
                      key={areaName}
                      type="button"
                      className="addressDropdownItem"
                      disabled={isReplyLoading || assistantUiStreamHold}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleAddressAreaSelect(areaName)}
                    >
                      {areaName}
                    </button>
                  ))}
                  {!isAreasLoading && !filteredAreas.length && (
                    <button type="button" className="addressDropdownItem addressDropdownEmptyItem" disabled>
                      {areasLoadError || 'No matching area found'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </PropertyLayout>
      {featuresAmenitiesModalOpen && isFeaturesStageOpenUi && createPortal(
        <div className="ppAmenitiesOverlay" role="dialog" aria-modal="true" aria-label="Features and Amenities">
          <div
            className="ppAmenitiesOverlayBackdrop"
            onClick={() => setFeaturesAmenitiesModalOpen(false)}
            role="presentation"
          />
          <div className="ppAmenitiesOverlaySheet">
            <FeaturesAmenitiesPanel
              apiAmenityNames={chatAmenityCatalog}
              amenitiesLoading={chatAmenitiesLoading}
              onCancel={() => setFeaturesAmenitiesModalOpen(false)}
              onSubmit={(summary) => {
                setFeaturesAmenitiesModalOpen(false);
                commitFeaturesFromModal(summary);
              }}
              subtitle={
                isUrduScriptAmenitiesUi
                  ? AMENITIES_MODAL_SUBTITLE_AR
                  : isRomanAmenitiesUi
                    ? DEFAULT_SUBTITLE_UR
                    : DEFAULT_SUBTITLE_EN
              }
              labels={
                isUrduScriptAmenitiesUi
                  ? {
                    cancel: 'منسوخ',
                    add: 'سہولیات شامل کریں',
                    loading: 'لوڈ ہو رہا ہے...',
                    closeAria: 'بند کریں',
                  }
                  : isRomanAmenitiesUi
                    ? {
                      cancel: 'Cancel',
                      add: 'Amenities shamil karein',
                      loading: 'Amenities load ho rahi hain...',
                      closeAria: 'Band karein',
                    }
                    : undefined
              }
            />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function PublishPage({
  title,
  description,
  propertyGroup,
  purpose,
  propertyType,
  address,
  price,
  size,
  sizeUnit,
  bedrooms,
  bathrooms,
  contactNumber,
  email,
  features,
  images,
  onPublish,
  onEditNavigate,
  publishLoading,
  publishMessage,
}) {
  const heroImage = images?.[0] || '';
  const formattedSize = size ? `${size} ${sizeUnit || ''}`.trim() : '850 sq ft';

  const normalizedGroup = String(propertyGroup || '').toLowerCase();
  const normalizedType = String(propertyType || '').toLowerCase();
  const hideAmenityMeta = normalizedGroup.includes('plot')
    || normalizedGroup.includes('commercial')
    || normalizedType.includes('plot')
    || normalizedType.includes('commercial');
  const featureItems = Array.isArray(features)
    ? features.map((item) => String(item || '').trim()).filter(Boolean)
    : String(features || '').split(',').map((item) => item.trim()).filter(Boolean);
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
              <h2 className="publishDescriptionHeading">Description</h2>
              <p className="publishDescription">{description || 'A professional property description will appear here after generation.'}</p>
            </div>
          </div>
          <div
            className="publishMeta"
            style={{ gridTemplateColumns: hideAmenityMeta ? 'repeat(1, 1fr)' : 'repeat(3, 1fr)' }}
          >
            <div className="publishMetaItem">
              <span><LuRuler /></span>
              <div className="publishMetaText">
                <strong>Size</strong>
                <em>{formattedSize}</em>
              </div>
            </div>
            {!hideAmenityMeta && (
              <div className="publishMetaItem">
                <span><LuBedDouble /></span>
                <div className="publishMetaText">
                  <strong>Bedrooms</strong>
                  <em>{bedrooms || '5'}</em>
                </div>
              </div>
            )}
            {!hideAmenityMeta && (
              <div className="publishMetaItem">
                <span><LuBath /></span>
                <div className="publishMetaText">
                  <strong>Bathrooms</strong>
                  <em>{bathrooms || '4'}</em>
                </div>
              </div>
            )}
          </div>
          <h4 className="publishContactHeading">Contact Details</h4>
          <div className="publishContactMeta">
            <div className="publishMetaItem">
              <span><LuPhone /></span>
              <div className="publishMetaText">
                <em>{contactNumber || 'Not provided'}</em>
              </div>
            </div>
            <div className="publishMetaItem">
              <span><LuMail /></span>
              <div className="publishMetaText">
                <em>{email || 'Not provided'}</em>
              </div>
            </div>
          </div>
          <h4>Amenities</h4>
          <div className="publishFeatures">
            {featureItems.length ? featureItems.map((item) => (
              <span key={item}><span className="publishFeatureIcon"><LuCheck /></span> {item}</span>
            )) : (
              <span><span className="publishFeatureIcon"><LuCheck /></span> No amenities available</span>
            )}
          </div>
          <div className="publishActions">
            <button className="publishBtn" onClick={onPublish} disabled={publishLoading}>
              <LuSparkles />
              {publishLoading ? (
                <>
                  <span>Publishing</span>
                  <span className="publishLoadingDots" aria-hidden="true">
                    <span></span><span></span><span></span>
                  </span>
                </>
              ) : (
                <span>Publish Listing</span>
              )}
            </button>
            <button className="saveBtn" type="button" onClick={onEditNavigate}>
              Edit Listing
            </button>
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
  const [, setResolvedAmenityFeatures] = useState([]);
  const [manualAmenityCatalog, setManualAmenityCatalog] = useState([]);
  const [manualAmenitiesLoading, setManualAmenitiesLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('listingMode');
  const [chatbotSession, setChatbotSession] = useState({ messages: [], draft: null, responseStyle: '' });
  const [isPublishEditMode, setIsPublishEditMode] = useState(false);
  const authUserForWelcome = getStoredAuthUser();
  const welcomeName = getDisplayNameFromUser(authUserForWelcome);
  const profileContactNumber = getContactFromUser(authUserForWelcome);
  const profileEmail = getEmailFromUser(authUserForWelcome);

  useEffect(() => {
    const syncPendingWhenOnline = async () => {
      if (!navigator.onLine) return;
      const authToken = (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(authUserForWelcome) || '').trim();
      if (!authToken) return;
      const configuredApiEndpoint = (process.env.REACT_APP_PROPERTY_API_URL || '').trim();
      const absoluteApiEndpoint =
        `${normalizeApiBase(process.env.REACT_APP_API_BASE_URL || 'https://admin.pakistanproperty.com')}/api/agent/properties`;
      const primaryApiEndpoint = configuredApiEndpoint || absoluteApiEndpoint;
      const fallbackProxyEndpoint = '/api/agent/properties';
      const useProxyFallback =
        process.env.NODE_ENV === 'development'
        && String(process.env.REACT_APP_USE_PROXY_FALLBACK || 'true').toLowerCase() !== 'false';
      const endpoints = useProxyFallback ? [primaryApiEndpoint, fallbackProxyEndpoint] : [primaryApiEndpoint];
      await flushOfflinePublishQueue({ apiEndpoints: endpoints, authToken });
    };

    syncPendingWhenOnline();
    window.addEventListener('online', syncPendingWhenOnline);
    return () => window.removeEventListener('online', syncPendingWhenOnline);
  }, [authUserForWelcome]);

  useEffect(() => {
    if (!selectedPropertyType || !selectedPropertyGroup) {
      setManualAmenityCatalog([]);
      return undefined;
    }
    const token = (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(authUserForWelcome) || '').trim();
    if (!token) {
      setManualAmenityCatalog([]);
      return undefined;
    }
    const meta = resolveSubCategoryMetaForAmenities({
      propertyGroup: selectedPropertyGroup,
      subTypeName: selectedPropertyType,
    });
    let cancelled = false;
    setManualAmenitiesLoading(true);
    fetchAmenitiesByFallbackIds([meta.subCategoryId, meta.categoryId, 1], token)
      .then((names) => {
        if (!cancelled) setManualAmenityCatalog(Array.isArray(names) ? names : []);
      })
      .catch(() => {
        if (!cancelled) setManualAmenityCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setManualAmenitiesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPropertyType, selectedPropertyGroup, authUserForWelcome]);

  const buildChatbotDraftFromCurrentState = () => ({
    purpose: selectedPurpose || '',
    propertyType: selectedPropertyGroup || selectedPropertyType || '',
    subType: selectedPropertyType || '',
    address: selectedAddress || '',
    price: selectedPrice || '',
    size: selectedSize || '',
    sizeUnit: selectedSizeUnit || 'Marla',
    bedrooms: selectedBedrooms || '',
    bathrooms: selectedBathrooms || '',
    features: selectedFeature || '',
    useProfileContact: (selectedContactNumber || profileContactNumber || selectedEmail || profileEmail) ? 'yes' : '',
    images: (uploadedImages?.length || 0) ? `uploaded:${uploadedImages.length}` : '',
    contactNumber: selectedContactNumber || profileContactNumber || '',
    email: selectedEmail || profileEmail || '',
  });

  const buildChatbotMessagesFromCurrentState = () => {
    const bits = [];
    if (selectedPurpose) bits.push(`Purpose: ${selectedPurpose}`);
    if (selectedPropertyType || selectedPropertyGroup) bits.push(`Type: ${selectedPropertyType || selectedPropertyGroup}`);
    if (selectedAddress) bits.push(`Location: ${getDisplayLocationFromAddress(selectedAddress) || selectedAddress}`);
    if (selectedSize) bits.push(`Size: ${`${selectedSize} ${selectedSizeUnit || ''}`.trim()}`);
    if (selectedPrice) bits.push(`Price: ${selectedPrice}`);
    if (selectedBedrooms) bits.push(`Bedrooms: ${selectedBedrooms}`);
    if (selectedBathrooms) bits.push(`Bathrooms: ${selectedBathrooms}`);
    if (selectedContactNumber || profileContactNumber) bits.push(`Contact: ${selectedContactNumber || profileContactNumber}`);
    if (selectedEmail || profileEmail) bits.push(`Email: ${selectedEmail || profileEmail}`);

    const summaryText = bits.length
      ? `Main ne aapki existing listing details load kar di hain:\n${bits.join('\n')}`
      : 'Main ne aapki listing edit mode me load kar di hai.';

    return [
      {
        role: 'assistant',
        text: '👋 Edit mode ready. Aap jo field change karna chahen seedha command dein.',
      },
      {
        role: 'assistant',
        text: summaryText,
      },
      {
        role: 'assistant',
        text: 'Ab batayein kya edit karna hai? (price, location, size, category, details...)',
      },
    ];
  };

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
    const rawContactNumber = selectedContactNumber || getContactFromUser(authUser) || '3331234567';
    const contactNumber = toApiPakistanPhone(rawContactNumber) || '+923331234567';
    const userEmail = selectedEmail || getEmailFromUser(authUser) || 'dummy@property.com';

    const effectiveAddress = String(selectedAddress || '').trim() || 'Pakistan';
    const cleanedLocation = getDisplayLocationFromAddress(effectiveAddress) || effectiveAddress;
    const parsedAddressRaw = parseAddressParts(effectiveAddress, citiesList);
    const parsedAddress = parseAddressParts(cleanedLocation, citiesList);
    const finalCityName = parsedAddress.cityName || parsedAddressRaw.cityName || '';
    const finalCityCode = parsedAddress.cityCode || parsedAddressRaw.cityCode || 'LHR';
    const fallbackAreaFromComma = String(effectiveAddress || '')
      .split(',')
      .slice(0, -1)
      .join(',')
      .replace(/\s+/g, ' ')
      .trim();
    const fallbackAreaFromCleanedLocation = finalCityName
      ? String(cleanedLocation || '')
        .replace(new RegExp(`\\b${String(finalCityName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'ig'), ' ')
        .replace(/\s*,\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      : '';
    const finalAreaName = (
      parsedAddress.areaName
      || parsedAddressRaw.areaName
      || fallbackAreaFromCleanedLocation
      || fallbackAreaFromComma
    )
      .replace(/\s+/g, ' ')
      .trim();
    const finalAddress = finalCityName && finalAreaName
      ? `${finalAreaName}, ${finalCityName}`.replace(/\s+/g, ' ').trim()
      : cleanedLocation;
    const areaMeta = await resolveAreaMetadata(finalCityName, finalAreaName);
    const authTokenForAmenities =
      (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(authUser) || '').trim();

    const effectiveTitle = String(generatedTitle || '').trim() || buildAutoListingTitle({
      size: selectedSize,
      sizeUnit: selectedSizeUnit,
      propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
      purpose: selectedPurpose,
      address: finalAddress,
    });
    let effectiveFeaturesText = String(selectedFeature || '').trim();
    const effectiveDescription = String(generatedDescription || '').trim() || buildAutoListingDescription({
      purpose: selectedPurpose,
      propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
      address: finalAddress,
      size: selectedSize,
      sizeUnit: selectedSizeUnit,
      bedrooms: selectedBedrooms,
      bathrooms: selectedBathrooms,
      features: selectedFeature || effectiveFeaturesText,
      price: selectedPrice,
    });
    const resolvedLocationValue = areaMeta?.id || areaMeta?.externalID || finalAddress || finalAreaName;
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasWord = (text, value) => new RegExp(`\\b${escapeRegex(value)}\\b`, 'i').test(String(text || ''));
    const detectSignalText = normalize(
      `${selectedPropertyGroup || ''} ${selectedPropertyType || ''} ${effectiveTitle || ''} ${generatedTitle || ''} ${effectiveDescription || ''}`
    );

    const selectedGroupText = normalize(selectedPropertyGroup);
    const selectedTypeText = normalize(selectedPropertyType);
    const strongCommercialKeywords = ['commercial', 'shop', 'office', 'warehouse', 'factory', 'building'];
    const strongPlotKeywords = ['plot', 'land', 'agricultural', 'file', 'form'];
    const strongHomeKeywords = ['home', 'house', 'flat', 'portion', 'farm house', 'room', 'penthouse', 'ghar', 'makan'];

    let detectedGroup = 'Home';
    const commercialScore = strongCommercialKeywords.reduce((acc, item) => (hasWord(detectSignalText, item) ? acc + 1 : acc), 0);
    const plotScore = strongPlotKeywords.reduce((acc, item) => (hasWord(detectSignalText, item) ? acc + 1 : acc), 0);
    const homeScore = strongHomeKeywords.reduce((acc, item) => (hasWord(detectSignalText, item) ? acc + 1 : acc), 0);

    if (selectedGroupText.includes('commercial') || CHATBOT_SUB_TYPE_OPTIONS.Commercial.some((item) => normalize(item) === selectedTypeText)) {
      detectedGroup = 'Commercial';
    } else if (selectedGroupText.includes('plot') || CHATBOT_SUB_TYPE_OPTIONS.Plot.some((item) => normalize(item) === selectedTypeText)) {
      detectedGroup = 'Plot';
    } else if (selectedGroupText.includes('home') || selectedGroupText.includes('house')) {
      detectedGroup = 'Home';
    }

    // AI auto-classification from listing text signals (prefer strongest intent).
    if (commercialScore > Math.max(plotScore, homeScore)) detectedGroup = 'Commercial';
    else if (plotScore > Math.max(commercialScore, homeScore)) detectedGroup = 'Plot';
    else if (homeScore > Math.max(commercialScore, plotScore)) detectedGroup = 'Home';

    const selectedSubTypeName = String(selectedPropertyType || '').trim();
    const categoryIdMap = { Home: 1, Plot: 2, Commercial: 3 };
    const categoryId = categoryIdMap[detectedGroup] || 1;
    const subTypeOptionsByGroup = CHATBOT_SUB_TYPE_OPTIONS;
    const groupSubTypes = subTypeOptionsByGroup[detectedGroup] || [];
    const selectedSubTypeMatched = groupSubTypes.find((item) => normalize(item) === normalize(selectedSubTypeName));
    const titleSignalText = normalize(`${detectSignalText} ${buildAutoListingTitle({
      size: selectedSize,
      sizeUnit: selectedSizeUnit,
      propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
      purpose: selectedPurpose,
      address: finalAddress,
    })}`);
    const inferredSubTypeMatched = groupSubTypes.find((item) => titleSignalText.includes(normalize(item)));
    const fallbackSubCategoryName = detectedGroup === 'Commercial'
      ? 'Shop'
      : detectedGroup === 'Plot'
        ? 'Residential Plot'
        : 'House';
    const finalSubCategoryName = selectedSubTypeMatched || inferredSubTypeMatched || fallbackSubCategoryName;
    const finalSubCategorySlug = finalSubCategoryName.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
    const subCategoryId = CHATBOT_SUB_CATEGORY_ID_BY_NAME[finalSubCategoryName]
      || CHATBOT_SUB_CATEGORY_ID_BY_NAME[fallbackSubCategoryName]
      || 1;
    const remoteAmenityFeatures = authTokenForAmenities
      ? await fetchAmenitiesByFallbackIds([subCategoryId, categoryId, 1], authTokenForAmenities)
      : [];
    const userFeatureTokens = parseFeatureTokens(selectedFeature);
    const matchedPayloadFeatures = matchUserFeaturesToApiCatalog(userFeatureTokens, remoteAmenityFeatures);
    const payloadFeatureList = matchedPayloadFeatures.length
      ? matchedPayloadFeatures
      : (!remoteAmenityFeatures.length ? userFeatureTokens : []);
    setResolvedAmenityFeatures(payloadFeatureList);

    const payload = {
      property_type_id: 1,
      property_type_slug: mapPurposeToSlug(selectedPurpose),
      listing_source: 'AI',
      listing_source_name: 'AI',
      listing_source_id: 2,
      listingSource: 'AI',
      source: 'AI',
      source_name: 'AI',
      source_id: 2,
      source_type: 'AI',
      property_source: 'AI',
      property_source_name: 'AI',
      submission_source: 'AI',
      submission_source_name: 'AI',
      listing_origin: 'AI',
      origin: 'AI',
      created_via: 'ai',
      ai_generated: 1,
      is_ai: 1,
      category_id: categoryId,
      sub_category_id: subCategoryId,
      category: detectedGroup || 'Home',
      category_name: detectedGroup || 'Home',
      sub_category: finalSubCategoryName,
      sub_category_name: finalSubCategoryName,
      sub_category_slug: finalSubCategorySlug,
      property_sub_type: finalSubCategoryName,
      property_sub_type_name: finalSubCategoryName,
      property_sub_type_slug: finalSubCategorySlug,
      city_code: finalCityCode,
      plot_number: '123',
      area_size: selectedSize,
      unit_area: selectedSizeUnit,
      price: getNumericPrice(selectedPrice),
      currency: 'PKR',
      title: effectiveTitle,
      description: effectiveDescription,
      property_description: effectiveDescription,
      contacts: [contactNumber],
      ...(userEmail ? { email: userEmail } : {}),
      address: finalAddress,
      location: resolvedLocationValue,
      property_location: resolvedLocationValue,
      location_text: finalAddress || finalAreaName,
      property_location_text: finalAddress || finalAreaName,
      city: finalAddress || finalCityName,
      city_name: finalAddress || finalCityName,
      city_only: finalCityName,
      city_with_area: finalAddress || finalCityName,
      area: finalAreaName,
      area_name: finalAreaName,
      location_name: finalAddress || finalAreaName,
      locality: finalAddress || finalAreaName,
      locality_name: finalAddress || finalAreaName,
      ...(areaMeta?.id ? { location_id: areaMeta.id, area_id: areaMeta.id, locality_id: areaMeta.id } : {}),
      ...(areaMeta?.externalID ? { location_external_id: areaMeta.externalID, area_external_id: areaMeta.externalID } : {}),
      ...(areaMeta?.slug ? { location_slug: areaMeta.slug, area_slug: areaMeta.slug } : {}),
      ...(parsedAddress.latitude !== undefined ? { latitude: parsedAddress.latitude } : {}),
      ...(parsedAddress.longitude !== undefined ? { longitude: parsedAddress.longitude } : {}),
      bedrooms: selectedBedrooms,
      bathrooms: selectedBathrooms,
      features: payloadFeatureList,
    };
    try {
      const configuredApiEndpoint = (process.env.REACT_APP_PROPERTY_API_URL || '').trim();
      const absoluteApiEndpoint =
        `${normalizeApiBase(process.env.REACT_APP_API_BASE_URL || 'https://admin.pakistanproperty.com')}/api/agent/properties`;
      const primaryApiEndpoint = configuredApiEndpoint || absoluteApiEndpoint;
      const fallbackProxyEndpoint = '/api/agent/properties';
      const useProxyFallback =
        process.env.NODE_ENV === 'development'
        && String(process.env.REACT_APP_USE_PROXY_FALLBACK || 'true').toLowerCase() !== 'false';
      const apiEndpointsToTry = useProxyFallback
        ? [primaryApiEndpoint, fallbackProxyEndpoint]
        : [primaryApiEndpoint];
      const authToken =
        (process.env.REACT_APP_API_TOKEN || getStoredAuthToken(authUser) || '').trim();

      if (!authToken) {
        throw new Error('Missing API token. Please login again and ensure token is stored.');
      }
      const preSyncResult = await flushOfflinePublishQueue({
        apiEndpoints: apiEndpointsToTry,
        authToken,
      });
      const flushedBeforePublish = Number(preSyncResult?.flushed || 0);

      const optimizedUploadFiles = await optimizeImagesForUpload(uploadedImageFiles);

      const buildFormData = (includeImages = true) => {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((item) => formData.append(`${key}[]`, item));
          } else {
            formData.append(key, value);
          }
        });
        if (includeImages) {
          optimizedUploadFiles.forEach((file) => formData.append('images[]', file));
        }
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

        return { parsedResponse, trimmedResponseText, looksLikeHtmlResponse };
      };
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const REQUEST_TIMEOUT_MS = 120000;

      let lastError = null;
      const maxAttemptsPerEndpoint = 2;
      const payloadVariants = optimizedUploadFiles.length
        ? [{ includeImages: true }, { includeImages: false }]
        : [{ includeImages: true }];
      let savedWithoutImages = false;

      for (const apiEndpoint of apiEndpointsToTry) {
        for (const variant of payloadVariants) {
          for (let attempt = 1; attempt <= maxAttemptsPerEndpoint; attempt += 1) {
            let timeoutId;
            try {
              const controller = new AbortController();
              timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
              const formData = buildFormData(variant.includeImages);
              const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  Authorization: `Bearer ${authToken}`,
                },
                body: formData,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              const { parsedResponse, trimmedResponseText, looksLikeHtmlResponse } =
                await parseResponseBody(response);

              if (!response.ok) {
                if (looksLikeHtmlResponse && trimmedResponseText.includes('Cannot POST')) {
                  throw new Error('Publish API endpoint not found. Please verify property API URL configuration.');
                }
                if (response.status === 401 || response.status === 403) {
                  throw new Error('Unauthorized token. Please login again to refresh API token.');
                }
                if ([502, 503, 504].includes(response.status)) {
                  const retryableError = new Error(`Server timeout (${response.status}). Please retry.`);
                  retryableError.isRetryable = true;
                  retryableError.statusCode = response.status;
                  throw retryableError;
                }
                const serverMessage = looksLikeHtmlResponse
                  ? `Server returned an HTML error page (${response.status}).`
                  : (
                    parsedResponse?.message ||
                    parsedResponse?.error ||
                    'Unknown server error'
                  );
                throw new Error(`Request failed (${response.status}). ${serverMessage}`);
              }

              if (looksLikeHtmlResponse) {
                const retryableHtmlError = new Error('Server returned HTML instead of JSON. Please retry.');
                retryableHtmlError.isRetryable = true;
                throw retryableHtmlError;
              }

              if (!variant.includeImages) savedWithoutImages = true;
              setPublishMessage(
                savedWithoutImages
                  ? `Property saved successfully (without images due to server timeout).${flushedBeforePublish ? ` Synced ${flushedBeforePublish} pending listing(s).` : ''}`
                  : `Property saved successfully.${flushedBeforePublish ? ` Synced ${flushedBeforePublish} pending listing(s).` : ''}`
              );
              return;
            }
            catch (error) {
              if (timeoutId) clearTimeout(timeoutId);
              lastError = error;
              const message = String(error?.message || '').toLowerCase();
              const isNetworkLikeError =
                error?.name === 'AbortError' ||
                error?.name === 'TypeError' ||
                message.includes('failed to fetch') ||
                message.includes('network') ||
                message.includes('cors') ||
                message.includes('load failed');
              const isRetryable = Boolean(error?.isRetryable || isNetworkLikeError);
              const hasAttemptsLeft = attempt < maxAttemptsPerEndpoint;
              const hasAnotherEndpoint = apiEndpoint !== apiEndpointsToTry[apiEndpointsToTry.length - 1];
              const hasAnotherVariant = variant !== payloadVariants[payloadVariants.length - 1];

              if (isRetryable && hasAttemptsLeft) {
                await wait(700 * attempt);
                continue;
              }
              if ((hasAnotherEndpoint || hasAnotherVariant) && isRetryable) {
                break;
              }
              throw error;
            }
          }
        }
      }

      if (lastError) throw lastError;
    } catch (error) {
      const statusCode = Number(error?.statusCode || 0);
      const isNetworkLikeError =
        error?.name === 'AbortError' ||
        error?.name === 'TypeError' ||
        String(error?.message || '').toLowerCase().includes('failed to fetch') ||
        String(error?.message || '').toLowerCase().includes('network') ||
        String(error?.message || '').toLowerCase().includes('cors') ||
        [502, 503, 504].includes(statusCode) ||
        /server timeout|gateway time-?out/i.test(String(error?.message || ''));
      if (isNetworkLikeError) {
        const queuedCount = queueListingForOfflinePublish(payload);
        setPublishMessage(
          queuedCount
            ? `Server temporarily unavailable. Listing safe save ho gayi hai (offline queue). Pending items: ${queuedCount}.`
            : 'Server temporarily unavailable. Listing local queue me save nahi ho saki, please retry.'
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
          onResetImages={() => {
            setUploadedImages((prev) => {
              prev.forEach((item) => {
                if (typeof item === 'string' && item.startsWith('blob:')) {
                  URL.revokeObjectURL(item);
                }
              });
              return [];
            });
            setUploadedImageFiles([]);
          }}
          onSetContactNumber={setSelectedContactNumber}
          onSetEmail={setSelectedEmail}
          persistedMessages={chatbotSession.messages}
          persistedDraft={chatbotSession.draft}
          persistedResponseStyle={chatbotSession.responseStyle}
          onPersistChatState={setChatbotSession}
          returnToPublishOnSend={isPublishEditMode}
          onReturnToPublishAfterSend={() => {
            setIsPublishEditMode(false);
            setCurrentPage('publish');
          }}
          onContinueAfterImages={() => {
            if (!String(generatedTitle || '').trim()) {
              setGeneratedTitle(
                buildAutoListingTitle({
                  size: selectedSize,
                  sizeUnit: selectedSizeUnit,
                  propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
                  purpose: selectedPurpose,
                  address: selectedAddress,
                })
              );
            }
            if (!String(generatedDescription || '').trim()) {
              setGeneratedDescription(
                buildAutoListingDescription({
                  purpose: selectedPurpose,
                  propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
                  address: selectedAddress,
                  size: selectedSize,
                  sizeUnit: selectedSizeUnit,
                  bedrooms: selectedBedrooms,
                  bathrooms: selectedBathrooms,
                  features: selectedFeature,
                  price: selectedPrice,
                })
              );
            }
            setCurrentPage('genrate');
          }}
        />
      );
    case 'listingMode':
      return (
        <ListingModePage
          onAiListing={() => {
            setChatbotSession({ messages: [], draft: null, responseStyle: '' });
            setResolvedAmenityFeatures([]);
            setManualAmenityCatalog([]);
            setIsPublishEditMode(false);
            setCurrentPage('welcome');
          }}
          onManualListing={() => {}}
        />
      );
    case 'welcome':
      return (
        <WelcomePage
          welcomeName={welcomeName}
          onStart={() => {
            setChatbotSession({ messages: [], draft: null, responseStyle: '' });
            setResolvedAmenityFeatures([]);
            setManualAmenityCatalog([]);
            setIsPublishEditMode(false);
            setCurrentPage('chatbot');
          }}
        />
      );
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
        <FeaturesAmenitiesPage
          bathrooms={selectedBathrooms}
          apiAmenityNames={manualAmenityCatalog}
          amenitiesLoading={manualAmenitiesLoading}
          onBack={() => setCurrentPage('ammenties2')}
          onComplete={(v) => {
            setSelectedFeature(v);
            setCurrentPage('upload');
          }}
        />
      );
    case 'upload':
      return <UploadPage features={selectedFeature} onBack={() => setCurrentPage('ammenties3')} onUploadComplete={handleUploadComplete} />;
    case 'picture':
      return (
        <PicturePage
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
          title={generatedTitle || buildAutoListingTitle({
            size: selectedSize,
            sizeUnit: selectedSizeUnit,
            propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
            purpose: selectedPurpose,
            address: selectedAddress,
          })}
          description={generatedDescription || buildAutoListingDescription({
            propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
            purpose: selectedPurpose,
            address: selectedAddress,
            size: selectedSize,
            sizeUnit: selectedSizeUnit,
            bedrooms: selectedBedrooms,
            bathrooms: selectedBathrooms,
            features: selectedFeature,
            price: selectedPrice,
          })}
          propertyGroup={selectedPropertyGroup}
          purpose={selectedPurpose}
          propertyType={selectedPropertyType}
          address={getDisplayLocationFromAddress(selectedAddress)}
          price={selectedPrice}
          size={selectedSize}
          sizeUnit={selectedSizeUnit}
          bedrooms={selectedBedrooms}
          bathrooms={selectedBathrooms}
          contactNumber={selectedContactNumber || profileContactNumber}
          email={selectedEmail || profileEmail}
          features={selectedFeature}
          images={uploadedImages}
          onPublish={handlePublishListing}
          onEditNavigate={() => {
            const hasExistingChat = Array.isArray(chatbotSession?.messages) && chatbotSession.messages.length > 0;
            setChatbotSession({
              messages: hasExistingChat
                ? chatbotSession.messages
                : buildChatbotMessagesFromCurrentState(),
              draft: buildChatbotDraftFromCurrentState(),
              responseStyle: hasExistingChat ? (chatbotSession.responseStyle || '') : '',
            });
            setIsPublishEditMode(true);
            setCurrentPage('chatbot');
          }}
          publishLoading={publishLoading}
          publishMessage={publishMessage}
        />
      );
    default:
      return <WelcomePage onStart={() => setCurrentPage('propertyType')} />;
  }
}

export default PropertyFlow;
