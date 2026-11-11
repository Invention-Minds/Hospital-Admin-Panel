/**
 * Patient-facing text for the feedback survey (/feedback/k/:token) and the
 * walk-up start page (/feedback/new) in English, Kannada, Malayalam and Hindi.
 *
 * The Kannada / Malayalam / Hindi wording is a first draft — have a native
 * speaker at the hospital review it before patients see it. Keys must exist
 * in every language (the `Strings` type enforces it). Server error messages
 * (rate limits, wrong OTP) are still English.
 */

export type FeedbackLang = 'en' | 'kn' | 'ml' | 'hi';

export const FEEDBACK_LANGS: Array<{ code: FeedbackLang; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'hi', label: 'हिन्दी' },
];

/** Keys must match the backend's CHOICE_REASONS. */
export const CHOICE_REASON_KEYS = [
  'doctor', 'recommended', 'previous_visit', 'near_home', 'insurance', 'cost', 'facilities', 'emergency',
] as const;

const en = {
  language: 'Language',
  loading: 'Loading your survey…',
  sorry: "We're sorry",
  invalidLink: 'This survey link is no longer valid.',
  expiredLink: 'This survey link has expired.',
  thanks: 'Thank you',
  thanksSub: 'Your feedback helps us care for you better.',
  reviewAsk: 'Would you share your experience on Google? It helps other patients choose with confidence.',
  reviewBtn: 'Write a Google review',
  title: 'How was your visit?',
  forName: 'For',
  npsQ: 'How likely are you to recommend us to a friend or family member?',
  notLikely: 'Not at all likely',
  veryLikely: 'Extremely likely',
  youPicked: 'You picked',
  scoreLow: 'Not likely',
  scoreMid: 'Maybe',
  scoreHigh: 'Very likely',
  rateQ: 'Rate each part of your visit (optional)',
  outOf: 'of 5',
  cat: {
    doctor: 'Doctor', nursing: 'Nursing care', staff: 'Front desk & staff', cleanliness: 'Cleanliness',
    waitingTime: 'Waiting time', billing: 'Billing', food: 'Food', facilities: 'Facilities',
  },
  reasonsQ: 'What made you choose us? (optional)',
  reason: {
    doctor: 'The doctor', recommended: 'Someone recommended you', previous_visit: "I've been here before",
    near_home: 'Close to home', insurance: 'Insurance / cashless', cost: 'Affordable', facilities: 'Facilities',
    emergency: 'It was an emergency',
  },
  commentsLabel: 'Anything we should know? (optional)',
  commentsPh: 'Tell us in your own words…',
  submit: 'Submit',
  submitting: 'Submitting…',
  pickScore: 'Please pick a score from 0 to 10.',
  submitError: 'Could not submit — please try again.',
  // Walk-up start page
  startTitle: 'Share your feedback',
  startSub: "It takes less than a minute. We'll send a one-time code to the phone number registered with your PRN.",
  prnLabel: 'Your PRN',
  prnPh: 'e.g. 102345',
  visitQ: 'What was your visit for?',
  visit: {
    opd: 'OPD consultation', ipd: 'Inpatient stay', er: 'Emergency visit', 'day-care': 'Day-care procedure', general: 'Something else',
  },
  sendOtp: 'Send OTP',
  sendingOtp: 'Sending OTP…',
  prnHelp: "Don't know your PRN? It's printed on your registration slip — or ask a staff member.",
  otpSub: 'Enter the 6-digit code we sent by SMS. It is valid for 2 minutes.',
  otpLabel: 'One-time code',
  verify: 'Verify & continue',
  verifying: 'Verifying…',
  resendIn: 'Resend OTP in {s}s',
  resend: 'Resend OTP',
  changePrn: 'Change PRN',
  otpSentTo: 'OTP sent to',
  otpSentRecord: 'OTP sent to the phone on record',
  prnInvalid: 'Please enter your PRN (numbers only).',
  otpInvalid: 'Please enter the 6-digit OTP.',
};

export type FeedbackStrings = typeof en;

