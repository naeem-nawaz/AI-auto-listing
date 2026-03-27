 import React, { useEffect, useRef, useState } from 'react';
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
import citiesList from '../../citiesLocation/citiesList/cities.json';

const CHATBOT_PURPOSE_OPTIONS = ['Sell', 'Rent', 'Lease'];
const CHATBOT_PROPERTY_TYPE_OPTIONS = ['Home', 'Commercial', 'Plot'];
const CHATBOT_SUB_TYPE_OPTIONS = {
  Home: HOME_PROPERTY_TYPES,
  Commercial: COMMERCIAL_PROPERTY_TYPES,
  Plot: PLOT_PROPERTY_TYPES,
};
const PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE = "👋 Assalam-o-Alaikum! Main aapka AI property assistant hoon. Aap jo details dein ge main unhein smartly pick karunga, aur sirf missing cheezain hi puchunga.";
const PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION = 'For what purpose are you listing this property?';

function formatPriceWithRs(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const normalized = trimmed
    .replace(/^((rs|pkr|₨)\.?\s*)+/i, '')
    .trim();
  if (!normalized) return '';
  const compact = normalized.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const compactMatch = compact.match(/^(\d+(?:\.\d+)?)\s*(crore|core|cr|lakh|lac|million|billion|k|m)?$/i);
  if (compactMatch) {
    const amount = Number(compactMatch[1]);
    const unit = String(compactMatch[2] || '').toLowerCase();
    if (!Number.isNaN(amount)) {
      const multipliers = {
        crore: 10000000,
        core: 10000000,
        cr: 10000000,
        lakh: 100000,
        lac: 100000,
        million: 1000000,
        billion: 1000000000,
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
  return 'Security';
}

function getLocationAwareFeatures({ features, address, propertyType, purpose }) {
  const normalize = (value) => String(value || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const locationText = normalize(address);
  const typeText = normalize(propertyType);
  const purposeText = normalize(purpose);

  const explicit = Array.isArray(features)
    ? features.map((item) => String(item || '').trim()).filter(Boolean)
    : String(features || '')
      .split(/,|\/|\||;|\band\b/gi)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

  const merged = [];
  const pushUnique = (value) => {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const exists = merged.some((item) => item.toLowerCase() === clean.toLowerCase());
    if (!exists) merged.push(clean);
  };

  const areaRules = [
    { pattern: /\bdha\b|\bphase\b/, features: ['Secure Gated Community', 'Premium Infrastructure', 'Parks and Community Facilities'] },
    { pattern: /\bbahria\b/, features: ['Planned Community', '24/7 Security', 'Commercial Hub Nearby'] },
    { pattern: /\bgulberg\b/, features: ['Central Urban Location', 'Corporate and Retail Access', 'High-End Neighborhood'] },
    { pattern: /\bmodel town\b/, features: ['Mature Residential Area', 'Wide Roads and Green Belts', 'Schools and Markets Nearby'] },
    { pattern: /\bjohar town\b/, features: ['Strong Rental Demand', 'Universities and Offices Nearby', 'Well-Connected Roads'] },
    { pattern: /\bwapda town\b/, features: ['Family-Oriented Neighborhood', 'Developed Streets and Utilities', 'Daily Essentials Nearby'] },
    { pattern: /\bparagon\b/, features: ['Gated Society Lifestyle', 'Good Future Appreciation', 'Main Road Connectivity'] },
    { pattern: /\baskari\b/, features: ['Secure Environment', 'Community Parks', 'Organized Layout'] },
    { pattern: /\bmain road\b|\broad\b|\bavenue\b/, features: ['Main Road Frontage', 'Easy Commercial Access', 'Better Visibility'] },
  ];
  const cityRules = [
    { pattern: /\blahore\b/, features: ['High Buyer Activity', 'Strong Resale Potential'] },
    { pattern: /\bkarachi\b/, features: ['Commercial Opportunity', 'High Demand Catchment'] },
    { pattern: /\bislamabad\b|\brawalpindi\b/, features: ['Planned Sectors Access', 'Strong Long-Term Value'] },
  ];

  const matchedAreaRule = areaRules.find((rule) => rule.pattern.test(locationText));
  if (matchedAreaRule) matchedAreaRule.features.forEach(pushUnique);
  const matchedCityRule = cityRules.find((rule) => rule.pattern.test(locationText));
  if (matchedCityRule) matchedCityRule.features.forEach(pushUnique);

  if (!matchedAreaRule && locationText) {
    if (/(society|sector|block|town|city|colony)/i.test(locationText)) {
      pushUnique('Developed Neighborhood');
      pushUnique('Near Daily Essentials');
    }
    if (/(road|street|avenue|highway)/i.test(locationText)) {
      pushUnique('Main Road Access');
    }
    pushUnique('Prime Location');
  }

  if (typeText.includes('plot')) {
    pushUnique('Ready for Construction');
    pushUnique('Investment-Friendly Area');
  } else if (/(shop|office|commercial|warehouse|factory)/i.test(typeText)) {
    pushUnique('Commercial Activity Nearby');
    pushUnique('High Footfall Potential');
  } else {
    pushUnique('Family-Friendly Environment');
  }

  if (purposeText.includes('rent')) pushUnique('Strong Rental Demand');
  if (purposeText.includes('sell')) pushUnique('High Resale Potential');

  // Keep user-given features as high-priority additions.
  explicit.forEach(pushUnique);

  if (!merged.length) return ['Security', 'Prime Location', 'Near Daily Essentials'];
  return merged.slice(0, 3);
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

function buildAutoListingTitle({ size, sizeUnit, propertyType, purpose, address }) {
  const purposeText = String(purpose || 'Sell').toLowerCase();
  const purposeLabel = purposeText === 'rent' ? 'for Rent' : purposeText === 'lease' ? 'for Lease' : 'for Sale';
  const sizeText = size ? `${size} ${sizeUnit || ''}`.trim() : '';
  const safeType = String(propertyType || 'Property').trim() || 'Property';
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
  const safeType = String(propertyType || 'property').trim() || 'property';
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

  const normalized = fullAddress.toLowerCase();
  const normalizeLoose = (value) => String(value || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
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

  const hasLocationContextHint = /\b(?:location|located|address|area|city|near|in|at|phase|block|sector|town|society|scheme|colony|road|street|avenue|dha)\b/i.test(fullAddress)
    || fullAddress.includes(',');

  if (!matchedCity && hasLocationContextHint) {
    const normalizedWords = normalizeLoose(fullAddress).split(' ').filter(Boolean);
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
    areaName = cityVariants.reduce((acc, cityVariant) => {
      const cityRegex = new RegExp(`\\b${escapeRegex(cityVariant)}\\b`, 'ig');
      return acc.replace(cityRegex, ' ');
    }, fullAddress)
      .replace(/\s*,\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[,.:\s-]+|[,.:\s-]+$/g, '')
      .trim();
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
  const areaKeywordMatches = raw.match(/(?:dha\s*(?:phase|pahse|phse)\s*\d+|model\s*town|[a-z0-9]+\s*town|[a-z0-9]+\s*block\s*[a-z0-9]+|[a-z0-9]+\s*sector\s*[a-z0-9]+|[a-z0-9]+\s*society|[a-z0-9]+\s*scheme|[a-z0-9]+\s*colony|[a-z0-9]+\s*road|[a-z0-9]+\s*street|[a-z0-9]+\s*avenue)/ig) || [];
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
    const normalize = (value) => String(value || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(?:ye|yah|yeh|yha|yahan|waha|wahan|is|ki|ka|ke|ma|mein|main)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
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

    const exact = locations.find((item) => normalize(item?.name) === normalizedArea);
    if (exact) return exact;
    const contains = locations.find((item) => normalize(item?.name).includes(normalizedArea));
    if (contains) return contains;
    const reverseContains = locations.find((item) => normalizedArea.includes(normalize(item?.name)));
    if (reverseContains) return reverseContains;

    // Token fallback: for short location hints like "bypass", match any area containing key token.
    const tokens = normalizedArea.split(' ').filter((token) => token.length >= 4);
    if (tokens.length) {
      const tokenMatch = locations.find((item) => {
        const name = normalize(item?.name);
        return tokens.some((token) => name.includes(token));
      });
      if (tokenMatch) return tokenMatch;
    }

    const simplifiedTarget = simplify(normalizedArea);
    let bestMatch = null;
    let bestScore = 0;
    locations.forEach((item) => {
      const locationName = normalize(item?.name);
      if (!locationName) return;
      const simplifiedLocation = simplify(locationName);
      const score = Math.max(
        similarityScore(normalizedArea, locationName),
        similarityScore(simplifiedTarget, simplifiedLocation)
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    });

    return bestScore >= 0.72 ? bestMatch : null;
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
  onResetImages,
  onSetContactNumber,
  onSetEmail,
  onContinueAfterImages,
  persistedMessages,
  persistedDraft,
  onPersistChatState,
}) {

  const [messages, setMessages] = useState(() => (
    Array.isArray(persistedMessages) && persistedMessages.length ? persistedMessages : []
  ));
  const [inputText, setInputText] = useState('');
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const [selectedCityForAddress, setSelectedCityForAddress] = useState('');
  const [cityAreas, setCityAreas] = useState([]);
  const [isAreasLoading, setIsAreasLoading] = useState(false);
  const [areasLoadError, setAreasLoadError] = useState('');
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [isImageOnlyView, setIsImageOnlyView] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const composerInputRef = useRef(null);
  const imageFlowSnapshotRef = useRef([]);

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
        useProfileContact: persistedDraft.useProfileContact || '',
        images: persistedDraft.images || ((selectedUploadedImages?.length || 0) ? `uploaded:${selectedUploadedImages.length}` : ''),
        contactNumber: persistedDraft.contactNumber || selectedContactNumber || '',
        email: persistedDraft.email || selectedEmail || '',
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
      useProfileContact: '',
      images: (selectedUploadedImages?.length || 0) ? `uploaded:${selectedUploadedImages.length}` : '',
      contactNumber: selectedContactNumber || '',
      email: selectedEmail || '',
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
  const isShopType = (data) => {
    const subType = normalizeType(data?.subType);
    const propertyType = normalizeType(data?.propertyType);
    return subType.includes('shop') || propertyType.includes('shop');
  };
  const shouldSkipAmenityQuestions = (data) => isPlotType(data) || isShopType(data);

  const hasProfileContact = Boolean((profileContactNumber || '').trim() || (profileEmail || '').trim());

  const getCurrentStage = (data) => {
    for (const key of stageOrder) {
      if (key === 'subType') {
        const group = getPropertyGroup(data?.propertyType);
        if (group === 'Plot' || isShopType(data)) continue;
        if (!String(group || '').trim()) continue;
        if (String(data?.subType || '').trim()) continue;
      }
      // Features are generated automatically from location and property context.
      if (key === 'features') continue;
      if ((key === 'bedrooms' || key === 'bathrooms' || key === 'features') && shouldSkipAmenityQuestions(data)) continue;
      if (key === 'useProfileContact' && !hasProfileContact) continue;
      if ((key === 'email' || key === 'contactNumber') && data?.useProfileContact === 'yes') continue;
      if (String(data?.[key] || '').trim()) continue;
      return key;
    }
    return 'complete';
  };

  const getPromptForStage = (stage) => {
    if (stage === 'purpose') return PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION;
    if (stage === 'propertyType') return 'Great. Property kis category mein hai — Home, Commercial ya Plot?';
    if (stage === 'subType') return 'Nice. Ab is ka exact sub-type batayein (jaise House, Shop, Office, etc.).';
    if (stage === 'address') return 'Perfect. Location share karein (Area, City).';
    if (stage === 'size') return 'Area size batayein (jaise 5 Marla, 10 Marla, 1 Kanal).';
    if (stage === 'price') {
      const purpose = String(draft?.purpose || '').toLowerCase();
      if (purpose === 'sell') return 'Expected price kitni rakhna chahte hain?';
      if (purpose === 'rent') return 'Expected rent kitna rakhna chahte hain?';
      if (purpose === 'lease') return 'Expected lease amount kitna rakhna chahte hain?';
      return 'Expected amount kitna rakhna chahte hain?';
    }
    if (stage === 'bedrooms') return isCommercialType(draft) ? 'Bedrooms kitne hain? (Agar apply nahi karta to skip kar dein.)' : 'Bedrooms kitne hain?';
    if (stage === 'bathrooms') return isCommercialType(draft) ? 'Bathrooms kitne hain? (Agar apply nahi karta to skip kar dein.)' : 'Bathrooms kitne hain?';
    if (stage === 'features') return 'Key features batayein (comma se alag likh sakte hain).';
    if (stage === 'useProfileContact') return 'Kya profile wala contact use karna hai?';
    if (stage === 'email') return 'Email address share karein.';
    if (stage === 'contactNumber') return 'Contact number share karein (03XXXXXXXXX).';
    if (stage === 'images') return 'Ab images upload karein — click karein ya drag and drop kar dein.';
    return 'Excellent. Basic listing details complete ho gayi hain.';
  };

  const getInvalidStageReply = (stage) => {
    const stageHints = {
      purpose: 'Sell, Rent ya Lease mein se ek choose karein.',
      propertyType: 'Home, Commercial ya Plot type mention karein.',
      subType: 'House, Flat, Shop, Office jaisa sub-type likhein.',
      address: 'Area aur city ke sath location batayein, jaise DHA Phase 6, Lahore.',
      size: 'Size number + unit likhein, jaise 5 Marla.',
      price: 'Price/rent number mein batayein, jaise Rs 3500000 ya rent 35000.',
      bedrooms: 'Bedrooms ki ginti number mein batayein.',
      bathrooms: 'Bathrooms ki ginti number mein batayein.',
      features: '2-3 features likh dein, jaise parking, security, corner.',
      email: 'Valid email format dein, jaise name@email.com.',
      contactNumber: 'Valid Pakistani mobile number dein, format 03XXXXXXXXX.',
    };
    const hint = stageHints[stage] || 'Thori si aur clear detail share karein.';
    return `Mujhe is point par thori clear detail chahiye. ${hint}`;
  };

  const normalizeInputForUnderstanding = (text) =>
    String(text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(?:mai|main|mein|mn|mna)\b/g, ' ')
      .replace(/\b(?:ghr|ghar|makan|makaan|home)\b/g, ' house ')
      .replace(/\b(?:bechna|bechni|bechne|farokht|farokhti)\b/g, ' sell ')
      .replace(/\b(?:kiraya|kiraye|kiray|kraya|kraye|ijara|ijarah)\b/g, ' rent ')
      .replace(/\b(?:dena|dene|daina)\b/g, ' ')
      .replace(/\b(?:dukan)\b/g, ' shop ')
      .replace(/\b(?:daftar)\b/g, ' office ')
      .replace(/\b(?:zameen|qita|qita zameen)\b/g, ' plot ')
      .replace(/\b(?:jaga|jgah|jagah|location|loc)\b/g, ' location ')
      .replace(/\b(?:kamra|kamray|kamre)\b/g, ' bedroom ')
      .replace(/\b(?:wash room|washroom|bath room|ghusalkhana)\b/g, ' bathroom ')
      .replace(/\b(?:attach|attached)\b/g, ' attached ')
      .replace(/\s+/g, ' ')
      .trim();

  const parsePurpose = (text) => {
    const raw = normalizeInputForUnderstanding(text);
    if (!raw) return '';
    const normalized = raw.replace(/\s+/g, ' ').trim();
    const hasAny = (keywords) => keywords.some((keyword) => normalized.includes(keyword));

    const sellKeywords = [
      'sell', 'sale', 'for sale', 'selling', 'bechna', 'bechni', 'bechne', 'farokht',
    ];
    const rentKeywords = [
      'rent', 'for rent', 'kiraya', 'kiraye', 'kiray', 'rent dena', 'rent pe',
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
    const lower = raw.toLowerCase();

    const explicitPatterns = [
      { unit: 'Kanal', regex: /(\d+(?:\.\d+)?)\s*kanal\b/i },
      { unit: 'Marla', regex: /(\d+(?:\.\d+)?)\s*marla\b/i },
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
    const matched = knownTypes.find((item) => lower.includes(item));
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
    const hasCurrencyHint = /\b(?:rs|pkr|price|budget|rent|lease|amount|lakh|lac|crore|core|cr|million|billion)\b/i.test(lower)
      || /\b(?:rent|lease)\b/i.test(normalized);
    const hasCompactNumberHint = /\b\d+(?:\.\d+)?\s*(?:k|m)\b/i.test(lower);
    const hasPriceHint = hasCurrencyHint || hasCompactNumberHint;
    if (!hasPriceHint) return '';
    const hintMatch = raw.match(/(?:price|rs|pkr|rent|lease)\s*[:-]?\s*(\d[\d,]*(?:\.\d+)?(?:\s*(?:lakh|lac|crore|core|cr|million|billion|k|m))?)/i);
    if (hintMatch?.[1]) return formatPriceWithRs(hintMatch[1]);
    const candidates = [...raw.matchAll(/\d[\d,]*(?:\.\d+)?(?:\s*(?:lakh|lac|crore|core|cr|million|billion|k|m))?/gi)]
      .map((item) => String(item?.[0] || '').trim())
      .filter(Boolean);
    if (!candidates.length) return '';
    const best = candidates.sort((a, b) => b.replace(/[^\d]/g, '').length - a.replace(/[^\d]/g, '').length)[0];
    return formatPriceWithRs(best);
  };

  const parseAddressFromText = (text, force = false) => {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const lower = normalizeInputForUnderstanding(raw);
    const normalizedLocation = getDisplayLocationFromAddress(raw);
    if (normalizedLocation) return normalizedLocation;

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

    const cleaned = candidate.length >= 4 ? candidate : '';
    const normalized = getDisplayLocationFromAddress(cleaned);
    if (normalized) return normalized;
    // Strict mode: if it doesn't resolve to known location data, treat as missing.
    if (!force) return '';
    return '';
  };

  const hasExplicitLocationIntent = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return false;
    return /\b(?:location|located|address|area|jaga|jagah|ma|main|mein|dha|phase|block|sector|town|society|scheme|colony|road|street|avenue)\b/i.test(raw);
  };

  const getAreaCandidateNearCity = (text, cityName) => {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const city = String(cityName || '').trim();
    if (!raw || !city) return '';
    const cityEscaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nearCityMatch = raw.match(new RegExp(`\\b([a-z0-9\\s-]{2,60})\\s+${cityEscaped}\\b`, 'i'));
    const candidate = String(nearCityMatch?.[1] || '')
      .replace(/\b(?:ye|yah|yeh|yha|yahan|waha|wahan|location|located|address|area|ma|mein|main|is|ha|hai|hain|or|aur|ka|ki|ke|jis|with|price|rent|sale|sell|lease|house|flat|shop|plot|makan)\b/gi, ' ')
      .replace(/\b\d+(?:\.\d+)?\s*(?:marla|kanal|sq\s*ft|sqft|square\s*feet)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return candidate;
  };

  const parseCountByKeywords = (text, keywords = []) => {
    const raw = normalizeInputForUnderstanding(text);
    if (!raw || !keywords.length) return '';
    const keywordPattern = keywords.join('|');

    // e.g. "5 bedroom", "5 hi bathroom", "5 room hain"
    const numberBeforeKeyword = raw.match(
      new RegExp(`\\b(\\d+)\\b(?:\\s+\\w+){0,3}\\s*(?:${keywordPattern})\\b`, 'i')
    );
    if (numberBeforeKeyword) return numberBeforeKeyword[1];

    // e.g. "bedrooms 5", "bathroom total 4"
    const keywordBeforeNumber = raw.match(
      new RegExp(`\\b(?:${keywordPattern})\\b(?:\\s+\\w+){0,3}\\s*(\\d+)\\b`, 'i')
    );
    if (keywordBeforeNumber) return keywordBeforeNumber[1];

    return '';
  };

  const parseBedroomsFromText = (text) => {
    return parseCountByKeywords(text, ['bed', 'beds', 'bedroom', 'bedrooms', 'room', 'rooms', 'kamra', 'kamray', 'kamre']);
  };

  const parseBathroomsFromText = (text) => {
    return parseCountByKeywords(text, ['bath', 'baths', 'bathroom', 'bathrooms', 'washroom', 'washrooms', 'ghusalkhana']);
  };

  const parseFeaturesFromText = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return '';
    const featureHints = [];
    if (/\bparking\b/.test(raw)) featureHints.push('Parking');
    if (/\bgarden\b/.test(raw)) featureHints.push('Garden');
    if (/\bsecurity\b/.test(raw)) featureHints.push('Security');
    if (/\bgas\b/.test(raw)) featureHints.push('Gas');
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
    const inferredSubType = inferSubTypeFromText(raw, inferredGroup);
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
    const incomingSubTypeValue = inferredSubType || (propertyType && !parsedGroupName ? propertyType : '');
    const currentSubTypeValue = String(currentDraft?.subType || '').trim();
    const canUpdateTypeNow = ['purpose', 'propertyType', 'subType'].includes(String(stage || '').toLowerCase());

    if ((allowOverwrite || !currentDraft.purpose) && purpose) next.purpose = purpose;
    if (incomingTypeValue) {
      if (allowOverwrite) {
        next.propertyType = incomingTypeValue;
      } else if (!currentTypeValue) {
        next.propertyType = incomingTypeValue;
      } else if (canUpdateTypeNow && normalizeType(currentTypeValue) !== normalizeType(incomingTypeValue)) {
        next.propertyType = incomingTypeValue;
      }
    }
    if (incomingSubTypeValue) {
      if (allowOverwrite) {
        next.subType = incomingSubTypeValue;
      } else if (!currentSubTypeValue) {
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
    if ((allowOverwrite || !currentDraft.address) && parsedAddress) next.address = parsedAddress;
    if ((allowOverwrite || !currentDraft.bedrooms) && parsedBedrooms) next.bedrooms = parsedBedrooms;
    if ((allowOverwrite || !currentDraft.bathrooms) && parsedBathrooms) next.bathrooms = parsedBathrooms;
    if ((allowOverwrite || !currentDraft.bathrooms) && !parsedBathrooms && /\b(?:attach|attached)\s*(?:bath|bathroom|washroom)\b/i.test(raw)) {
      const inferredFromBeds = String(parsedBedrooms || currentDraft?.bedrooms || '').trim();
      if (/^\d+$/.test(inferredFromBeds)) next.bathrooms = inferredFromBeds;
    }
    if ((allowOverwrite || !currentDraft.features) && parsedFeatures) next.features = parsedFeatures;
    if ((allowOverwrite || !currentDraft.contactNumber) && parsedContactNumber) next.contactNumber = parsedContactNumber;
    if ((allowOverwrite || !currentDraft.email) && parsedEmail) next.email = parsedEmail;

    return next;
  };

  const parseContactNumber = (text) => {
    const normalized = normalizePakistanPhone(text);
    if (!isValidPakistanMobile(normalized)) return '';
    return normalized;
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
      const parsedGroupName = toGroupName(inferredTypeRaw);
      const group = getPropertyGroup(parsedGroupName || inferredTypeRaw);
      const inferredSubType = inferSubTypeFromText(trimmed, group);
      const shouldUseDirectSubType = Boolean(inferredTypeRaw && !parsedGroupName);

      return {
        ok: true,
        nextDraft: {
          ...currentDraft,
          propertyType: group,
          ...((inferredSubType || shouldUseDirectSubType)
            ? { subType: inferredSubType || inferredTypeRaw }
            : {}),
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
      const price = parsePriceFromText(trimmed) || (/^\d[\d,]*$/.test(trimmed) ? formatPriceWithRs(trimmed) : '');
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
      if (!bathrooms && /\b(?:attach|attached)\s*(?:bath|bathroom|washroom)\b/i.test(trimmed)) {
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

  const buildListingSummaryText = (data) => {
    const locationText = getProfessionalLocation(data?.address);
    const propertyTypeText = data?.subType || data?.propertyType || 'Property';
    const purposeText = (data?.purpose || 'Sell').toLowerCase();
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

  const detectResponseStyle = (text) => {
    const raw = String(text || '').toLowerCase();
    if (!raw) return 'english';
    if (/[\u0600-\u06FF]/.test(raw)) return 'urdu';
    const romanUrduHints = ['ma', 'mein', 'main', 'ha', 'hai', 'hain', 'jis', 'ki', 'ka', 'krna', 'chahta', 'chata', 'sale', 'plot', 'lahore', 'bahawalpur'];
    const englishHints = ['i want', 'i am', 'please', 'my property', 'located in', 'for sale', 'for rent', 'price', 'size'];
    const romanScore = romanUrduHints.reduce((acc, item) => (raw.includes(item) ? acc + 1 : acc), 0);
    const englishScore = englishHints.reduce((acc, item) => (raw.includes(item) ? acc + 1 : acc), 0);
    return romanScore > englishScore ? 'romanUrdu' : 'english';
  };

  const buildConfirmationTemplate = ({
    style,
    sizeLabel,
    readableType,
    readablePurpose,
    priceLabel,
    locationLabel,
    bedroomsLabel,
    bathroomsLabel,
  }) => {
    const purposeUrduText = readablePurpose === 'rent' ? 'rent ke liye' : readablePurpose === 'lease' ? 'lease ke liye' : 'sale ke liye';
    const subjectUrdu = `${sizeLabel ? `${sizeLabel} ka ` : ''}${readableType}`.replace(/\s+/g, ' ').trim();
    const subjectEnglish = `${sizeLabel ? `${sizeLabel} ` : ''}${readableType}`.replace(/\s+/g, ' ').trim();

    if (style === 'romanUrdu' || style === 'urdu') {
      const details = [];
      if (priceLabel) {
        if (readablePurpose === 'rent') details.push(`jis ka rent ${priceLabel} hai`);
        else if (readablePurpose === 'lease') details.push(`jis ka lease amount ${priceLabel} hai`);
        else details.push(`jis ki price ${priceLabel} hai`);
      }
      if (locationLabel) details.push(`location ${locationLabel} hai`);
      if (bedroomsLabel && bathroomsLabel) {
        details.push(`${bedroomsLabel} bedrooms aur ${bathroomsLabel} bathrooms hain`);
      } else if (bedroomsLabel) {
        details.push(`${bedroomsLabel} bedrooms mention kiye gaye hain`);
      } else if (bathroomsLabel) {
        details.push(`${bathroomsLabel} bathrooms mention kiye gaye hain`);
      }
      const detailsText = details.length ? `, ${details.join(' aur ')}` : '';
      return `Perfect! Aap ${subjectUrdu} ${purposeUrduText} list karna chahte hain${detailsText}.`;
    }

    const englishDetails = [];
    if (priceLabel) {
      if (readablePurpose === 'rent') englishDetails.push(`with a rent of ${priceLabel}`);
      else if (readablePurpose === 'lease') englishDetails.push(`with a lease amount of ${priceLabel}`);
      else englishDetails.push(`with an asking price of ${priceLabel}`);
    }
    if (locationLabel) englishDetails.push(`located in ${locationLabel}`);
    if (bedroomsLabel && bathroomsLabel) englishDetails.push(`featuring ${bedroomsLabel} bedrooms and ${bathroomsLabel} bathrooms`);
    else if (bedroomsLabel) englishDetails.push(`featuring ${bedroomsLabel} bedrooms`);
    else if (bathroomsLabel) englishDetails.push(`featuring ${bathroomsLabel} bathrooms`);
    const englishDetailText = englishDetails.length ? ` ${englishDetails.join(' and ')}.` : '.';
    return `Great! You want to list ${subjectEnglish} for ${readablePurpose}${englishDetailText}`;
  };

  const summarizeCapturedFacts = (previousDraft, nextDraft, userText = '') => {
    const picked = [];
    const prev = previousDraft || {};
    const next = nextDraft || {};
    const isNewValue = (key) => {
      const before = String(prev?.[key] || '').trim();
      const after = String(next?.[key] || '').trim();
      return !before && !!after;
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
    const typeLabel = String(next?.subType || next?.propertyType || 'property').trim().toLowerCase();
    const readableType = typeLabel || 'property';
    const sizeLabel = next?.size ? `${next.size} ${next?.sizeUnit || ''}`.trim() : '';
    const priceLabel = String(next?.price || '').trim();
    const parsedLocation = parseAddressParts(next?.address, citiesList);
    const displayLocation = getDisplayLocationFromAddress(next?.address);
    const locationLabel = parsedLocation?.cityName
      ? `${String(parsedLocation?.areaName || displayLocation || '').replace(/\s+/g, ' ').trim().replace(new RegExp(`\\b${String(parsedLocation.cityName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'ig'), '').replace(/\s+/g, ' ').trim().replace(/[,\s]+$/g, '')}, ${parsedLocation.cityName}`
          .replace(/^,\s*/, '')
          .replace(/\s+,/g, ',')
          .replace(/\s+/g, ' ')
          .trim()
      : displayLocation;
    const bedroomsLabel = String(next?.bedrooms || '').trim();
    const bathroomsLabel = String(next?.bathrooms || '').trim();
    const style = detectResponseStyle(userText);

    const hasStructuredSummary = Boolean(sizeLabel || priceLabel || locationLabel || bedroomsLabel || bathroomsLabel || isNewValue('purpose') || isNewValue('propertyType') || isNewValue('subType'));
    if (hasStructuredSummary) {
      return buildConfirmationTemplate({
        style,
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
    if (style === 'romanUrdu' || style === 'urdu') {
      return `Perfect! Main ne aap ki ${compact} details note kar li hain.`;
    }
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

  const getInitialAssistantMessages = () => ([
    {
      role: 'assistant',
      text: PAKISTANI_PROPERTY_AGENT_FIRST_MESSAGE,
    },
    {
      role: 'assistant',
      text: PAKISTANI_PROPERTY_AGENT_FIRST_QUESTION,
    },
  ]);

  useEffect(() => {
    if (!messages.length) {
      setMessages(getInitialAssistantMessages());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onPersistChatState?.({ messages, draft });
  }, [messages, draft, onPersistChatState]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isReplyLoading]);

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
    if (!userText || isReplyLoading) return;

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
    const inferredFacts = extractFactsFromText(userText, baseDraft, stage, { allowOverwrite: isEditingMessage });
    let workingDraft = { ...baseDraft, ...inferredFacts };
    const parsedLocationFromInput = parseAddressFromText(userText, true);
    const hasLocationIntent = hasExplicitLocationIntent(userText);
    const hasAddressAlready = Boolean(String(baseDraft?.address || '').trim());
    const hasAddressAfterParse = Boolean(String(workingDraft?.address || '').trim());
    const isInvalidLocationInput = hasLocationIntent && !parsedLocationFromInput && !hasAddressAlready && !hasAddressAfterParse;
    const normalizeLoose = (value) => String(value || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    let isInvalidAreaInput = false;
    if (hasLocationIntent) {
      const parsedFromRaw = parseAddressParts(userText, citiesList);
      const cityFromInput = String(parsedFromRaw?.cityName || '').trim();
      const areaFromInput = getAreaCandidateNearCity(userText, cityFromInput) || String(parsedFromRaw?.areaName || '').trim();
      if (cityFromInput && areaFromInput) {
        const areaMeta = await resolveAreaMetadata(cityFromInput, areaFromInput);
        if (areaMeta?.name) {
          workingDraft = {
            ...workingDraft,
            address: `${areaMeta.name}, ${cityFromInput}`.replace(/\s+/g, ' ').trim(),
          };
        } else {
          // City is valid but area does not exist in our city-location data.
          isInvalidAreaInput = true;
        }
      } else if (cityFromInput && !areaFromInput) {
        const locationText = normalizeLoose(userText);
        const cityText = normalizeLoose(cityFromInput);
        const hasOnlyCity = locationText === cityText || locationText.endsWith(` ${cityText}`);
        if (!hasOnlyCity) {
          isInvalidAreaInput = true;
        }
      }
    }

    if (isEditingMessage) {
      const editedBaseMessages = buildMessagesAfterEdit(messages);
      setDraft(workingDraft);
      syncDraftToParent(workingDraft);

      if (isInvalidAreaInput) {
        setMessages([
          ...editedBaseMessages,
          { role: 'assistant', text: 'Invalid area. City match ho gaya hai, lekin area valid list me nahi mila. Please correct area name dein.' },
        ]);
        return;
      }

      if (isInvalidLocationInput) {
        setMessages([
          ...editedBaseMessages,
          { role: 'assistant', text: 'Invalid location. Please select a valid area and city (e.g. DHA Phase 8, Lahore).' },
        ]);
        return;
      }

      const nextStage = getCurrentStage(workingDraft);
      const ackText = summarizeCapturedFacts(draft, workingDraft, userText);
      if (nextStage === 'images') {
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          { role: 'assistant', text: buildListingSummaryText(workingDraft) },
          { role: 'assistant', text: getPromptForStage('images') },
        ]);
      } else if (nextStage === 'complete') {
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          {
            role: 'assistant',
            text: 'Great! Basic listing details complete ho gayi hain. Ab aap title, description, pricing ya listing strategy par mujh se direct mashwara le sakte hain.',
          },
        ]);
      } else {
        setMessages([
          ...editedBaseMessages,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          { role: 'assistant', text: getPromptForStage(nextStage) },
        ]);
      }
      return;
    }

    if (stage !== 'complete') {
      if (!String(workingDraft[stage] || '').trim()) {
        const { ok, nextDraft } = applyAnswerToDraft(stage, userText, workingDraft);
        if (!ok) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: getInvalidStageReply(stage) },
          ]);
          return;
        }
        workingDraft = nextDraft;
      }

      if (!String(workingDraft[stage] || '').trim()) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: getInvalidStageReply(stage) },
        ]);
        return;
      }

      setDraft(workingDraft);
      syncDraftToParent(workingDraft);

      if (isInvalidAreaInput) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Invalid area. City theek hai, lekin area valid data me nahi mila. Please valid area select karein.' },
          { role: 'assistant', text: getPromptForStage('address') },
        ]);
        return;
      }

      if (isInvalidLocationInput) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: 'Invalid location. Please enter a valid location from available city/area data.' },
          { role: 'assistant', text: getPromptForStage('address') },
        ]);
        return;
      }

      const nextStage = getCurrentStage(workingDraft);
      const ackText = summarizeCapturedFacts(draft, workingDraft, userText);
      if (nextStage === 'images') {
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          { role: 'assistant', text: buildListingSummaryText(workingDraft) },
          { role: 'assistant', text: getPromptForStage('images') },
        ]);
      } else if (nextStage === 'complete') {
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          {
            role: 'assistant',
            text: 'Great! Basic listing details complete ho gayi hain. Ab aap title, description, pricing ya listing strategy par mujh se direct mashwara le sakte hain.',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          ...(ackText ? [{ role: 'assistant', text: ackText }] : []),
          { role: 'assistant', text: getPromptForStage(nextStage) },
        ]);
      }
      return;
    }

    setIsReplyLoading(true);
    try {
      const historyForAi = editMessageIndex !== null ? buildMessagesAfterEdit(messages) : [...messages, userMessage];
      const reply = await withTimeout(requestAiDiscussionReply(userText, historyForAi), 25000);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply || getFallbackReply(userText) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: getFallbackReply(userText) }]);
    } finally {
      setIsReplyLoading(false);
    }
  };

  const handleAddressCitySelect = (cityName) => {
    if (isReplyLoading) return;
    const pickedCity = String(cityName || '').trim();
    if (!pickedCity) return;
    setSelectedCityForAddress(pickedCity);
    setInputText('');
    loadAreasForCity(pickedCity);
  };

  const handleAddressAreaSelect = (areaName) => {
    if (isReplyLoading) return;
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
      ? 'Great! Basic listing details complete ho gayi hain. Ab aap title, description, pricing ya listing strategy par mujh se direct mashwara le sakte hain.'
      : getPromptForStage(nextStage);

    imageFlowSnapshotRef.current = messages;
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: uploadedMessage },
      { role: 'assistant', text: followup },
    ]);

    setIsImageOnlyView(true);

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
    const hasUploadedImages =
      (selectedUploadedImages?.length || 0) > 0 ||
      String(draft?.images || '').startsWith('uploaded:');
    if (!hasUploadedImages) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Please upload at least one image to continue.' },
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
      ? 'Great! Basic listing details complete ho gayi hain. Ab aap title, description ya pricing par agla sawal pooch sakte hain.'
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

  const handleBedroomQuickSelect = (value, index) => {
    if (isReplyLoading) return;
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
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: getPromptForStage(nextStage) }]);
  };

  const handleBathroomQuickSelect = (value, index) => {
    if (isReplyLoading) return;
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
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', text: getPromptForStage(nextStage) }]);
  };

  const activeStage = getCurrentStage(draft);
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
              <UserMessage
                key={`u-${index}`}
                onEditStart={() => handleEditPreviousUserMessage(message.text, index)}
                isEditing={editingMessageIndex === index}
                editValue={editingMessageText}
                onEditValueChange={setEditingMessageText}
                onEditCancel={handleCancelMessageEdit}
                onEditSubmit={handleSubmitMessageEdit}
                isSendDisabled={isReplyLoading || !String(editingMessageText || '').trim()}
              >
                {message.text}
              </UserMessage>
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
        {activeStage === 'bedrooms' && (
          <OptionTabs
            options={BEDROOM_OPTIONS}
            containerClassName="bedroomOptions"
            buttonClassName="bedroomChip"
            onOptionClick={(item, index) => handleBedroomQuickSelect(item, index)}
          />
        )}
        {activeStage === 'bathrooms' && (
          <OptionTabs
            options={BATHROOM_OPTIONS}
            containerClassName="bedroomOptions"
            buttonClassName="bedroomChip"
            onOptionClick={(item, index) => handleBathroomQuickSelect(item, index)}
          />
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
          <div className="aiChatbotInputRow">
            <input
              ref={composerInputRef}
              className="addressInput aiChatbotTextInput"
              placeholder={activeStage === 'address' ? 'Select your city or area...' : 'Type your message here...'}
              value={inputText}
              onChange={(event) => {
                setInputText(event.target.value);
                if (activeStage === 'address') {
                  setAddressDropdownOpen(true);
                }
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
                  handleSend();
                }
              }}
              disabled={isReplyLoading}
            />
            <button className="sendBtn aiChatbotSendBtn" onClick={() => handleSend()} disabled={isReplyLoading || !inputText.trim()}>
              <LuSend />
            </button>
          </div>
          {activeStage === 'address' && addressDropdownOpen && (
            <div className="addressDropdownPanel">
              {!selectedCityForAddress && (
                <>
                  <div className="addressDropdownTitle">Select City</div>
                  {filteredCities.map((cityName) => (
                    <button
                      key={cityName}
                      type="button"
                      className="addressDropdownItem"
                      disabled={isReplyLoading}
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
                    disabled={isReplyLoading}
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
                      disabled={isReplyLoading}
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
  const featureItems = getLocationAwareFeatures({
    features,
    address,
    propertyType,
    purpose,
  });
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
          <h4>Key Features</h4>
          <div className="publishFeatures">
            {featureItems.map((item) => (
              <span key={item}><span className="publishFeatureIcon"><LuCheck /></span> {item}</span>
            ))}
          </div>
          <div className="publishActions">
            <button className="publishBtn" onClick={onPublish} disabled={publishLoading}>
              <LuSparkles /> {publishLoading ? 'Publishing...' : 'Publish Listing'}
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
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('listingMode');
  const [chatbotSession, setChatbotSession] = useState({ messages: [], draft: null });
  const authUserForWelcome = getStoredAuthUser();
  const welcomeName = getDisplayNameFromUser(authUserForWelcome);
  const profileContactNumber = getContactFromUser(authUserForWelcome);
  const profileEmail = getEmailFromUser(authUserForWelcome);

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
    useProfileContact: '',
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
    const rawContactNumber = selectedContactNumber || getContactFromUser(authUser) || '03331234567';
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
    const autoFeatureList = getLocationAwareFeatures({
      features: selectedFeature,
      address: finalAddress || cleanedLocation,
      propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
      purpose: selectedPurpose,
    });
    const effectiveFeaturesText = autoFeatureList.join(', ');

    const effectiveTitle = String(generatedTitle || '').trim() || buildAutoListingTitle({
      size: selectedSize,
      sizeUnit: selectedSizeUnit,
      propertyType: selectedPropertyType || selectedPropertyGroup || 'Property',
      purpose: selectedPurpose,
      address: finalAddress,
    });
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

    if (selectedGroupText.includes('commercial') || COMMERCIAL_PROPERTY_TYPES.some((item) => normalize(item) === selectedTypeText)) {
      detectedGroup = 'Commercial';
    } else if (selectedGroupText.includes('plot') || PLOT_PROPERTY_TYPES.some((item) => normalize(item) === selectedTypeText)) {
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
    const subTypeOptionsByGroup = {
      Home: HOME_PROPERTY_TYPES,
      Plot: PLOT_PROPERTY_TYPES,
      Commercial: COMMERCIAL_PROPERTY_TYPES,
    };
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
    const subCategoryIdByName = {
      House: 1,
      Flat: 2,
      'Upper Portion': 3,
      'Lower Portion': 4,
      'Farm House': 5,
      Room: 6,
      Penthouse: 7,
      'Residential Plot': 8,
      'Commercial Plot': 9,
      Agricultural: 10,
      'Industry Land': 11,
      'Plot File': 12,
      'Plot Form': 13,
      Office: 14,
      Shop: 15,
      'Warehouse portion': 16,
      Factory: 17,
      Building: 18,
      other: 19,
    };
    const subCategoryId = subCategoryIdByName[finalSubCategoryName] || subCategoryIdByName[fallbackSubCategoryName] || 1;

    const payload = {
      property_type_id: 1,
      property_type_slug: mapPurposeToSlug(selectedPurpose),
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
      features: autoFeatureList,
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
          onPersistChatState={setChatbotSession}
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
            setChatbotSession({ messages: [], draft: null });
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
            setChatbotSession({ messages: [], draft: null });
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
            setChatbotSession({
              messages: buildChatbotMessagesFromCurrentState(),
              draft: buildChatbotDraftFromCurrentState(),
            });
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
