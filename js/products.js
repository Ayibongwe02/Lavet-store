// Lavet Wellness product catalog
const PRODUCTS = [
  {
    id: 1,
    name: "Ashwagandha Calm Complex",
    cat: "Supplements",
    price: 289,
    unit: "bottle",
    img: "ashwagandha-calm",
    desc: "Adaptogenic blend to support stress resilience and calm focus. 60 capsules.",
    benefits: ["Supports stress resilience", "Promotes calm focus"],
    goals: ["well-being", "calm", "focus"]
  },
  {
    id: 2,
    name: "Collagen Renew Peptides",
    cat: "Supplements",
    price: 349,
    unit: "jar",
    img: "collagen-renew",
    desc: "Hydrolysed collagen peptides for skin, hair and joint vitality. 300g.",
    benefits: ["Supports skin elasticity", "Joint & hair vitality"],
    goals: ["skincare", "well-being", "weight-gain"]
  },
  {
    id: 3,
    name: "Vitamin D3 + K2 Daily",
    cat: "Supplements",
    price: 199,
    unit: "bottle",
    img: "vitamin-d3-k2",
    desc: "Synergistic D3 and K2 for bone, immune and mood support. 60 softgels.",
    benefits: ["Bone & immune support", "Mood balance"],
    goals: ["well-being", "immunity"]
  },
  {
    id: 4,
    name: "Magnesium Glycinate Night",
    cat: "Supplements",
    price: 249,
    unit: "bottle",
    img: "magnesium-glycinate",
    desc: "Highly absorbable magnesium for deep rest and muscle recovery. 90 capsules.",
    benefits: ["Deeper restful sleep", "Muscle recovery"],
    goals: ["well-being", "calm", "sleep"]
  },
  {
    id: 5,
    name: "Omega-3 Pure Focus",
    cat: "Supplements",
    price: 279,
    unit: "bottle",
    img: "omega-3-pure",
    desc: "Molecularly distilled fish oil for brain and heart health. 60 softgels.",
    benefits: ["Brain & heart health", "Supports focus"],
    goals: ["well-being", "focus"]
  },
  {
    id: 6,
    name: "Green Glow Vitamin C Serum",
    cat: "Skincare",
    price: 320,
    unit: "bottle",
    img: "green-glow-serum",
    desc: "Brightening 15% vitamin C serum with ferulic acid. 30ml.",
    benefits: ["Brightens & evens tone", "Antioxidant protection"],
    goals: ["skincare"]
  },
  {
    id: 7,
    name: "Hydra Barrier Repair Cream",
    cat: "Skincare",
    price: 265,
    unit: "jar",
    img: "hydra-barrier-cream",
    desc: "Ceramide-rich moisturiser to restore the skin barrier. 50ml.",
    benefits: ["Restores skin barrier", "Deep hydration"],
    goals: ["skincare"]
  },
  {
    id: 8,
    name: "Calming Night Facial Oil",
    cat: "Skincare",
    price: 295,
    unit: "bottle",
    img: "calming-night-oil",
    desc: "Nourishing blend of rosehip, squalane and lavender. 30ml.",
    benefits: ["Overnight nourishment", "Calms & softens"],
    goals: ["skincare", "calm"]
  },
  {
    id: 9,
    name: "Matcha Morning Ritual Tea",
    cat: "Teas & Tonics",
    price: 185,
    unit: "tin",
    img: "matcha-morning-tea",
    desc: "Ceremonial-grade matcha for calm energy and focus. 40g.",
    benefits: ["Calm sustained energy", "Gentle focus"],
    goals: ["well-being", "focus", "weight-loss"]
  },
  {
    id: 10,
    name: "Sleep Deep Herbal Blend",
    cat: "Teas & Tonics",
    price: 145,
    unit: "pouch",
    img: "sleep-deep-blend",
    desc: "Chamomile, passionflower and lemon balm for restful nights. 50g.",
    benefits: ["Supports restful sleep", "Gentle wind-down"],
    goals: ["well-being", "calm", "sleep"]
  },
  {
    id: 11,
    name: "Daily Immunity Shot Tonic",
    cat: "Teas & Tonics",
    price: 210,
    unit: "bottle",
    img: "immunity-shot-tonic",
    desc: "Ginger, turmeric, lemon and elderberry daily shot. 250ml.",
    benefits: ["Daily immune support", "Antioxidant boost"],
    goals: ["well-being", "immunity"]
  },
  {
    id: 12,
    name: "Lavender Calm Essential Oil",
    cat: "Aromatherapy",
    price: 165,
    unit: "bottle",
    img: "lavender-calm-oil",
    desc: "100% pure lavender essential oil for diffusion and topical use. 10ml.",
    benefits: ["Promotes calm atmosphere", "Supports relaxation"],
    goals: ["well-being", "calm"]
  },
  {
    id: 13,
    name: "Focus Citrus Diffuser Blend",
    cat: "Aromatherapy",
    price: 175,
    unit: "bottle",
    img: "focus-citrus-blend",
    desc: "Uplifting blend of sweet orange, lemon and rosemary. 10ml.",
    benefits: ["Uplifts mood & focus", "Fresh citrus energy"],
    goals: ["well-being", "focus"]
  },
  {
    id: 14,
    name: "Deep Restore Body Butter",
    cat: "Body Care",
    price: 230,
    unit: "jar",
    img: "deep-restore-body-butter",
    desc: "Whipped shea and cocoa butter with vanilla and frankincense. 200ml.",
    benefits: ["Deep body hydration", "Comforting ritual"],
    goals: ["skincare", "well-being"]
  },
  {
    id: 15,
    name: "Mineral Recovery Bath Soak",
    cat: "Body Care",
    price: 155,
    unit: "jar",
    img: "mineral-bath-soak",
    desc: "Epsom salts, magnesium and essential oils for recovery. 500g.",
    benefits: ["Muscle recovery", "Soothing soak ritual"],
    goals: ["well-being", "calm"]
  },
  {
    id: 16,
    name: "Plant Protein Daily Boost",
    cat: "Supplements",
    price: 399,
    unit: "tub",
    img: "protein-plant-boost",
    desc: "Complete plant protein with digestive enzymes. Vanilla, 500g.",
    benefits: ["Supports lean mass", "Convenient daily protein"],
    goals: ["weight-gain", "weight-loss", "well-being"]
  },
  {
    id: 17,
    name: "Gut Balance Probiotic",
    cat: "Supplements",
    price: 275,
    unit: "bottle",
    img: "gut-balance-probiotic",
    desc: "10 billion CFU multi-strain probiotic for gut harmony. 30 capsules.",
    benefits: ["Supports gut harmony", "Digestive comfort"],
    goals: ["well-being", "weight-loss", "immunity"]
  },
  {
    id: 18,
    name: "Radiance Clay Face Mask",
    cat: "Skincare",
    price: 185,
    unit: "jar",
    img: "radiance-face-mask",
    desc: "Kaolin and rose clay mask for clarity and glow. 60ml.",
    benefits: ["Clarifies & brightens", "Weekly glow ritual"],
    goals: ["skincare"]
  }
];

const CATEGORIES = ["All", ...new Set(PRODUCTS.map(p => p.cat))];

// Goal → friendly label + description for the shopping assistant
const ASSISTANT_GOALS = {
  skincare: {
    label: "Skincare",
    emoji: "✨",
    intro: "Here are some of our most effective skincare picks for healthy, glowing skin:"
  },
  "well-being": {
    label: "Well-being & calm",
    emoji: "🌿",
    intro: "These formulas support daily calm, energy and overall vitality:"
  },
  "weight-gain": {
    label: "Weight gain / muscle support",
    emoji: "💪",
    intro: "Helpful for building lean mass and nourishing recovery:"
  },
  "weight-loss": {
    label: "Weight management",
    emoji: "🍃",
    intro: "Supportive options for energy, satiety and metabolic wellness:"
  },
  browsing: {
    label: "Just browsing",
    emoji: "🛒",
    intro: "A few customer favourites to get you started:"
  }
};

function getProductsForGoal(goal) {
  if (goal === "browsing") {
    // Featured / popular mix
    return PRODUCTS.filter(p => [1, 2, 6, 9, 16, 4].includes(p.id));
  }
  return PRODUCTS.filter(p => p.goals && p.goals.includes(goal));
}
