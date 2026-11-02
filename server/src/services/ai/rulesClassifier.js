// BASELINE: transparent keyword rules. This is NOT machine learning.
// Each category has weighted patterns; the category with the highest total wins. Priority comes from
// the category default, raised by high-risk wording and lowered by words like "minor". Every result lists
// the words that caused it, so the decision can be explained.
export const RULES_VERSION = 'rules-v1';

const r = (re, w = 1) => ({ re, w });

const CATEGORY_RULES = {
  Fire: [
    r(/\bfires?\b/i, 3), r(/\bflames?\b/i, 3), r(/\bburn(?:ing|t|ed|s)?\b/i, 3), r(/\bsmok(?:e|ing|y)\b/i, 2),
    r(/\bblaze\b/i, 3), r(/\b(?:sparks?|sparking)\b/i, 1), r(/\bshort[- ]?circuit\b/i, 2),
    r(/\b(?:explosion|blast)\b/i, 2), r(/\bextinguisher\b/i, 2),
  ],
  Medical: [
    r(/\b(?:injur(?:ed|y|ies)|hurt|wound(?:ed)?)\b/i, 2), r(/\b(?:bleed(?:ing)?|blood)\b/i, 3),
    r(/\b(?:unconscious|unresponsive|fainted|fainting|faint|passed out|not responding)\b/i, 3),
    r(/\b(?:chest pain|heart attack|cardiac)\b/i, 3), r(/\b(?:seizure|fits|epilep\w*)\b/i, 3),
    r(/\b(?:breathing|breathless|asthma|inhaler)\b/i, 3), r(/\b(?:ambulance|doctor|nurse|first aid|medical|hospital)\b/i, 3),
    r(/\b(?:snake ?bite|bitten|allergic|allergy|poison\w*|overdose)\b/i, 3),
    r(/\b(?:fever|vomit\w*|dizzy|weak|nausea|headache|sick|ill|unwell|pain)\b/i, 2),
    r(/\b(?:fractur\w*|broken (?:arm|leg|bone|wrist|hand)|broke (?:his|her|my|the) (?:arm|leg|wrist|hand))\b/i, 3),
    r(/\b(?:cut|collapsed)\b/i, 1),
  ],
  Accident: [
    r(/\baccident\b/i, 3), r(/\b(?:crash(?:ed|es)?|collid(?:ed|es|ing)|collision)\b/i, 3),
    r(/\b(?:skid(?:ded)?|overturn(?:ed)?|rammed|ran over|run over|knocked down|hit and run)\b/i, 3), r(/\blost control\b/i, 2),
    r(/\b(?:cars?|bikes?|trucks?|bus|buses|scooters?|autos?|lorry|vehicles?|cyclist|motorcycle|two[- ]wheeler|pedestrian)\b/i, 1),
    r(/\bpedestrian\b/i, 1), r(/\b(?:fell|fallen|slipped)\b/i, 1),
  ],
  Security: [
    r(/\b(?:stole|stolen|steal|thief|theft|robbery|robbed|burglar\w*|snatch\w*|pickpocket\w*)\b/i, 3),
    r(/\b(?:fight(?:ing)?|fought|assault(?:ed)?|attack(?:ed|ing)?|beat(?:ing)?|beaten)\b/i, 2),
    r(/\b(?:harass\w*|stalk\w*|followed|eve[- ]?teas\w*|ragging|bully\w*|molest\w*|misbehav\w*)\b/i, 3),
    r(/\b(?:threat\w*|weapon|knife|gun|pistol|firing|shooting)\b/i, 3),
    r(/\b(?:intruder|trespass\w*|stranger|suspicious|unknown (?:man|person|people|guy|men)|roaming|unauthori[sz]ed)\b/i, 3),
    r(/\b(?:missing|lost) (?:child|boy|girl|student|person|kid)\b/i, 3), r(/\b(?:kidnap\w*|hostage|drunk)\b/i, 3),
    r(/\b(?:unsafe|scared|afraid)\b/i, 2), r(/\b(?:break[- ]?in|breaking in|trying to break)\b/i, 3),
  ],
  Infrastructure: [
    r(/\b(?:power (?:cut|outage|failure)|no (?:electricity|power|water supply|water)|blackout|load shedding)\b/i, 3),
    r(/\b(?:pipe (?:burst|broke|broken)|burst pipe|water main|pipeline)\b/i, 3),
    r(/\b(?:pothole|road (?:damage|damaged|caved)|bridge)\b/i, 3),
    r(/\b(?:cracks?|cracked)\b.*\b(?:wall|building|roof|ceiling|pillar)\b|\b(?:wall|building|roof|ceiling|pillar)\b.*\b(?:cracks?|cracked)\b/i, 3),
    r(/\b(?:building|wall|roof|ceiling|structure) (?:collapse\w*|caved)\b|\bceiling (?:is )?(?:falling|fell)\b/i, 3),
    r(/\b(?:transformer|electric pole|electricity pole|live wire|fallen wire|hanging wire|power line)\b/i, 3),
    r(/\b(?:sewage|drain(?:age)?|manhole|sewer)\b/i, 3), r(/\b(?:flood(?:ed|ing)?|waterlogg\w*)\b/i, 2),
    r(/\b(?:gas leak|gas leakage|gas smell)\b/i, 3), r(/\b(?:tree (?:fell|fallen)|fallen tree)\b/i, 3),
    r(/\b(?:wifi|wi-fi|internet|network) (?:is )?down\b/i, 2),
  ],
  Maintenance: [
    r(/\b(?:tube ?lights?|bulbs?|lights?|fans?|taps?|faucet|ac|air conditioner|lift|elevator|door|window|lock|bench(?:es)?|chairs?|tables?|projector|switch(?:es)?|sockets?|toilet|washroom|restroom|flush|dustbins?|bins?|board|desk|geyser|cooler)\b/i, 2),
    r(/\b(?:not working|doesn'?t work|does not work|broken|damaged|out of order|stuck|jammed|clogged|leaking|dripping|peeling|repair|replace|faulty|noisy|wobbling)\b/i, 1),
    r(/\b(?:garbage|trash|dirty|unclean|cleaning|clean|litter|overflowing|smells? bad|dust)\b/i, 2),
  ],
};

// When two categories have the same score, the one listed first wins (safety first).
const TIE_ORDER = ['Medical', 'Fire', 'Security', 'Accident', 'Infrastructure', 'Maintenance'];
const DEFAULT_PRIORITY = { Fire: 'High', Medical: 'Medium', Accident: 'Medium', Security: 'Medium', Infrastructure: 'Medium', Maintenance: 'Low', Other: 'Low' };
const LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const CRITICAL = [
  /\b(?:not breathing|stopped breathing|difficulty breathing|trouble breathing|can'?t breathe|unconscious|unresponsive|not responding)\b/i,
  /\b(?:heavy|severe|profuse)(?:ly)? bleeding\b|\bbleeding (?:heavily|badly|a lot|profusely)\b/i,
  /\b(?:trapped|explosion|blast|stampede|hostage|kidnap\w*|knife|gun|pistol|firing|shooting|live wire|electrocut\w*|drown\w*|cardiac|heart attack|building collapse\w*)\b/i,
];
const HIGH = [
  /\b(?:injur\w*|bleed\w*|blood|fractur\w*|broken (?:arm|leg|bone)|broke (?:his|her|my|the) (?:arm|leg)|chest pain|seizure|fits|asthma|faint\w*|passed out|snake|overdose|poison\w*|ambulance)\b/i,
  /\b(?:people|persons?|students?|children|kids?|someone|staff) (?:are |is |were )?(?:still )?inside\b/i,
  /\b(?:overturned|pedestrian|knocked down|rammed|hit and run|lost control)\b/i,
  /\b(?:fight\w*|assault\w*|robbery|robbed|stalk\w*|followed|harass\w*|ragging|molest\w*|threat\w*|lost child|missing (?:child|boy|girl|student|person|kid)|trying to break|break[- ]?in|intruder|unknown (?:man|person|people|guy|men)|roaming|unsafe)\b/i,
  /\b(?:gas leak|gas leakage|flash flood|heavy flooding|submerged|manhole|ceiling (?:is )?falling|collapse\w*)\b/i,
];
const MINOR = /\b(?:minor|small|slight(?:ly)?|scratch\w*|scrape\w*|bruise\w*|mostly out|already out|under control)\b/i;

const firstMatch = (re, text) => { const m = text.match(re); return m ? m[0].toLowerCase() : null; };
const raise = (cur, to) => (LEVELS.indexOf(to) > LEVELS.indexOf(cur) ? to : cur);

export function classifyWithRules({ description = '', locationDescription = '', isUrgent = false } = {}) {
  const text = String(description);

  const scores = {};
  const found = {};
  for (const [cat, rules] of Object.entries(CATEGORY_RULES)) {
    scores[cat] = 0;
    found[cat] = [];
    for (const { re, w } of rules) {
      const hit = firstMatch(re, text);
      if (hit) { scores[cat] += w; found[cat].push(hit); }
    }
  }
  let category = 'Other';
  let best = 0;
  for (const cat of TIE_ORDER) if (scores[cat] > best) { best = scores[cat]; category = cat; }

  let priority = DEFAULT_PRIORITY[category];
  const why = [];
  let critical = null;
  for (const re of CRITICAL) { const h = firstMatch(re, text); if (h) { critical = h; break; } }
  let high = null;
  for (const re of HIGH) { const h = firstMatch(re, text); if (h) { high = h; break; } }
  if (critical) { priority = raise(priority, 'Critical'); why.push(`life-threatening wording ("${critical}")`); }
  else if (high) { priority = raise(priority, 'High'); why.push(`high-risk wording ("${high}")`); }
  else why.push(`default for ${category}`);
  const minor = firstMatch(MINOR, text);
  if (!critical && priority === 'High' && minor) { priority = 'Medium'; why.push(`lowered because of "${minor}"`); }
  if (isUrgent && priority === 'Low') { priority = 'Medium'; why.push('raised because the reporter marked it urgent'); }

  const place = String(locationDescription || '').trim();
  const terms = [...new Set(found[category] || [])].slice(0, 4);
  const summary = category === 'Other'
    ? `Incident reported${place ? ` near ${place}` : ''}; the category is unclear.`
    : `Possible ${category.toLowerCase()} incident reported${place ? ` near ${place}` : ''}.`;
  const reason = category === 'Other'
    ? 'No keywords for a known category were found, so the report needs a human to classify it.'
    : `Keywords found: ${terms.map((t) => `"${t}"`).join(', ')}. Priority ${priority}: ${why.join('; ')}.`;

  return { category, priority, summary, reason, method: RULES_VERSION };
}