const kn: FeedbackStrings = {
  language: 'ಭಾಷೆ',
  loading: 'ನಿಮ್ಮ ಸಮೀಕ್ಷೆ ತೆರೆಯುತ್ತಿದೆ…',
  sorry: 'ಕ್ಷಮಿಸಿ',
  invalidLink: 'ಈ ಸಮೀಕ್ಷೆಯ ಲಿಂಕ್ ಈಗ ಮಾನ್ಯವಾಗಿಲ್ಲ.',
  expiredLink: 'ಈ ಸಮೀಕ್ಷೆಯ ಲಿಂಕ್‌ನ ಅವಧಿ ಮುಗಿದಿದೆ.',
  thanks: 'ಧನ್ಯವಾದಗಳು',
  thanksSub: 'ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ನಿಮಗೆ ಇನ್ನೂ ಉತ್ತಮ ಆರೈಕೆ ನೀಡಲು ನಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
  reviewAsk: 'ನಿಮ್ಮ ಅನುಭವವನ್ನು Google ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳುವಿರಾ? ಇದು ಇತರ ರೋಗಿಗಳಿಗೆ ವಿಶ್ವಾಸದಿಂದ ಆಯ್ಕೆ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
  reviewBtn: 'Google ನಲ್ಲಿ ವಿಮರ್ಶೆ ಬರೆಯಿರಿ',
  title: 'ನಿಮ್ಮ ಭೇಟಿ ಹೇಗಿತ್ತು?',
  forName: 'ರೋಗಿ:',
  npsQ: 'ನಮ್ಮ ಆಸ್ಪತ್ರೆಯನ್ನು ನಿಮ್ಮ ಸ್ನೇಹಿತರು ಅಥವಾ ಕುಟುಂಬದವರಿಗೆ ಶಿಫಾರಸು ಮಾಡುವ ಸಾಧ್ಯತೆ ಎಷ್ಟು?',
  notLikely: 'ಸಾಧ್ಯತೆ ಇಲ್ಲವೇ ಇಲ್ಲ',
  veryLikely: 'ಖಂಡಿತ ಶಿಫಾರಸು ಮಾಡುತ್ತೇನೆ',
  youPicked: 'ನೀವು ಆಯ್ಕೆ ಮಾಡಿದ್ದು',
  scoreLow: 'ಸಾಧ್ಯತೆ ಕಡಿಮೆ',
  scoreMid: 'ಬಹುಶಃ',
  scoreHigh: 'ಖಂಡಿತ',
  rateQ: 'ನಿಮ್ಮ ಭೇಟಿಯ ಪ್ರತಿಯೊಂದು ಅಂಶಕ್ಕೂ ರೇಟಿಂಗ್ ನೀಡಿ (ಐಚ್ಛಿಕ)',
  outOf: '5 ರಲ್ಲಿ',
  cat: {
    doctor: 'ವೈದ್ಯರು', nursing: 'ನರ್ಸಿಂಗ್ ಆರೈಕೆ', staff: 'ಸ್ವಾಗತ ಕೌಂಟರ್ ಮತ್ತು ಸಿಬ್ಬಂದಿ', cleanliness: 'ಸ್ವಚ್ಛತೆ',
    waitingTime: 'ಕಾಯುವ ಸಮಯ', billing: 'ಬಿಲ್ಲಿಂಗ್', food: 'ಊಟ', facilities: 'ಸೌಲಭ್ಯಗಳು',
  },
  reasonsQ: 'ನೀವು ನಮ್ಮನ್ನು ಏಕೆ ಆಯ್ಕೆ ಮಾಡಿದಿರಿ? (ಐಚ್ಛಿಕ)',
  reason: {
    doctor: 'ವೈದ್ಯರ ಕಾರಣದಿಂದ', recommended: 'ಯಾರೋ ಶಿಫಾರಸು ಮಾಡಿದರು', previous_visit: 'ಹಿಂದೆಯೂ ಇಲ್ಲಿಗೆ ಬಂದಿದ್ದೆ',
    near_home: 'ಮನೆಗೆ ಹತ್ತಿರ', insurance: 'ವಿಮೆ / ನಗದುರಹಿತ ಸೌಲಭ್ಯ', cost: 'ಕೈಗೆಟುಕುವ ವೆಚ್ಚ', facilities: 'ಸೌಲಭ್ಯಗಳು',
    emergency: 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ',
  },
  commentsLabel: 'ನಾವು ತಿಳಿದುಕೊಳ್ಳಬೇಕಾದದ್ದು ಏನಾದರೂ ಇದೆಯೇ? (ಐಚ್ಛಿಕ)',
  commentsPh: 'ನಿಮ್ಮ ಮಾತುಗಳಲ್ಲಿ ತಿಳಿಸಿ…',
  submit: 'ಸಲ್ಲಿಸಿ',
  submitting: 'ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ…',
  pickScore: 'ದಯವಿಟ್ಟು 0 ರಿಂದ 10 ರ ನಡುವೆ ಒಂದು ಅಂಕ ಆಯ್ಕೆಮಾಡಿ.',
  submitError: 'ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ — ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  startTitle: 'ನಿಮ್ಮ ಅಭಿಪ್ರಾಯ ಹಂಚಿಕೊಳ್ಳಿ',
  startSub: 'ಇದಕ್ಕೆ ಒಂದು ನಿಮಿಷಕ್ಕಿಂತ ಕಡಿಮೆ ಸಮಯ ಸಾಕು. ನಿಮ್ಮ PRN ನೊಂದಿಗೆ ನೋಂದಾಯಿಸಿದ ಫೋನ್ ಸಂಖ್ಯೆಗೆ ನಾವು ಒಂದು ಬಾರಿಯ ಕೋಡ್ (OTP) ಕಳುಹಿಸುತ್ತೇವೆ.',
  prnLabel: 'ನಿಮ್ಮ PRN',
  prnPh: 'ಉದಾ. 102345',
  visitQ: 'ನಿಮ್ಮ ಭೇಟಿ ಯಾವುದಕ್ಕಾಗಿ?',
  visit: {
    opd: 'OPD ಸಮಾಲೋಚನೆ', ipd: 'ಒಳರೋಗಿಯಾಗಿ ದಾಖಲು', er: 'ತುರ್ತು ಚಿಕಿತ್ಸೆ', 'day-care': 'ಡೇ-ಕೇರ್ ಚಿಕಿತ್ಸೆ', general: 'ಬೇರೆ ಏನಾದರೂ',
  },
  sendOtp: 'OTP ಕಳುಹಿಸಿ',
  sendingOtp: 'OTP ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…',
  prnHelp: 'ನಿಮ್ಮ PRN ಗೊತ್ತಿಲ್ಲವೇ? ಅದು ನಿಮ್ಮ ನೋಂದಣಿ ಚೀಟಿಯಲ್ಲಿ ಮುದ್ರಿತವಾಗಿದೆ — ಅಥವಾ ಸಿಬ್ಬಂದಿಯನ್ನು ಕೇಳಿ.',
  otpSub: 'SMS ಮೂಲಕ ಕಳುಹಿಸಿದ 6 ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ. ಇದು 2 ನಿಮಿಷಗಳವರೆಗೆ ಮಾನ್ಯ.',
  otpLabel: 'ಒಂದು ಬಾರಿಯ ಕೋಡ್ (OTP)',
  verify: 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮುಂದುವರಿಯಿರಿ',
  verifying: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…',
  resendIn: 'OTP ಮತ್ತೆ ಕಳುಹಿಸಲು {s} ಸೆಕೆಂಡು',
  resend: 'OTP ಮತ್ತೆ ಕಳುಹಿಸಿ',
  changePrn: 'PRN ಬದಲಿಸಿ',
  otpSentTo: 'OTP ಕಳುಹಿಸಲಾಗಿದೆ:',
  otpSentRecord: 'ನೋಂದಾಯಿತ ಫೋನ್‌ಗೆ OTP ಕಳುಹಿಸಲಾಗಿದೆ',
  prnInvalid: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ PRN ನಮೂದಿಸಿ (ಅಂಕಿಗಳು ಮಾತ್ರ).',
  otpInvalid: 'ದಯವಿಟ್ಟು 6 ಅಂಕಿಯ OTP ನಮೂದಿಸಿ.',
};

