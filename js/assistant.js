/**
 * Lavet Wellness Shopping Assistant
 * Goal-based recommendations + voice assistance trained on the product catalog.
 * Languages: English, Afrikaans, Shona
 * Wake word: "Lavet" / "Hey Lavet" (+ AF/SN variants)
 * Panel collapses only after inactivity (no clicks / no mic activity).
 */
(function () {
  const STORAGE_KEY = "lavet_assistant_seen";
  const LANG_KEY = "lavet_assistant_lang";
  const DELAY_MS = 1800;
  /* Collapse ONLY after true inactivity (no clicks / no mic). Never right after results. */
  const INACTIVITY_COLLAPSE_MS = 45000;

  // Wake patterns (all languages)
  const WAKE_PATTERNS = [
    /\bhey\s+lavet\b/i,
    /\bok(?:ay)?\s+lavet\b/i,
    /\bhi\s+lavet\b/i,
    /\bhallo\s+lavet\b/i,
    /\bhaai\s+lavet\b/i,
    /\bgoeiedag\s+lavet\b/i,
    /\bmhoro\s+lavet\b/i,
    /\bkwazi\s+lavet\b/i,
    /\blavet\b/i
  ];

  let collapseTimer = null;
  let recognition = null;
  let isListening = false;
  let listenSession = 0; // increments so late events from a dead recognizer are ignored
  let listenCooldownUntil = 0;
  let panelEl = null;
  let fabEl = null;
  let bodyEl = null;
  let neonScene = null;
  let currentLang = loadLang(); // 'en' | 'af' | 'sn'

  const LANG_META = {
    en: { label: "English", speech: "en-ZA", flag: "EN" },
    af: { label: "Afrikaans", speech: "af-ZA", flag: "AF" },
    sn: { label: "Shona", speech: "en-ZA", flag: "SN" } // SN often falls back to en recognition; keywords still match
  };

  // ——— Product pitches (EN / AF / SN) ———
  const PRODUCT_PITCHES = {
    1: {
      en: "Ashwagandha Calm Complex is our adaptogenic blend for stress resilience and calm focus. Sixty capsules.",
      af: "Ashwagandha Calm Complex is ons adaptogene mengsel vir stresweerstandigheid en kalm fokus. Sestig kapsules.",
      sn: "Ashwagandha Calm Complex ndiyo mixture yedu inobatsira kudzivirira stress uye kuva ne focus yakanyarara. Capsules makumi matanhatu."
    },
    2: {
      en: "Collagen Renew Peptides support skin elasticity, hair and joint vitality. Three hundred grams of hydrolysed collagen.",
      af: "Collagen Renew Peptides ondersteun vel-elastisiteit, hare en gewrigvitaliteit. Driehonderd gram gehidroliseerde kollageen.",
      sn: "Collagen Renew Peptides inotsigira elasticity yeganda, bvudzi uye joints. Magiramu mazana matatu e collagen."
    },
    3: {
      en: "Vitamin D3 with K2 is synergistic support for bone, immune and mood balance. Sixty softgels.",
      af: "Vitamien D3 met K2 is sinergistiese ondersteuning vir bene, immuniteit en bui. Sestig sagte gel-kapsules.",
      sn: "Vitamin D3 ne K2 inotsigira mapfupa, immune system uye mood. Softgels makumi matanhatu."
    },
    4: {
      en: "Magnesium Glycinate Night is highly absorbable magnesium for deeper rest and muscle recovery. Ninety capsules.",
      af: "Magnesium Glycinate Night is hoogs absorbeerbare magnesium vir dieper rus en spierherstel. Negentig kapsules.",
      sn: "Magnesium Glycinate Night magnesium inonyatso dyiwa mu muviri, inobatsira kurara zvakanaka uye recovery yemhasuru. Capsules makumi mapfumbamwe."
    },
    5: {
      en: "Omega-3 Pure Focus is molecularly distilled fish oil for brain and heart health. Sixty softgels.",
      af: "Omega-3 Pure Focus is molekulêr gedistilleerde visolie vir brein- en hartgesondheid. Sestig sagte gel-kapsules.",
      sn: "Omega-3 Pure Focus mafuta ehove akacheneswa ebrain ne heart health. Softgels makumi matanhatu."
    },
    6: {
      en: "Green Glow Vitamin C Serum is a brightening fifteen percent vitamin C with ferulic acid. Thirty millilitres.",
      af: "Green Glow Vitamien C-serum is ’n verhelderende vyftien persent vitamien C met feruliensuur. Dertig milliliter.",
      sn: "Green Glow Vitamin C Serum inochenera ganda, percent gumi neshanu vitamin C. Millilitres makumi matatu."
    },
    7: {
      en: "Hydra Barrier Repair Cream is ceramide-rich moisturiser that restores the skin barrier. Fifty millilitres.",
      af: "Hydra Barrier Repair Cream is ’n seramide-ryke vogroom wat die velversperring herstel. Vyftig milliliter.",
      sn: "Hydra Barrier Repair Cream moisturizer ine ceramides inodzorerera skin barrier. Millilitres makumi mashanu."
    },
    8: {
      en: "Calming Night Facial Oil blends rosehip, squalane and lavender for overnight nourishment. Thirty millilitres.",
      af: "Calming Night Facial Oil meng rosehip, skwaleen en laventel vir oornagvoeding. Dertig milliliter.",
      sn: "Calming Night Facial Oil inosanganisa rosehip, squalane ne lavender yekudya ganda usiku. Millilitres makumi matatu."
    },
    9: {
      en: "Matcha Morning Ritual Tea is ceremonial-grade matcha for calm energy and gentle focus. Forty grams.",
      af: "Matcha Morning Ritual Tea is seremoniële-graad matcha vir kalm energie en sagte fokus. Veertig gram.",
      sn: "Matcha Morning Ritual Tea matcha yemhando yepamusoro yesimba rakanyarara ne focus. Magiramu makumi mana."
    },
    10: {
      en: "Sleep Deep Herbal Blend combines chamomile, passionflower and lemon balm for restful nights. Fifty grams.",
      af: "Sleep Deep Herbal Blend kombineer kamille, passieblom en suurlemoenbalsem vir rustige nagte. Vyftig gram.",
      sn: "Sleep Deep Herbal Blend inosanganisa chamomile, passionflower ne lemon balm yekurara zvakanaka. Magiramu makumi mashanu."
    },
    11: {
      en: "Daily Immunity Shot Tonic is ginger, turmeric, lemon and elderberry. Two hundred fifty millilitres.",
      af: "Daily Immunity Shot Tonic is gemmer, borrie, suurlemoen en vlierbessie. Tweehonderd-en-vyftig milliliter.",
      sn: "Daily Immunity Shot Tonic ginger, turmeric, lemon ne elderberry. Millilitres mazana maviri nemakumi mashanu."
    },
    12: {
      en: "Lavender Calm Essential Oil is one hundred percent pure lavender for diffusion and topical use. Ten millilitres.",
      af: "Lavender Calm Essential Oil is honderd persent suiwer laventel vir diffusie en topiese gebruik. Tien milliliter.",
      sn: "Lavender Calm Essential Oil lavender yakachena zana muzana yekufukira nekuzora. Millilitres gumi."
    },
    13: {
      en: "Focus Citrus Diffuser Blend is sweet orange, lemon and rosemary for uplift and focus. Ten millilitres.",
      af: "Focus Citrus Diffuser Blend is soetlemoen, suurlemoen en roosmaryn vir opheffing en fokus. Tien milliliter.",
      sn: "Focus Citrus Diffuser Blend orange, lemon ne rosemary yekusimudzira mood ne focus. Millilitres gumi."
    },
    14: {
      en: "Deep Restore Body Butter is whipped shea and cocoa with vanilla and frankincense. Two hundred millilitres.",
      af: "Deep Restore Body Butter is geklitste shea en kakao met vanielje en olibanum. Tweehonderd milliliter.",
      sn: "Deep Restore Body Butter shea ne cocoa butter ne vanilla ne frankincense. Millilitres mazana maviri."
    },
    15: {
      en: "Mineral Recovery Bath Soak is Epsom salts, magnesium and essential oils for muscle recovery. Five hundred grams.",
      af: "Mineral Recovery Bath Soak is Epsom-sout, magnesium en essensiële olies vir spierherstel. Vyfhonderd gram.",
      sn: "Mineral Recovery Bath Soak Epsom salts, magnesium ne essential oils yekupora mhasuru. Magiramu mazana mashanu."
    },
    16: {
      en: "Plant Protein Daily Boost is complete plant protein with digestive enzymes, vanilla, five hundred grams.",
      af: "Plant Protein Daily Boost is volledige plantproteïen met spysverteringsensieme, vanielje, vyfhonderd gram.",
      sn: "Plant Protein Daily Boost protein yezvirimwa yakakwana ne digestive enzymes, vanilla, magiramu mazana mashanu."
    },
    17: {
      en: "Gut Balance Probiotic delivers ten billion CFU multi-strain support for gut harmony. Thirty capsules.",
      af: "Gut Balance Probiotic lewer tien miljard CFU multi-stam ondersteuning vir dermharmonie. Dertig kapsules.",
      sn: "Gut Balance Probiotic inopa billion gumi CFU multi-strain yekugutsira dumbu. Capsules makumi matatu."
    },
    18: {
      en: "Radiance Clay Face Mask is kaolin and rose clay for clarity and weekly glow. Sixty millilitres.",
      af: "Radiance Clay Face Mask is kaolien- en roosklei vir helderheid en weeklikse gloed. Sestig milliliter.",
      sn: "Radiance Clay Face Mask kaolin ne rose clay yekuchenura ganda ne glow yevhiki. Millilitres makumi matanhatu."
    }
  };

  function pitchFor(id) {
    const p = PRODUCT_PITCHES[id];
    if (!p) return "";
    return p[currentLang] || p.en;
  }

  // ——— Topic intents with multilingual keys + pitches ———
  const TOPIC_INTENTS = [
    {
      keys: [
        // EN
        "sleep", "insomnia", "rest", "night", "bedtime", "wind down", "wind-down",
        // AF
        "slaap", "slapeloos", "rus", "nag", "slaaptyd", "ontspan snags",
        // SN
        "hope", "kurara", "hope zvakanaka", "usiku", "kuzorora"
      ],
      goal: "well-being",
      filterGoals: ["sleep", "calm"],
      pitch: {
        en: "For better sleep, our strongest picks are Magnesium Glycinate Night and the Sleep Deep Herbal Blend. Magnesium supports deeper rest and muscle recovery; the herbal blend uses chamomile and passionflower for a gentle wind-down.",
        af: "Vir beter slaap is ons sterkste keuses Magnesium Glycinate Night en die Sleep Deep Herbal Blend. Magnesium ondersteun dieper rus en spierherstel; die kruie-mengsel gebruik kamille en passieblom vir ’n sagte aandritueel.",
        sn: "Kuti urare zvakanaka, tinokurudzira Magnesium Glycinate Night ne Sleep Deep Herbal Blend. Magnesium inobatsira kuzorora uye recovery yemhasuru; herbal blend ine chamomile ne passionflower."
      }
    },
    {
      keys: [
        "stress", "anxiety", "calm", "relax", "nervous", "overwhelm",
        "stres", "angs", "kalm", "ontspan", "gespanne",
        "kushushikana", "kudzikama", "nyarara", "kuzorora pfungwa"
      ],
      goal: "well-being",
      filterGoals: ["calm", "well-being"],
      pitch: {
        en: "For calm and stress support, try Ashwagandha Calm Complex and Lavender Calm Essential Oil. Ashwagandha builds stress resilience; lavender creates a soothing atmosphere when diffused.",
        af: "Vir kalmte en stres-ondersteuning, probeer Ashwagandha Calm Complex en Lavender Calm Essential Oil. Ashwagandha bou stresweerstandigheid; laventel skep ’n kalmerende atmosfeer wanneer dit versprei word.",
        sn: "Kuti udzikame uye ubvise stress, edza Ashwagandha Calm Complex ne Lavender Calm Essential Oil. Ashwagandha inovaka resilience; lavender inogadzira atmosphere yakanyarara."
      }
    },
    {
      keys: [
        "skin", "skincare", "glow", "face", "dry skin", "barrier", "brighten", "acne", "dull",
        "vel", "velversorging", "gloed", "gesig", "droë vel", "verhelder",
        "ganda", "kuchenura ganda", "kutenjera", "chiso", "ganda rakaoma"
      ],
      goal: "skincare",
      filterGoals: ["skincare"],
      pitch: {
        en: "For healthy, glowing skin, start with Green Glow Vitamin C Serum for brightness, Hydra Barrier Repair Cream for moisture, and Radiance Clay Face Mask once a week.",
        af: "Vir gesonde, gloeiende vel, begin met Green Glow Vitamien C-serum vir helderheid, Hydra Barrier Repair Cream vir vog, en Radiance Clay Face Mask een keer per week.",
        sn: "Kuti uve neganda rakanaka rinopenya, tanga ne Green Glow Vitamin C Serum, Hydra Barrier Repair Cream yekunyudza, uye Radiance Clay Face Mask kamwechete pasvondo."
      }
    },
    {
      keys: [
        "focus", "concentration", "brain", "study", "work", "clarity",
        "fokus", "konsentrasie", "brein", "studeer", "werk",
        "focus", "kuchengetedza pfungwa", "kudzidza", "basa"
      ],
      goal: "well-being",
      filterGoals: ["focus"],
      pitch: {
        en: "For focus and mental clarity, Omega-3 Pure Focus and Matcha Morning Ritual Tea are favourites. Omega-3 supports brain health; matcha gives calm, sustained energy without the crash.",
        af: "Vir fokus en geestelike helderheid is Omega-3 Pure Focus en Matcha Morning Ritual Tea gunstelinge. Omega-3 ondersteun breingesondheid; matcha gee kalm, volgehoue energie sonder die ineenstorting.",
        sn: "Kuti uve ne focus yakajeka, Omega-3 Pure Focus ne Matcha Morning Ritual Tea zvinodiwa. Omega-3 inotsigira brain; matcha inopa simba rakanyarara."
      }
    },
    {
      keys: [
        "energy", "tired", "fatigue", "morning", "boost",
        "energie", "moeg", "uitgeput", "oggend",
        "simba", "kuneta", "mangwanani"
      ],
      goal: "well-being",
      filterGoals: ["focus", "well-being"],
      pitch: {
        en: "For gentle energy, Matcha Morning Ritual Tea and Vitamin D3 with K2 are solid daily rituals. Matcha lifts without jitters; D3 supports mood and vitality.",
        af: "Vir sagte energie is Matcha Morning Ritual Tea en Vitamien D3 met K2 goeie daaglikse rituele. Matcha lig sonder bewing; D3 ondersteun bui en vitaliteit.",
        sn: "Kuti uve nesimba rakapfava, Matcha Morning Ritual Tea ne Vitamin D3 ne K2 zvakanaka. Matcha inosimudzira pasina kudedera; D3 inotsigira mood."
      }
    },
    {
      keys: [
        "immune", "immunity", "cold", "flu", "sick",
        "immuun", "immuniteit", "verkoue", "griep", "siek",
        "immune", "kutadza kurwara", "chando", "furuwenza", "kurwara"
      ],
      goal: "well-being",
      filterGoals: ["immunity"],
      pitch: {
        en: "For immune support, Daily Immunity Shot Tonic and Vitamin D3 with K2 work well together. The tonic is ginger, turmeric and elderberry; D3 backs immune and bone health.",
        af: "Vir immuunondersteuning werk Daily Immunity Shot Tonic en Vitamien D3 met K2 goed saam. Die tonikum is gemmer, borrie en vlierbessie; D3 ondersteun immuniteit en beengesondheid.",
        sn: "Kuti immune system ishande, Daily Immunity Shot Tonic ne Vitamin D3 ne K2 zvinoshanda pamwe. Tonic ine ginger, turmeric ne elderberry."
      }
    },
    {
      keys: [
        "muscle", "protein", "weight gain", "bulk", "mass", "recovery", "workout", "gym",
        "spier", "proteïen", "proteien", "gewig optel", "massa", "herstel", "oefening",
        "mhasuru", "protein", "kuwedzera weight", "gym", "kurovedza muviri"
      ],
      goal: "weight-gain",
      filterGoals: ["weight-gain"],
      pitch: {
        en: "For muscle support and recovery, Plant Protein Daily Boost and Magnesium Glycinate are a strong pair. Complete plant protein for lean mass; magnesium for recovery and rest.",
        af: "Vir spierondersteuning en herstel is Plant Protein Daily Boost en Magnesium Glycinate ’n sterk paar. Volledige plantproteïen vir maer massa; magnesium vir herstel en rus.",
        sn: "Kuti mhasuru ikure uye recovery, Plant Protein Daily Boost ne Magnesium Glycinate zvakanaka. Protein yezvirimwa yakakwana; magnesium yekupora."
      }
    },
    {
      keys: [
        "weight loss", "lose weight", "slim", "diet", "metabolism", "satiety",
        "gewig verloor", "afval", "dieet", "metabolisme",
        "kubvisa weight", "kurerutsa", "diet"
      ],
      goal: "weight-loss",
      filterGoals: ["weight-loss"],
      pitch: {
        en: "For weight management support, Plant Protein Daily Boost and Gut Balance Probiotic help with satiety and gut harmony. Matcha also supports calm energy during a cut.",
        af: "Vir gewigsbestuur help Plant Protein Daily Boost en Gut Balance Probiotic met versadiging en dermharmonie. Matcha ondersteun ook kalm energie tydens ’n snyfase.",
        sn: "Kuti ubatsirwe mukurerutsa, Plant Protein Daily Boost ne Gut Balance Probiotic zvinobatsira. Matcha inopawo simba rakanyarara."
      }
    },
    {
      keys: [
        "gut", "digestion", "bloating", "probiotic", "stomach",
        "derm", "spysvertering", "opgeblaas", "probiotika", "maag",
        "dumbu", "digestion", "kuzvimba dumbu", "probiotic"
      ],
      goal: "well-being",
      filterGoals: ["well-being"],
      pitch: {
        en: "For gut harmony, Gut Balance Probiotic delivers ten billion CFU multi-strain support. Pair it with a consistent routine for best results.",
        af: "Vir dermharmonie lewer Gut Balance Probiotic tien miljard CFU multi-stam ondersteuning. Paar dit met ’n konsekwente roetine vir die beste resultate.",
        sn: "Kuti dumbu rishande zvakanaka, Gut Balance Probiotic inopa billion gumi CFU. Shandisa nguva dzose kuti uwane mhedzisiro yakanaka."
      }
    },
    {
      keys: [
        "bath", "soak", "body butter", "body care", "dry body",
        "bad", "week", "liggaambotter", "liggaamsorg", "droë vel",
        "bhathi", "kuwira mumvura", "body butter", "muviri wakaoma"
      ],
      goal: "well-being",
      filterGoals: ["well-being", "skincare"],
      pitch: {
        en: "For body rituals, Mineral Recovery Bath Soak is ideal after a long day, and Deep Restore Body Butter locks in comfort with shea and cocoa.",
        af: "Vir liggaamsrituele is Mineral Recovery Bath Soak ideaal ná ’n lang dag, en Deep Restore Body Butter sluit gemak in met shea en kakao.",
        sn: "Kuti muviri uzorore, Mineral Recovery Bath Soak yakanaka mushure mezuva refu, uye Deep Restore Body Butter inochengetedza softness ne shea ne cocoa."
      }
    }
  ];

  const UI_STRINGS = {
    en: {
      titleSub: "Tap the mic · EN / AF / SN",
      greeting: "Hey, how can I help you today?",
      hint: "Pick a focus or tap the mic and ask — e.g. “what’s good for sleep?” / “wat is goed vir slaap?” / “chii chakanaka pakurara?” The neon bottle shows when I’m listening or finding products.",
      listening: "Listening… speak now",
      wakeListening: "Listening for “Hey Lavet”…",
      wakeHeard: "Lavet heard you — go ahead…",
      wakeOn: "Okay. I’m listening for Hey Lavet.",
      wakeOnMsg: "Always-listen is on. Say <strong>Hey Lavet</strong> then your question — English, Afrikaans or Shona.",
      wakeOffMsg: "Always-listen is off. Tap the mic when you want to speak.",
      wakeOnly: "Yes? What can I help you find?",
      wakeOnlyMsg: "Yes? Ask me anything — e.g. “what’s good for sleep?” or “wat is goed vir slaap?”",
      micBlocked: "Microphone access is blocked. Please allow the mic and try again.",
      micBlockedMsg: "Microphone permission is needed for voice. Allow it in your browser, then tap the mic again.",
      noCatch: "I didn’t catch that. Try again or tap a focus below.",
      unsupported: "Voice isn’t fully supported in this browser. Use Chrome or Edge for best results with English, Afrikaans and Shona keywords.",
      thanks: "You’re welcome. Happy to help with the next ritual.",
      unknown: "I’m trained on every Lavet product. Try “what’s good for sleep?”, “wat is goed vir slaap?”, “chii chakanaka pakurara?”, or a product name.",
      matchIntro: (q) => `Here’s what matches <em>${q}</em> in the catalog:`,
      noMatchSpeak: "I couldn’t match that to a product. Try asking what’s good for sleep, or say a product name.",
      openCart: "Opening your cart for you.",
      openProducts: "Opening all products for you.",
      alwaysListen: "Always listen for “Hey Lavet”",
      done: "Done · close",
      back: "← Choose another focus",
      viewAll: "View all",
      goals: {
        skincare: "✨ Skincare",
        "well-being": "🌿 Well-being & calm",
        "weight-gain": "💪 Weight gain / muscle",
        "weight-loss": "🍃 Weight management",
        browsing: "🛒 Just browsing"
      }
    },
    af: {
      titleSub: "Tik die mikrofoon · EN / AF / SN",
      greeting: "Haai, hoe kan ek jou vandag help?",
      hint: "Kies ’n fokus of tik die mikrofoon — bv. “wat is goed vir slaap?” Die neon bottel wys wanneer ek luister of produkte soek.",
      listening: "Luister… praat nou",
      wakeListening: "Luister vir “Hey Lavet”…",
      wakeHeard: "Lavet het jou gehoor — gaan voort…",
      wakeOn: "Reg. Ek luister vir Hey Lavet.",
      wakeOnMsg: "Altyd-luister is aan. Sê <strong>Hey Lavet</strong> en dan jou vraag — Engels, Afrikaans of Shona.",
      wakeOffMsg: "Altyd-luister is af. Tik die mikrofoon wanneer jy wil praat.",
      wakeOnly: "Ja? Waarmee kan ek help?",
      wakeOnlyMsg: "Ja? Vra enigiets — bv. “wat is goed vir slaap?” of “skincare vir gloed”.",
      micBlocked: "Mikrofoon-toegang is geblokkeer. Laat die mikrofoon toe en probeer weer.",
      micBlockedMsg: "Mikrofoon-toestemming word benodig. Laat dit in jou blaaier toe, tik dan weer die mikrofoon.",
      noCatch: "Ek het dit nie gehoor nie. Probeer weer of kies ’n fokus hier onder.",
      unsupported: "Stem word nie ten volle in hierdie blaaier ondersteun nie. Gebruik Chrome of Edge vir die beste resultate.",
      thanks: "Baie welkom. Lekker met die volgende ritueel.",
      unknown: "Ek ken elke Lavet-produk. Probeer “wat is goed vir slaap?”, “chii chakanaka pakurara?”, of ’n produknaam.",
      matchIntro: (q) => `Hier is wat pas by <em>${q}</em> in die katalogus:`,
      noMatchSpeak: "Ek kon dit nie aan ’n produk koppel nie. Vra wat goed is vir slaap, of sê ’n produknaam.",
      openCart: "Ek maak jou mandjie oop.",
      openProducts: "Ek maak alle produkte oop.",
      alwaysListen: "Luister altyd vir “Hey Lavet”",
      done: "Klaar · toemaak",
      back: "← Kies ander fokus",
      viewAll: "Sien alles",
      goals: {
        skincare: "✨ Velversorging",
        "well-being": "🌿 Welsyn & kalmte",
        "weight-gain": "💪 Gewig optel / spiere",
        "weight-loss": "🍃 Gewigsbestuur",
        browsing: "🛒 Blaai net"
      }
    },
    sn: {
      titleSub: "Baya mic · EN / AF / SN",
      greeting: "Mhoro, ndingakubatsira sei nhasi?",
      hint: "Sarudza focus kana ubaye mic — semuenzaniso “chii chakanaka pakurara?” Neon bottle inoratidza kana ndiri kuteerera kana kutsvaga products.",
      listening: "Ndiri kuteerera… taura izvozvi",
      wakeListening: "Ndiri kuteerera “Hey Lavet”…",
      wakeHeard: "Lavet akanzwa — enderera…",
      wakeOn: "Zvakanaka. Ndiri kuteerera Hey Lavet.",
      wakeOnMsg: "Always-listen yatanga. Iti <strong>Hey Lavet</strong> wobvunza — English, Afrikaans kana Shona.",
      wakeOffMsg: "Always-listen yadzima. Baya mic kana uchida kutaura.",
      wakeOnly: "Hongu? Ndingakubatsireyi?",
      wakeOnlyMsg: "Hongu? Ndibvunze chero chinhu — semuenzaniso “chii chakanaka pakurara?”",
      micBlocked: "Microphone haina mvumo. Ipa mvumo odzokorora.",
      micBlockedMsg: "Microphone inoda mvumo. Ipa mu browser, odzokorora mic.",
      noCatch: "Handina kunzwa. Dzokorora kana usarudze focus pazasi.",
      unsupported: "Voice haishandi zvizuri mu browser iyi. Shandisa Chrome kana Edge.",
      thanks: "Wazogamuchirwa. Ndichakubatsira zvakare.",
      unknown: "Ndinoziva product dzese dzeLavet. Edza “chii chakanaka pakurara?”, “wat is goed vir slaap?”, kana zita reproduct.",
      matchIntro: (q) => `Izvi ndizvo zvinoenderana ne <em>${q}</em> mu catalog:`,
      noMatchSpeak: "Handina kuwana product. Bvunza chii chakanaka pakurara, kana utaure zita reproduct.",
      openCart: "Ndiri kuvhura cart yako.",
      openProducts: "Ndiri kuvhura products dzese.",
      alwaysListen: "Teerera nguva dzose “Hey Lavet”",
      done: "Zvaita · vhara",
      back: "← Sarudza zvimwe",
      viewAll: "Ona dzese",
      goals: {
        skincare: "✨ Ganda",
        "well-being": "🌿 Utano & kuzorora",
        "weight-gain": "💪 Kuwedzera weight / mhasuru",
        "weight-loss": "🍃 Kurerutsa",
        browsing: "🛒 Kungotarisa"
      }
    }
  };

  function t(key) {
    const pack = UI_STRINGS[currentLang] || UI_STRINGS.en;
    return pack[key] !== undefined ? pack[key] : UI_STRINGS.en[key];
  }

  function loadLang() {
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === "af" || v === "sn" || v === "en") return v;
    } catch {}
    return "en";
  }

  function saveLang(lang) {
    currentLang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
  }

  function hasSeen() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markSeen() {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  /* ——— Modal behaviour: dim/blur backdrop + page scroll lock ——— */
  let lockedScrollY = 0;
  let pageLocked = false;

  function lockPageScroll() {
    if (pageLocked) return;
    pageLocked = true;
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const body = document.body;
    body.style.top = "-" + lockedScrollY + "px";
    document.documentElement.classList.add("assistant-open");
    const bd = document.getElementById("assistant-backdrop");
    if (bd) bd.hidden = false;
  }

  function unlockPageScroll() {
    if (!pageLocked) return;
    pageLocked = false;
    const bd = document.getElementById("assistant-backdrop");
    if (bd) bd.hidden = true;
    document.documentElement.classList.remove("assistant-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  }

  function createWidget() {
    const backdrop = document.createElement("div");
    backdrop.id = "assistant-backdrop";
    backdrop.className = "assistant-backdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    // Swallow touch/scroll so nothing behind the assistant can be reached
    backdrop.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    backdrop.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
    backdrop.addEventListener("click", () => {
      const p = document.getElementById("assistant-panel");
      const f = document.getElementById("assistant-fab");
      if (p && f && !p.hidden) closePanel(p, f);
    });
    document.body.appendChild(backdrop);

    const root = document.createElement("div");
    root.id = "lavet-assistant";
    root.className = "lavet-assistant";
    root.setAttribute("aria-live", "polite");
    root.innerHTML = `
      <button type="button" class="assistant-fab" id="assistant-fab" aria-label="Open shopping assistant" aria-expanded="false">
        <span class="assistant-fab__icon">💬</span>
        <span class="assistant-fab__pulse"></span>
      </button>
      <div class="assistant-panel" id="assistant-panel" role="dialog" aria-label="Shopping assistant" hidden>
        <div class="assistant-header">
          <div class="assistant-title">
            <strong>Lavet</strong>
          </div>
          <div class="assistant-lang" id="assistant-lang" role="group" aria-label="Language">
            <button type="button" data-lang="en" class="assistant-lang__btn${currentLang === "en" ? " is-active" : ""}" title="English">EN</button>
            <button type="button" data-lang="af" class="assistant-lang__btn${currentLang === "af" ? " is-active" : ""}" title="Afrikaans">AF</button>
            <button type="button" data-lang="sn" class="assistant-lang__btn${currentLang === "sn" ? " is-active" : ""}" title="Shona">SN</button>
          </div>
          <button type="button" class="assistant-voice" id="assistant-voice" aria-label="Tap to speak" title="Tap to speak">
            <span class="assistant-voice__icon">🎤</span>
          </button>
          <button type="button" class="assistant-close" id="assistant-close" aria-label="Close assistant">×</button>
        </div>
        <div class="assistant-neon" id="assistant-neon" data-state="idle">
          <canvas id="assistant-neon-canvas" aria-hidden="true"></canvas>
          <p class="assistant-neon-label" id="assistant-neon-label" hidden>Listening…</p>
        </div>
        <div class="assistant-body" id="assistant-body"></div>
        <div class="assistant-voice-status" id="assistant-voice-status" hidden>
          <span class="assistant-voice-dot"></span>
          <span id="assistant-voice-status-text">${t("listening")}</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function clearCollapseTimer() {
    if (collapseTimer) {
      clearTimeout(collapseTimer);
      collapseTimer = null;
    }
  }

  /**
   * Restart the inactivity timer. Call this on any user activity
   * (clicks, mic start, typing, scrolling the panel body, etc.).
   * The panel only closes after INACTIVITY_COLLAPSE_MS of silence.
   * Never call this to "force close after results" — results stay open.
   */
  function bumpInactivityTimer() {
    clearCollapseTimer();
    // Don't start a timer while listening — wait until listening ends
    if (isListening) return;
    const panel = panelEl || document.getElementById("assistant-panel");
    if (!panel || panel.hidden) return;

    collapseTimer = setTimeout(() => {
      // Final safety checks
      if (isListening) return;
      const p = panelEl || document.getElementById("assistant-panel");
      const f = fabEl || document.getElementById("assistant-fab");
      if (p && f && !p.hidden) closePanel(p, f);
    }, INACTIVITY_COLLAPSE_MS);
  }

  /**
   * Voice replies are off by design — the neon stage is the feedback channel.
   * Kept as a no-op so call sites stay simple.
   */
  function speak(_text, onEnd) {
    if (typeof onEnd === "function") onEnd();
  }

  function fitAssistantNeon() {
    const wrap = document.getElementById("assistant-neon");
    if (!wrap || !neonScene || !neonScene.resize) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w > 20 && h > 20) {
      neonScene.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
    }
  }

  function setVoiceStage(active) {
    const root = document.getElementById("lavet-assistant");
    const panel = document.getElementById("assistant-panel");
    [root, panel].forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-voice", !!active);
      if (active) el.classList.remove("is-results");
    });
    const neon = document.getElementById("assistant-neon");
    if (active && neon) neon.hidden = false;
    if (neonScene && active) {
      if (neonScene.setZoom) neonScene.setZoom(active ? 1.55 : 1);
      if (neonScene.setSpinBoost) neonScene.setSpinBoost(active ? 1.25 : 0.22);
    }
    requestAnimationFrame(() => {
      fitAssistantNeon();
      requestAnimationFrame(fitAssistantNeon);
    });
  }

  /** Products own the panel: bottle and goal chips are gone. */
  function enterResults() {
    const root = document.getElementById("lavet-assistant");
    const panel = document.getElementById("assistant-panel");
    const neon = document.getElementById("assistant-neon");
    [root, panel].forEach((el) => {
      if (!el) return;
      el.classList.remove("is-voice");
      el.classList.add("is-results");
    });
    if (neon) {
      neon.hidden = true;
      neon.setAttribute("data-state", "idle");
      const label = document.getElementById("assistant-neon-label");
      if (label) label.hidden = true;
    }
    pauseNeonScene();
  }

  /** Stop the render loop so nothing spins while the stage is hidden. */
  function pauseNeonScene() {
    if (neonScene && neonScene.stop) neonScene.stop();
  }

  function ensureNeonScene() {
    if (neonScene) return neonScene;
    const canvas = document.getElementById("assistant-neon-canvas");
    if (!canvas || typeof window.NeonProduct === "undefined") return null;
    try {
      neonScene = window.NeonProduct.create(canvas, {
        palette: "sage",
        interactive: false,
        halo: true,
        build: 1,
        spinBoost: 0.22
      });
      fitAssistantNeon();
    } catch (e) {
      console.warn("Neon assistant stage failed", e);
      neonScene = null;
    }
    return neonScene;
  }

  /** Neon loading beat: replays the 3D/4D build-up (like the page loader), then shows the results. */
  let neonAnim = 0;
  function runWithNeonLoading(task, session, ms) {
    const dur = ms || 900;
    const scene = (showNeonState("thinking"), neonScene);
    const anim = ++neonAnim;
    const t0 = performance.now();
    if (scene && scene.setBuild) scene.setBuild(0);
    const finish = () => {
      if (anim !== neonAnim) return;
      if (scene && scene.setBuild) scene.setBuild(1);
      if (session === listenSession) task();
    };
    const tick = (now) => {
      if (anim !== neonAnim) return;
      const p = Math.min(1, (now - t0) / dur);
      if (scene && scene.setBuild) scene.setBuild(1 - Math.pow(1 - p, 2.2));
      if (p < 1) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  }

  function showNeonState(mode) {
    // mode: "listening" | "thinking" | null (idle — bottle stays visible)
    const el = document.getElementById("assistant-neon");
    const label = document.getElementById("assistant-neon-label");
    if (!el) return;
    const active = mode === "listening" || mode === "thinking";
    // Idle = no 3D at all. The stage only exists while listening / loading.
    el.hidden = !active;
    const panel = document.getElementById("assistant-panel");
    const root = document.getElementById("lavet-assistant");
    if (!active) {
      [panel, root].forEach((n) => n && n.classList.remove("is-results"));
    }
    el.setAttribute("data-state", mode || "idle");
    if (label) {
      if (!mode) {
        label.hidden = true;
      } else {
        label.hidden = false;
        label.textContent =
          mode === "listening"
            ? currentLang === "af"
              ? "Luister…"
              : currentLang === "sn"
                ? "Ndiri kuteerera…"
                : "Listening…"
            : currentLang === "af"
              ? "Soek produkte…"
              : currentLang === "sn"
                ? "Kutsvaga zvigadzirwa…"
                : "Finding products…";
      }
    }
    if (label) delete label.dataset.live;
    if (active) {
      ensureNeonScene();
      if (neonScene && neonScene.start) neonScene.start();
      if (neonScene && neonScene.setBuild && mode === "listening") neonScene.setBuild(1);
    } else {
      pauseNeonScene();
    }
    setVoiceStage(active);
    // Cancelled/finished with products already on screen → go back to them, not the chips
    if (!active && bodyEl && bodyEl.querySelector(".assistant-recs")) enterResults();
  }

  function setVoiceStatus(visible, text) {
    const status = document.getElementById("assistant-voice-status");
    const statusText = document.getElementById("assistant-voice-status-text");
    const btn = document.getElementById("assistant-voice");
    if (status) status.hidden = !visible;
    if (statusText && text) statusText.textContent = text;
    if (btn) {
      if (visible) {
        btn.classList.add("is-listening");
        btn.setAttribute("aria-label", "Stop listening");
      } else {
        btn.classList.remove("is-listening");
        btn.setAttribute("aria-label", "Start voice assistant");
      }
    }
  }

  function stripWakeWord(transcript) {
    let t0 = transcript.trim();
    for (const re of WAKE_PATTERNS) {
      t0 = t0.replace(re, " ").trim();
    }
    return t0.replace(/\s+/g, " ").trim();
  }

  function containsWakeWord(transcript) {
    return WAKE_PATTERNS.some((re) => re.test(transcript));
  }

  function speechLang() {
    return LANG_META[currentLang].speech;
  }

  /** Tear down the current recognizer completely — browsers often wedge a reused instance. */
  function destroyRecognition() {
    if (!recognition) return;
    const rec = recognition;
    recognition = null;
    try {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {}
    }
  }

  function stopCommandListening() {
    isListening = false;
    destroyRecognition();
    stopDeepgramListening();
    setVoiceStatus(false);
    // Only clear neon if we were listening (not mid-thinking after a result)
    const neon = document.getElementById("assistant-neon");
    if (neon && neon.getAttribute("data-state") === "listening") {
      showNeonState(null);
    }
    listenCooldownUntil = Date.now() + 350;
    // Resume inactivity countdown once the mic is off
    bumpInactivityTimer();
  }


  // --- Deepgram (server proxy) vs browser SpeechRecognition ---
  let deepgramEnabled = null; // null = unknown, true/false after /api/config
  let mediaRecorder = null;
  let mediaStream = null;
  let recordedChunks = [];

  async function fetchDeepgramConfig() {
    if (deepgramEnabled !== null) return deepgramEnabled;
    try {
      const res = await fetch("/api/config", { credentials: "same-origin" });
      if (!res.ok) {
        deepgramEnabled = false;
        return false;
      }
      const data = await res.json();
      deepgramEnabled = Boolean(data.deepgramEnabled);
      return deepgramEnabled;
    } catch {
      deepgramEnabled = false;
      return false;
    }
  }

  function mapLangForDeepgram() {
    // Deepgram language codes; Afrikaans is supported on some models
    const map = { en: "en", af: "af", sn: "en" };
    return map[currentLang] || "en";
  }

  async function startDeepgramListening(session) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia unsupported");
    }
    recordedChunks = [];
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: mime });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      // stop tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        mediaStream = null;
      }
      if (session !== listenSession) return;
      isListening = false;
      setVoiceStatus(false);

      if (!recordedChunks.length) {
        showNeonState(null);
        bumpInactivityTimer();
        notice(t("noCatch"));
        return;
      }

      const blob = new Blob(recordedChunks, { type: mime });
      recordedChunks = [];
      const form = new FormData();
      form.append("audio", blob, "utterance.webm");

      try {
        showNeonState("thinking");
        const res = await fetch(
          "/api/transcribe?language=" + encodeURIComponent(mapLangForDeepgram()),
          { method: "POST", body: form, credentials: "same-origin" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("Deepgram proxy error", data);
          notice(t("noCatch"));
          showNeonState(null);
          bumpInactivityTimer();
          return;
        }
        const text = (data.transcript || "").trim();
        if (!text) {
          notice(t("noCatch"));
          showNeonState(null);
          bumpInactivityTimer();
          return;
        }
        const statusText = document.getElementById("assistant-voice-status-text");
        if (statusText) statusText.textContent = text;
        runWithNeonLoading(() => processUtterance(text, { requireWake: false }), session, 900);
      } catch (err) {
        console.warn("Deepgram upload failed", err);
        notice(t("noCatch"));
        showNeonState(null);
        bumpInactivityTimer();
      }
    };

    mediaRecorder.start();
    isListening = true;
    clearCollapseTimer();
    setVoiceStatus(true, t("listening"));
    showNeonState("listening");

    // Auto-stop after ~6s so the user doesn't have to press again
    setTimeout(() => {
      if (session === listenSession && mediaRecorder && mediaRecorder.state === "recording") {
        try { mediaRecorder.stop(); } catch {}
      }
    }, 6000);
  }

  function stopDeepgramListening() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      try { mediaRecorder.stop(); } catch {}
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    mediaRecorder = null;
  }


  function startCommandListening() {
    // Never let a pending collapse close the panel while the user is speaking
    clearCollapseTimer();

    // Toggle off if already listening
    if (isListening) {
      stopCommandListening();
      return;
    }

    // Cooldown prevents InvalidStateError when restarting too fast
    const wait = Math.max(0, listenCooldownUntil - Date.now());
    const session = ++listenSession;

    const begin = async () => {
      if (session !== listenSession) return;

      // Prefer secure Deepgram proxy when the server has a key configured
      const useDeepgram = await fetchDeepgramConfig();
      if (useDeepgram) {
        try {
          await startDeepgramListening(session);
          return;
        } catch (err) {
          console.warn("Deepgram path failed, falling back to browser speech", err);
          if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
            notice(t("micBlockedMsg"));
            showNeonState(null);
            return;
          }
          // fall through to Web Speech API
        }
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showVoiceUnsupported();
        return;
      }

      // Always a fresh instance — key fix for the mic getting stuck
      destroyRecognition();
      const rec = new SpeechRecognition();
      recognition = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = speechLang();

      let finalTranscript = "";
      let gotResult = false;
      let handled = false;

      // Heard enough: stop listening, show the neon loading build-up, then the products.
      const handoff = () => {
        if (handled) return;
        const text = finalTranscript.trim();
        if (!text) return;
        handled = true;
        isListening = false;
        destroyRecognition();
        setVoiceStatus(false);
        listenCooldownUntil = Date.now() + 350;
        // processUtterance / render will bump inactivity; also reset here for safety
        bumpInactivityTimer();
        runWithNeonLoading(() => processUtterance(text, { requireWake: false }), session, 900);
      };

      rec.onstart = () => {
        if (session !== listenSession) return;
        isListening = true;
        clearCollapseTimer(); // hold panel open while mic is live
        setVoiceStatus(true, t("listening"));
        showNeonState("listening");
      };

      rec.onresult = (event) => {
        if (session !== listenSession) return;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += piece;
          else interim += piece;
        }
        const live = (finalTranscript || interim).trim();
        if (live) {
          const statusText = document.getElementById("assistant-voice-status-text");
          if (statusText) statusText.textContent = live;
          const stageLabel = document.getElementById("assistant-neon-label");
          if (stageLabel) { stageLabel.hidden = false; stageLabel.dataset.live = "1"; stageLabel.textContent = "“" + live + "”"; }
        }
        if (event.results[event.results.length - 1].isFinal) {
          gotResult = true;
          handoff();
        }
      };

      rec.onerror = (event) => {
        if (session !== listenSession) return;
        const err = event.error;
        isListening = false;
        destroyRecognition();
        setVoiceStatus(false);
        showNeonState(null);
        listenCooldownUntil = Date.now() + 500;
        bumpInactivityTimer();

        if (err === "not-allowed" || err === "service-not-allowed") {
          notice(t("micBlockedMsg"));
        } else if (err === "no-speech") {
          notice(t("noCatch"));
        } else if (err !== "aborted") {
          notice(t("noCatch"));
        }
      };

      rec.onend = () => {
        if (session !== listenSession || handled) return;
        isListening = false;
        destroyRecognition();
        setVoiceStatus(false);
        listenCooldownUntil = Date.now() + 350;
        if (gotResult && finalTranscript.trim()) {
          handoff();
        } else {
          showNeonState(null);
          bumpInactivityTimer();
        }
      };

      try {
        rec.start();
      } catch (e) {
        isListening = false;
        destroyRecognition();
        setVoiceStatus(false);
        showNeonState(null);
        listenCooldownUntil = Date.now() + 600;
        // One automatic retry after cooldown
        setTimeout(() => {
          if (session === listenSession && !isListening) startCommandListening();
        }, 650);
      }
    };

    if (wait > 0) setTimeout(begin, wait);
    else begin();
  }

  /** Leave the stage and show a short message above the goal chips. */
  function notice(text) {
    if (!bodyEl) return;
    renderGreeting(bodyEl);
    appendBotMsg(bodyEl, text);
  }

  function showVoiceUnsupported() {
    notice(t("unsupported"));
  }

  function appendBotMsg(body, text) {
    const div = document.createElement("div");
    div.className = "assistant-msg assistant-msg--bot";
    div.innerHTML = `<p>${text}</p>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function appendUserMsg(body, text) {
    const div = document.createElement("div");
    div.className = "assistant-msg assistant-msg--user";
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  function findProductsByQuery(q) {
    if (typeof PRODUCTS === "undefined") return [];
    const tq = q.toLowerCase();
    const tokens = tq.split(/\s+/).filter((w) => w.length > 2);
    const scored = PRODUCTS.map((p) => {
      const name = p.name.toLowerCase();
      const desc = (p.desc || "").toLowerCase();
      const benefits = (p.benefits || []).join(" ").toLowerCase();
      const goals = (p.goals || []).join(" ");
      const hay = name + " " + desc + " " + benefits + " " + goals;
      let score = 0;
      if (name.includes(tq) || tq.includes(name.split(" ")[0])) score += 10;
      tokens.forEach((tok) => {
        if (name.includes(tok)) score += 4;
        if (hay.includes(tok)) score += 1;
      });
      return { p, score };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((x) => x.p);
  }

  function productsForTopic(topic) {
    if (typeof PRODUCTS === "undefined") return [];
    if (topic.filterGoals && topic.filterGoals.length) {
      const filtered = PRODUCTS.filter(
        (p) => p.goals && topic.filterGoals.some((g) => p.goals.includes(g))
      );
      if (filtered.length) return filtered.slice(0, 4);
    }
    if (typeof getProductsForGoal === "function") {
      return getProductsForGoal(topic.goal).slice(0, 4);
    }
    return [];
  }

  function interpretVoice(transcript) {
    const raw = transcript.toLowerCase().trim();
    const tq = stripWakeWord(raw) || raw;

    for (const topic of TOPIC_INTENTS) {
      if (topic.keys.some((k) => tq.includes(k))) {
        return {
          type: "topic",
          topic,
          products: productsForTopic(topic)
        };
      }
    }

    const goalMap = [
      { goal: "skincare", keys: ["skincare", "skin care", "velversorging", "ganda"] },
      { goal: "well-being", keys: ["wellbeing", "well-being", "well being", "wellness", "welsyn", "utano"] },
      { goal: "weight-gain", keys: ["weight gain", "muscle support", "gewig optel", "kuwedzera weight"] },
      { goal: "weight-loss", keys: ["weight loss", "weight management", "gewig verloor", "gewigsbestuur", "kurerutsa"] },
      {
        goal: "browsing",
        keys: [
          "browse", "just looking", "show me products", "popular", "favourites", "favorites", "best sellers", "recommend something",
          "blaai", "wys produkte",
          "tarisa", "ratidza products"
        ]
      }
    ];
    for (const g of goalMap) {
      if (g.keys.some((k) => tq.includes(k))) {
        return { type: "goal", goal: g.goal };
      }
    }

    const matches = findProductsByQuery(tq);
    if (matches.length > 0) {
      return { type: "products", products: matches.slice(0, 4), query: tq };
    }

    if (/\b(hello|hi|hey|hallo|haai|mhoro)\b/.test(tq) && tq.split(/\s+/).length < 4) {
      return { type: "greeting" };
    }
    if (/\b(cart|basket|mandjie|kariti)\b/.test(tq)) {
      return { type: "nav", href: "/cart", labelKey: "openCart" };
    }
    if (/\b(products?|shop|store|catalogue|catalog|produkte|zvigadzirwa)\b/.test(tq)) {
      return { type: "nav", href: "/products", labelKey: "openProducts" };
    }
    if (/\b(thank|thanks|dankie|tatenda|mazvita)\b/.test(tq)) {
      return { type: "thanks" };
    }

    return { type: "unknown", transcript: tq };
  }

  function processUtterance(transcript, opts = {}) {
    if (!transcript) return;
    const hadWake = containsWakeWord(transcript);
    if (opts.requireWake && !hadWake) return;

    if (panelEl && fabEl && panelEl.hidden) openPanel(panelEl, fabEl);
    clearCollapseTimer();
    if (!bodyEl) return;

    const intent = interpretVoice(transcript);

    // Product answers replace the stage entirely (no chat bubbles, no chips)
    if (intent.type === "topic") {
      renderTopicAnswer(bodyEl, intent.topic, intent.products);
      return;
    }
    if (intent.type === "goal") {
      onGoal(intent.goal, bodyEl, { fromVoice: true });
      return;
    }
    if (intent.type === "products") {
      renderProductResults(bodyEl, intent.products, intent.query, { fromVoice: true, speakPitch: true });
      return;
    }

    // Everything else is a short conversational reply on a clean idle panel
    renderGreeting(bodyEl);
    if (intent.type === "greeting") return;
    appendUserMsg(bodyEl, "🎤 " + transcript);
    if (intent.type === "thanks") {
      appendBotMsg(bodyEl, t("thanks"));
      bumpInactivityTimer();
      return;
    }
    if (intent.type === "nav") {
      appendBotMsg(bodyEl, t(intent.labelKey));
      setTimeout(() => {
        window.location.href = intent.href;
      }, 900);
      return;
    }
    appendBotMsg(bodyEl, t("unknown"));
  }

  function injectGoalButtons(body) {
    const g = t("goals");
    const opts = document.createElement("div");
    opts.className = "assistant-options";
    opts.innerHTML = `
      <button type="button" data-goal="skincare">${g.skincare}</button>
      <button type="button" data-goal="well-being">${g["well-being"]}</button>
      <button type="button" data-goal="weight-gain">${g["weight-gain"]}</button>
      <button type="button" data-goal="weight-loss">${g["weight-loss"]}</button>
      <button type="button" data-goal="browsing">${g.browsing}</button>
    `;
    body.appendChild(opts);
    opts.querySelectorAll("[data-goal]").forEach((btn) => {
      btn.addEventListener("click", () => goalWithLoading(btn.dataset.goal, body));
    });
  }

  function renderGreeting(body) {
    const g = t("goals");
    body.innerHTML = `
      <div class="assistant-msg assistant-msg--bot">
        <p>${t("greeting")}</p>
        <p class="assistant-hint">${t("hint")}</p>
      </div>
      <div class="assistant-options" id="assistant-options">
        <button type="button" data-goal="skincare">${g.skincare}</button>
        <button type="button" data-goal="well-being">${g["well-being"]}</button>
        <button type="button" data-goal="weight-gain">${g["weight-gain"]}</button>
        <button type="button" data-goal="weight-loss">${g["weight-loss"]}</button>
        <button type="button" data-goal="browsing">${g.browsing}</button>
      </div>
    `;
    body.querySelectorAll("[data-goal]").forEach((btn) => {
      btn.addEventListener("click", () => goalWithLoading(btn.dataset.goal, body));
    });
    showNeonState(null);
    bumpInactivityTimer();
  }

  let thumbsPreloaded = false;
  function preloadThumbs() {
    if (thumbsPreloaded || typeof PRODUCTS === "undefined") return;
    thumbsPreloaded = true;
    PRODUCTS.forEach((p) => { const i = new Image(); i.decoding = "async"; i.src = "images/products/thumbs/" + p.img + ".jpg"; });
  }

  function buildProductCards(products) {
    products = products ? products.slice(0, 6) : products;
    if (!products || products.length === 0) {
      return `<p class="assistant-empty">${currentLang === "af" ? "Geen presiese treffers nie — verken die volle winkel." : currentLang === "sn" ? "Hapana zvakafanana — tarisa shop yese." : "No exact matches right now — explore the full shop."}</p>`;
    }
    return products
      .map((p) => {
        return `
          <article class="assistant-product">
            <a href="/product?id=${p.id}" class="assistant-product__link">
              <img src="images/products/thumbs/${p.img}.jpg" alt="" decoding="async" width="128" height="128">
              <h4>${p.name}</h4>
            </a>
            <div class="assistant-product__foot">
              <span class="assistant-price">R${p.price}</span>
              <button type="button" class="btn btn-primary btn-sm" data-add="${p.id}" aria-label="Add ${p.name} to cart">Add</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function wireAddButtons(body) {
    body.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = parseInt(btn.dataset.add, 10);
        if (typeof addToCart === "function") addToCart(id);
        btn.textContent = "✓";
        btn.disabled = true;
        bumpInactivityTimer(); // user interacted — reset idle clock, do NOT force-close
      });
    });
  }

  function wireFooter(body) {
    const back = body.querySelector("#assistant-back");
    if (back) {
      back.addEventListener("click", () => {
        clearCollapseTimer();
        renderGreeting(body);
      });
    }
    const done = body.querySelector("#assistant-done");
    if (done) {
      done.addEventListener("click", () => {
        clearCollapseTimer();
        if (panelEl && fabEl) closePanel(panelEl, fabEl);
      });
    }
  }

  function footerHtml() {
    return `
      <div class="assistant-footer-actions">
        <button type="button" class="btn btn-outline btn-sm" id="assistant-back">${t("back")}</button>
        <button type="button" class="btn btn-outline btn-sm" id="assistant-done">${t("done")}</button>
        <a href="/products" class="btn btn-primary btn-sm">${t("viewAll")}</a>
      </div>
    `;
  }

  function renderTopicAnswer(body, topic, products) {
    const cards = buildProductCards(products);
    const pitch = (topic.pitch && (topic.pitch[currentLang] || topic.pitch.en)) || "";
    body.innerHTML = `
      <div class="assistant-recs" data-cols="${Math.min(products.length, 6) > 4 ? 3 : 2}">${cards}</div>
      ${footerHtml()}
    `;
    wireAddButtons(body);
    wireFooter(body);
    enterResults();
    speak(pitch);
    bumpInactivityTimer();
  }

  function renderProductResults(body, products, queryLabel, opts = {}) {
    const cards = buildProductCards(products);

    body.innerHTML = `
      <div class="assistant-recs" data-cols="${Math.min(products.length, 6) > 4 ? 3 : 2}">${cards}</div>
      ${footerHtml()}
    `;

    wireAddButtons(body);
    wireFooter(body);
    enterResults();

    if (opts.fromVoice || opts.speakPitch) {
      if (products.length === 1 && pitchFor(products[0].id)) {
        speak(pitchFor(products[0].id));
      } else if (products.length > 0) {
        const first = pitchFor(products[0].id);
        speak(first || t("noMatchSpeak"));
      } else {
        speak(t("noMatchSpeak"));
      }
    }

    bumpInactivityTimer(); // results stay open; only idle closes later
  }

  /** Goal chip tapped: same 3D loading beat as voice, then products take over. */
  function goalWithLoading(goal, body) {
    clearCollapseTimer();
    const session = ++listenSession;
    runWithNeonLoading(() => onGoal(goal, body), session, 800);
  }

  function onGoal(goal, body, opts = {}) {
    const meta =
      (typeof ASSISTANT_GOALS !== "undefined" && ASSISTANT_GOALS[goal]) || {
        label: goal,
        emoji: "✨",
        intro: "Here are some recommendations:"
      };
    const products =
      typeof getProductsForGoal === "function" ? getProductsForGoal(goal).slice(0, 6) : [];

    const cards = buildProductCards(products);

    body.innerHTML = `
      <div class="assistant-recs" data-cols="${Math.min(products.length, 6) > 4 ? 3 : 2}">${cards}</div>
      ${footerHtml()}
    `;

    wireAddButtons(body);
    wireFooter(body);
    enterResults();

    bumpInactivityTimer();
  }

  function openPanel(panel, fab) {
    if (panel) {
      panel.hidden = false;
      panel.removeAttribute("hidden");
    }
    if (fab) {
      fab.setAttribute("aria-expanded", "true");
      fab.classList.add("is-open");
    }
    markSeen();
    showNeonState(null);
    lockPageScroll();
    bumpInactivityTimer();
  }

  function closePanel(panel, fab) {
    clearCollapseTimer();
    listenSession++; // invalidate any in-flight recognition
    stopCommandListening();
    showNeonState(null);
    setVoiceStatus(false);
    if (panel) {
      panel.hidden = true;
      panel.setAttribute("hidden", "");
    }
    if (fab) {
      fab.setAttribute("aria-expanded", "false");
      fab.classList.remove("is-open");
    }
    unlockPageScroll();
  }

  function applyLangToChrome() {
    const sub = document.getElementById("assistant-title-sub");
    if (sub) sub.textContent = t("titleSub");
    document.querySelectorAll(".assistant-lang__btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.lang === currentLang);
    });
  }

  /* ——— Neon coach-mark arrow that points to the FAB ——— */
  let coachEl = null;

  function ensureCoachMark() {
    if (coachEl) return coachEl;
    coachEl = document.createElement("div");
    coachEl.id = "assistant-coach";
    coachEl.className = "assistant-coach";
    coachEl.setAttribute("aria-hidden", "true");
    coachEl.innerHTML = `
      <svg class="assistant-coach__svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="coach-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
            <path class="assistant-coach__tip" d="M0,0 L10,5 L0,10 Z" />
          </marker>
        </defs>
        <path class="assistant-coach__path" id="assistant-coach-path" marker-end="url(#coach-arrowhead)" />
      </svg>
      <div class="assistant-coach__label" id="assistant-coach-label">
        <strong>Your Lavet Assistant</strong>
        Tap here to chat or speak
      </div>
    `;
    document.body.appendChild(coachEl);
    return coachEl;
  }

  function positionCoachMark() {
    if (!coachEl || !fabEl) return;
    const fabRect = fabEl.getBoundingClientRect();
    const path = coachEl.querySelector("#assistant-coach-path");
    const label = coachEl.querySelector("#assistant-coach-label");
    if (!path || !label) return;

    const vw = window.innerWidth;
    const isNarrow = vw < 480;
    const labelW = isNarrow ? Math.min(180, vw - 88) : 200;
    const labelH = isNarrow ? 52 : 56;
    // Keep label on-screen: prefer left of FAB, else above-center
    let labelLeft = fabRect.left - labelW - 24;
    if (labelLeft < 12) labelLeft = Math.max(12, Math.min(fabRect.left - 8, vw - labelW - 12));
    const labelTop = Math.max(12, fabRect.top - labelH - (isNarrow ? 16 : 12));

    label.style.left = labelLeft + "px";
    label.style.top = labelTop + "px";
    label.style.width = labelW + "px";

    const startX = labelLeft + labelW / 2;
    const startY = labelTop + labelH;
    const endX = fabRect.left + fabRect.width / 2;
    const endY = fabRect.top + fabRect.height / 2;

    const c1x = startX;
    const c1y = startY + (endY - startY) * 0.35;
    const c2x = endX;
    const c2y = endY - 24;

    path.setAttribute(
      "d",
      `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`
    );
  }

  function showCoachMark() {
    if (hasSeen()) return;
    const el = ensureCoachMark();
    positionCoachMark();
    // Force reflow then show
    void el.offsetWidth;
    el.classList.add("show");
    window.addEventListener("resize", positionCoachMark);
    window.addEventListener("scroll", positionCoachMark, { passive: true });
  }

  function hideCoachMark() {
    if (!coachEl) return;
    coachEl.classList.remove("show");
    window.removeEventListener("resize", positionCoachMark);
    window.removeEventListener("scroll", positionCoachMark);
    // Remove after fade so it doesn't block anything
    setTimeout(() => {
      if (coachEl && !coachEl.classList.contains("show")) {
        coachEl.remove();
        coachEl = null;
      }
    }, 450);
  }

  function init() {
    if (document.getElementById("lavet-assistant")) return;

    if (typeof PRODUCTS === "undefined") {
      setTimeout(init, 100);
      return;
    }

    const root = createWidget();
    fabEl = root.querySelector("#assistant-fab");
    panelEl = root.querySelector("#assistant-panel");
    bodyEl = root.querySelector("#assistant-body");
    const closeBtn = root.querySelector("#assistant-close");
    const voiceBtn = root.querySelector("#assistant-voice");

    renderGreeting(bodyEl);
    (window.requestIdleCallback || setTimeout)(preloadThumbs);

    // Any interaction inside the panel resets the inactivity clock
    const activityEvents = ["pointerdown", "click", "touchstart", "keydown", "scroll"];
    activityEvents.forEach((evt) => {
      panelEl.addEventListener(
        evt,
        () => {
          if (!panelEl.hidden) bumpInactivityTimer();
        },
        { passive: true, capture: true }
      );
    });

    fabEl.addEventListener("click", () => {
      hideCoachMark();
      if (panelEl.hidden) openPanel(panelEl, fabEl);
      else closePanel(panelEl, fabEl);
    });
    closeBtn.addEventListener("click", () => closePanel(panelEl, fabEl));

    voiceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideCoachMark();
      if (panelEl.hidden) openPanel(panelEl, fabEl);
      preloadThumbs();
      // Clear the placeholders instantly — don't wait for mic permission / network
      if (!isListening) showNeonState("listening");
      startCommandListening();
    });

    root.querySelectorAll(".assistant-lang__btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        saveLang(btn.dataset.lang);
        applyLangToChrome();
        renderGreeting(bodyEl);
        const confirm =
          currentLang === "af"
            ? "Afrikaans is gekies. Tik die mikrofoon om te praat."
            : currentLang === "sn"
              ? "Shona yasarudzwa. Baya mic kuti utaure."
              : "English selected. Tap the mic to speak.";
        appendBotMsg(bodyEl, confirm);
      });
    });

    // After the welcome onboarding is dismissed, show the neon arrow to the FAB.
    // Do NOT auto-open the panel — the user should discover it via the guided pointer.
    const onOnboardComplete = () => {
      setTimeout(showCoachMark, 400);
    };
    window.addEventListener("lavet:onboard-complete", onOnboardComplete);

    // If the event already fired before we attached the listener
    if (window.__lavetOnboardComplete) {
      onOnboardComplete();
    }

    // If there is no onboarding overlay (other pages / already dismissed) and the user
    // hasn't opened the assistant yet this session, show the coach mark after a short delay.
    if (!hasSeen()) {
      setTimeout(() => {
        const onboard = document.getElementById("onboard");
        const onboardVisible = onboard && onboard.classList.contains("show");
        if (!onboardVisible && !hasSeen()) {
          showCoachMark();
        }
      }, DELAY_MS + 200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
