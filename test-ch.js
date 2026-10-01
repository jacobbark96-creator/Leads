function cleanString(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeCommonWords(str) {
  const common = ['ltd', 'limited', 'plc', 'llp', 'co', 'company', 'uk', 'group'];
  return str.split(' ').filter(w => !common.includes(w)).join(' ');
}

const companyName = 'Terence Birt Tractors';
const location = 'Braintree';

const items = [
  {
    "title": "AARON TERENCE HUGHES LTD",
    "address_snippet": "57 Waybridge Industrial Estate, Daniel Adamson Road, Salford, England, M50 1DS"
  },
  {
    "title": "TERENCE BIRT TRACTORS LIMITED",
    "address_snippet": "Some Farm, Braintree, Essex"
  }
];

const leadNameClean = removeCommonWords(cleanString(companyName));
const leadLocationClean = cleanString(location || '');

let bestMatch = null;
let highestScore = 0;

for (const item of items) {
  const itemTitleClean = removeCommonWords(cleanString(item.title));
  const itemAddressClean = cleanString(item.address_snippet || '');

  let score = 0;
  
  if (itemTitleClean === leadNameClean && leadNameClean.length > 0) {
    score += 100;
  } else {
    const leadWords = leadNameClean.split(' ').filter(w => w.length > 1);
    const itemWords = itemTitleClean.split(' ').filter(w => w.length > 1);
    let matches = 0;
    for (const w of leadWords) {
      if (itemWords.includes(w)) matches++;
    }
    
    if (leadWords.length > 0 && matches === leadWords.length) {
      score += 80;
    } else if (leadWords.length > 0 && matches / leadWords.length >= 0.5) {
      score += 40;
    }
  }

  if (leadLocationClean && itemAddressClean) {
    const locWords = leadLocationClean.split(' ').filter(w => w.length > 2);
    const addressWords = itemAddressClean.split(' ');
    let locMatches = 0;
    for (const w of locWords) {
      if (addressWords.includes(w)) locMatches++;
    }
    if (locWords.length > 0 && locMatches > 0) {
      score += 30;
    }
  }

  console.log(`Item: ${item.title}, Score: ${score}`);

  if (score > highestScore) {
    highestScore = score;
    bestMatch = item;
  }
}

console.log('Best match:', bestMatch?.title, 'Score:', highestScore);