const ml: FeedbackStrings = {
  language: 'ഭാഷ',
  loading: 'നിങ്ങളുടെ സർവേ തുറക്കുന്നു…',
  sorry: 'ക്ഷമിക്കണം',
  invalidLink: 'ഈ സർവേ ലിങ്ക് ഇനി സാധുവല്ല.',
  expiredLink: 'ഈ സർവേ ലിങ്കിന്റെ കാലാവധി കഴിഞ്ഞു.',
  thanks: 'നന്ദി',
  thanksSub: 'നിങ്ങളുടെ അഭിപ്രായം നിങ്ങളെ കൂടുതൽ നന്നായി പരിചരിക്കാൻ ഞങ്ങളെ സഹായിക്കും.',
  reviewAsk: 'നിങ്ങളുടെ അനുഭവം Google-ൽ പങ്കിടാമോ? മറ്റ് രോഗികൾക്ക് ആത്മവിശ്വാസത്തോടെ തിരഞ്ഞെടുക്കാൻ ഇത് സഹായിക്കും.',
  reviewBtn: 'Google-ൽ റിവ്യൂ എഴുതുക',
  title: 'നിങ്ങളുടെ സന്ദർശനം എങ്ങനെയുണ്ടായിരുന്നു?',
  forName: 'രോഗി:',
  npsQ: 'ഞങ്ങളുടെ ആശുപത്രി ഒരു സുഹൃത്തിനോ കുടുംബാംഗത്തിനോ ശുപാർശ ചെയ്യാൻ എത്രത്തോളം സാധ്യതയുണ്ട്?',
  notLikely: 'ഒട്ടും സാധ്യതയില്ല',
  veryLikely: 'തീർച്ചയായും ശുപാർശ ചെയ്യും',
  youPicked: 'നിങ്ങൾ തിരഞ്ഞെടുത്തത്',
  scoreLow: 'സാധ്യത കുറവ്',
  scoreMid: 'ഒരുപക്ഷേ',
  scoreHigh: 'തീർച്ചയായും',
  rateQ: 'നിങ്ങളുടെ സന്ദർശനത്തിന്റെ ഓരോ ഭാഗത്തിനും റേറ്റിംഗ് നൽകുക (നിർബന്ധമില്ല)',
  outOf: '5-ൽ',
  cat: {
    doctor: 'ഡോക്ടർ', nursing: 'നഴ്സിംഗ് പരിചരണം', staff: 'റിസപ്ഷനും ജീവനക്കാരും', cleanliness: 'ശുചിത്വം',
    waitingTime: 'കാത്തിരിപ്പ് സമയം', billing: 'ബില്ലിംഗ്', food: 'ഭക്ഷണം', facilities: 'സൗകര്യങ്ങൾ',
  },
  reasonsQ: 'നിങ്ങൾ ഞങ്ങളെ തിരഞ്ഞെടുത്തത് എന്തുകൊണ്ട്? (നിർബന്ധമില്ല)',
  reason: {
    doctor: 'ഡോക്ടർ കാരണം', recommended: 'ആരോ ശുപാർശ ചെയ്തു', previous_visit: 'മുമ്പും ഇവിടെ വന്നിട്ടുണ്ട്',
    near_home: 'വീടിന് അടുത്ത്', insurance: 'ഇൻഷുറൻസ് / ക്യാഷ്‌ലെസ്', cost: 'താങ്ങാവുന്ന ചെലവ്', facilities: 'സൗകര്യങ്ങൾ',
    emergency: 'അടിയന്തര സാഹചര്യം',
  },
  commentsLabel: 'ഞങ്ങൾ അറിയേണ്ട എന്തെങ്കിലും ഉണ്ടോ? (നിർബന്ധമില്ല)',
  commentsPh: 'നിങ്ങളുടെ വാക്കുകളിൽ പറയൂ…',
  submit: 'സമർപ്പിക്കുക',
  submitting: 'സമർപ്പിക്കുന്നു…',
  pickScore: 'ദയവായി 0 മുതൽ 10 വരെ ഒരു സ്കോർ തിരഞ്ഞെടുക്കുക.',
  submitError: 'സമർപ്പിക്കാൻ കഴിഞ്ഞില്ല — ദയവായി വീണ്ടും ശ്രമിക്കുക.',
  startTitle: 'നിങ്ങളുടെ അഭിപ്രായം പങ്കിടുക',
  startSub: 'ഇതിന് ഒരു മിനിറ്റിൽ താഴെ മതി. നിങ്ങളുടെ PRN-നൊപ്പം രജിസ്റ്റർ ചെയ്ത ഫോൺ നമ്പറിലേക്ക് ഞങ്ങൾ ഒരു ഒറ്റത്തവണ കോഡ് (OTP) അയയ്ക്കും.',
  prnLabel: 'നിങ്ങളുടെ PRN',
  prnPh: 'ഉദാ. 102345',
  visitQ: 'നിങ്ങളുടെ സന്ദർശനം എന്തിനായിരുന്നു?',
  visit: {
    opd: 'OPD കൺസൾട്ടേഷൻ', ipd: 'കിടത്തിച്ചികിത്സ', er: 'അത്യാഹിത വിഭാഗം', 'day-care': 'ഡേ-കെയർ ചികിത്സ', general: 'മറ്റെന്തെങ്കിലും',
  },
  sendOtp: 'OTP അയയ്ക്കുക',
  sendingOtp: 'OTP അയയ്ക്കുന്നു…',
  prnHelp: 'നിങ്ങളുടെ PRN അറിയില്ലേ? അത് നിങ്ങളുടെ രജിസ്ട്രേഷൻ സ്ലിപ്പിൽ അച്ചടിച്ചിട്ടുണ്ട് — അല്ലെങ്കിൽ ജീവനക്കാരോട് ചോദിക്കുക.',
  otpSub: 'SMS വഴി അയച്ച 6 അക്ക കോഡ് നൽകുക. ഇത് 2 മിനിറ്റ് വരെ സാധുവാണ്.',
  otpLabel: 'ഒറ്റത്തവണ കോഡ് (OTP)',
  verify: 'സ്ഥിരീകരിച്ച് തുടരുക',
  verifying: 'സ്ഥിരീകരിക്കുന്നു…',
  resendIn: '{s} സെക്കൻഡിനുള്ളിൽ OTP വീണ്ടും അയയ്ക്കാം',
  resend: 'OTP വീണ്ടും അയയ്ക്കുക',
  changePrn: 'PRN മാറ്റുക',
  otpSentTo: 'OTP അയച്ചത്:',
  otpSentRecord: 'രജിസ്റ്റർ ചെയ്ത ഫോണിലേക്ക് OTP അയച്ചു',
  prnInvalid: 'ദയവായി നിങ്ങളുടെ PRN നൽകുക (അക്കങ്ങൾ മാത്രം).',
  otpInvalid: 'ദയവായി 6 അക്ക OTP നൽകുക.',
};

const hi: FeedbackStrings = {
  language: 'भाषा',
  loading: 'आपका सर्वे खुल रहा है…',
  sorry: 'क्षमा करें',
  invalidLink: 'यह सर्वे लिंक अब मान्य नहीं है।',
  expiredLink: 'इस सर्वे लिंक की अवधि समाप्त हो गई है।',
  thanks: 'धन्यवाद',
  thanksSub: 'आपकी प्रतिक्रिया से हमें आपकी और बेहतर देखभाल करने में मदद मिलती है।',
  reviewAsk: 'क्या आप अपना अनुभव Google पर साझा करेंगे? इससे दूसरे मरीज़ों को भरोसे के साथ चुनने में मदद मिलती है।',
  reviewBtn: 'Google पर समीक्षा लिखें',
  title: 'आपका अनुभव कैसा रहा?',
  forName: 'मरीज़:',
  npsQ: 'आप हमारे अस्पताल की सिफ़ारिश किसी मित्र या परिवार के सदस्य से करने की कितनी संभावना रखते हैं?',
  notLikely: 'बिल्कुल संभावना नहीं',
  veryLikely: 'निश्चित रूप से करेंगे',
  youPicked: 'आपने चुना',
  scoreLow: 'कम संभावना',
  scoreMid: 'शायद',
  scoreHigh: 'निश्चित रूप से',
  rateQ: 'अपने अनुभव के हर हिस्से को रेटिंग दें (वैकल्पिक)',
  outOf: '5 में से',
  cat: {
    doctor: 'डॉक्टर', nursing: 'नर्सिंग देखभाल', staff: 'रिसेप्शन और स्टाफ़', cleanliness: 'साफ़-सफ़ाई',
    waitingTime: 'प्रतीक्षा समय', billing: 'बिलिंग', food: 'भोजन', facilities: 'सुविधाएँ',
  },
  reasonsQ: 'आपने हमें क्यों चुना? (वैकल्पिक)',
  reason: {
    doctor: 'डॉक्टर की वजह से', recommended: 'किसी ने सुझाव दिया', previous_visit: 'पहले भी यहाँ आ चुके हैं',
    near_home: 'घर के पास', insurance: 'बीमा / कैशलेस सुविधा', cost: 'किफ़ायती खर्च', facilities: 'सुविधाएँ',
    emergency: 'आपातकालीन स्थिति',
  },
  commentsLabel: 'क्या कुछ ऐसा है जो हमें जानना चाहिए? (वैकल्पिक)',
  commentsPh: 'अपने शब्दों में बताएँ…',
  submit: 'जमा करें',
  submitting: 'जमा हो रहा है…',
  pickScore: 'कृपया 0 से 10 के बीच कोई अंक चुनें।',
  submitError: 'जमा नहीं हो सका — कृपया फिर से कोशिश करें।',
  startTitle: 'अपनी प्रतिक्रिया साझा करें',
  startSub: 'इसमें एक मिनट से भी कम समय लगता है। हम आपके PRN से पंजीकृत फ़ोन नंबर पर एक बार का कोड (OTP) भेजेंगे।',
  prnLabel: 'आपका PRN',
  prnPh: 'जैसे 102345',
  visitQ: 'आप किस लिए आए थे?',
  visit: {
    opd: 'OPD परामर्श', ipd: 'भर्ती (इनपेशेंट)', er: 'आपातकालीन उपचार', 'day-care': 'डे-केयर प्रक्रिया', general: 'कुछ और',
  },
  sendOtp: 'OTP भेजें',
  sendingOtp: 'OTP भेजा जा रहा है…',
  prnHelp: 'अपना PRN नहीं पता? यह आपकी पंजीकरण पर्ची पर छपा है — या किसी स्टाफ़ सदस्य से पूछें।',
  otpSub: 'SMS से भेजा गया 6 अंकों का कोड दर्ज करें। यह 2 मिनट तक मान्य है।',
  otpLabel: 'एक बार का कोड (OTP)',
  verify: 'सत्यापित करें और आगे बढ़ें',
  verifying: 'सत्यापित किया जा रहा है…',
  resendIn: '{s} सेकंड में OTP फिर से भेजें',
  resend: 'OTP फिर से भेजें',
  changePrn: 'PRN बदलें',
  otpSentTo: 'OTP भेजा गया:',
  otpSentRecord: 'पंजीकृत फ़ोन पर OTP भेजा गया',
  prnInvalid: 'कृपया अपना PRN दर्ज करें (केवल अंक)।',
  otpInvalid: 'कृपया 6 अंकों का OTP दर्ज करें।',
};

export const FEEDBACK_STRINGS: Record<FeedbackLang, FeedbackStrings> = { en, kn, ml, hi };

export function isFeedbackLang(v: unknown): v is FeedbackLang {
  return v === 'en' || v === 'kn' || v === 'ml' || v === 'hi';
}

/** Browser language when it is one we support, else English. SSR-safe. */
export function browserFeedbackLang(): FeedbackLang {
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '').slice(0, 2).toLowerCase() : '';
  return isFeedbackLang(nav) ? nav : 'en';
}
