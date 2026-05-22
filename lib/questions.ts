export type QuestionType =
  | "text"
  | "textarea"
  | "number"
  | "single-choice"
  | "multi-choice"
  | "boolean"
  | "file";

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required?: boolean;
  helpText?: string;
};

export type QuestionSection = {
  title: string;
  questions: Question[];
};

export type QuestionSet = {
  key: string;
  title: string;
  matchKeywords: string[];
  sections: QuestionSection[];
  outcomeNote?: string;
};

export const QUESTION_SETS: QuestionSet[] = [
  // ── Solar ───────────────────────────────────────────────────────────────────
  {
    key: "solar",
    title: "Solar Energy Systems",
    matchKeywords: ["solar"],
    sections: [
      {
        title: "Property & Energy Usage",
        questions: [
          {
            id: "service-address",
            label:
              "What is the service address (or ZIP code for initial estimate)?",
            type: "text",
            required: true,
          },
          {
            id: "electric-usage",
            label:
              "What is your approximate average monthly electric bill or annual kWh usage?",
            type: "text",
            helpText:
              "Upload 12 months of bills below for highest accuracy.",
          },
          {
            id: "utility-bills",
            label: "Upload utility bills (last 12 months, optional)",
            type: "file",
          },
          {
            id: "utility-provider",
            label: "Who is your utility provider?",
            type: "text",
          },
        ],
      },
      {
        title: "Roof & Site Suitability",
        questions: [
          {
            id: "roof-type",
            label: "What is your roof type?",
            type: "single-choice",
            options: [
              "Asphalt shingle",
              "Metal",
              "Tile",
              "Flat / low-slope",
              "Other",
            ],
          },
          {
            id: "roof-age-condition",
            label:
              "What is the approximate age and overall condition of your roof?",
            type: "text",
          },
          {
            id: "roof-space",
            label:
              "How much usable roof space do you have (or approximate square footage available for panels)?",
            type: "text",
          },
          {
            id: "shading",
            label:
              "Does your roof have significant shading from trees, buildings, or other structures? Describe.",
            type: "textarea",
          },
          {
            id: "shading-photos",
            label: "Upload photos of shading concerns (optional)",
            type: "file",
          },
          {
            id: "roof-orientation",
            label:
              "What is the primary orientation of your main roof surfaces? (South-facing ideal)",
            type: "single-choice",
            options: ["South", "North", "East", "West", "Mixed / unsure"],
          },
        ],
      },
      {
        title: "System Preferences & Goals",
        questions: [
          {
            id: "main-goal",
            label: "What is your main goal?",
            type: "single-choice",
            options: [
              "Maximize offset of usage",
              "Specific kW size",
              "Cover as much roof as possible",
              "Other",
            ],
          },
          {
            id: "battery-storage",
            label: "Are you interested in battery storage?",
            type: "single-choice",
            options: ["Whole-home backup", "Critical loads only", "None"],
          },
          {
            id: "ev-charger",
            label:
              "Do you have or plan to add an EV charger or other major electrical loads?",
            type: "textarea",
          },
          {
            id: "existing-solar",
            label: "Any existing solar system?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Logistics & Purchase Path",
        questions: [
          {
            id: "homeowner-hoa",
            label:
              "Do you own the home? Any HOA restrictions or architectural review requirements?",
            type: "textarea",
          },
          {
            id: "timeline",
            label: "Preferred timeline for installation?",
            type: "text",
          },
          {
            id: "financing",
            label: "Financing preference?",
            type: "single-choice",
            options: [
              "Cash",
              "Loan",
              "Explore federal ITC / incentives / transferability",
              "Other",
            ],
          },
          {
            id: "photos",
            label:
              "Upload clear photos: roof from multiple angles (especially south-facing), main electrical panel, utility meter, and any shading concerns.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Preliminary system design + pricing estimate (or tiered packages). Final design/quote after review or confirmation.",
  },

  // ── Water Filtration ────────────────────────────────────────────────────────
  {
    key: "water",
    title: "Water Filtration Systems",
    matchKeywords: ["water", "softener", "filtration", "osmosis"],
    sections: [
      {
        title: "Water Source & Quality",
        questions: [
          {
            id: "water-source",
            label: "Is your water from a municipal utility or a private well?",
            type: "single-choice",
            options: ["Municipal utility", "Private well"],
          },
          {
            id: "water-issues",
            label: "What issues are you experiencing? (select all that apply)",
            type: "multi-choice",
            options: [
              "Hard water / scale",
              "Bad taste or odor",
              "Sediment",
              "Staining",
              "Skin / hair concerns",
              "Other",
            ],
          },
          {
            id: "water-test",
            label:
              "Do you have recent water test results? (Upload PDF or lab report)",
            type: "file",
          },
        ],
      },
      {
        title: "Household Needs",
        questions: [
          {
            id: "household-size",
            label: "How many people live in the home?",
            type: "number",
          },
          {
            id: "coverage",
            label: "Desired coverage",
            type: "single-choice",
            options: [
              "Whole-house (point-of-entry)",
              "Under-sink / drinking water only",
              "Specific fixtures (showers, etc.)",
              "Combination",
            ],
          },
          {
            id: "specific-goals",
            label:
              "Any specific goals? (Protect appliances/plumbing, better tasting water, softer skin/hair, remove specific contaminants, etc.)",
            type: "textarea",
          },
        ],
      },
      {
        title: "Property & Installation Details",
        questions: [
          {
            id: "install-location",
            label:
              "Where would equipment be installed? (Utility room, garage, under sink, etc. — note available space/clearance)",
            type: "textarea",
          },
          {
            id: "water-heater",
            label:
              "What type of water heater do you have and its approximate age?",
            type: "text",
          },
          {
            id: "plumbing-notes",
            label:
              "Any recent plumbing work or known access limitations?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Preferences & Logistics",
        questions: [
          {
            id: "tech-interest",
            label: "Interest in specific technologies?",
            type: "multi-choice",
            options: [
              "Traditional water softener",
              "Salt-free conditioner",
              "Reverse osmosis",
              "UV disinfection",
              "Multi-stage filtration",
              "Combination",
            ],
          },
          {
            id: "budget",
            label:
              "Budget range or interest in financing / payment plans?",
            type: "text",
          },
          {
            id: "photos",
            label:
              "Upload photos: current setup (utility area, under sink, water heater), or any visible issues (scale, staining).",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Recommended system or tiered packages with pricing. Simple systems can move to cart; complex whole-house installs may need quick confirmation.",
  },

  // ── Roofing ─────────────────────────────────────────────────────────────────
  {
    key: "roofing",
    title: "Roofing",
    matchKeywords: ["roof"],
    sections: [
      {
        title: "Current Roof Condition",
        questions: [
          {
            id: "current-roof",
            label: "What is your current roof type and approximate age?",
            type: "text",
          },
          {
            id: "layers",
            label: "How many layers are currently on the roof (if known)?",
            type: "text",
          },
          {
            id: "issues",
            label:
              "Are you experiencing leaks, missing/damaged shingles, sagging, or other issues? Is this related to an insurance claim (e.g., hail/wind in Texas)?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Home & Roof Details",
        questions: [
          {
            id: "sq-footage",
            label:
              "Approximate roof square footage (or home sq ft + number of stories and roof complexity)?",
            type: "text",
          },
          {
            id: "features",
            label: "Roof features (select all that apply)",
            type: "multi-choice",
            options: [
              "Skylights",
              "Chimneys",
              "Multiple peaks / valleys",
              "Vents",
              "Existing solar panels",
            ],
          },
          {
            id: "gutter-needs",
            label:
              "Any gutter, soffit, fascia, or ventilation needs?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Desired New Roof",
        questions: [
          {
            id: "preferred-material",
            label: "Preferred material?",
            type: "single-choice",
            options: [
              "Architectural asphalt shingles",
              "Metal",
              "Tile",
              "Other",
            ],
          },
          {
            id: "important-features",
            label:
              "Important features: high wind/hail resistance (Class 4 impact recommended for Texas), color, warranty length (manufacturer + workmanship).",
            type: "textarea",
          },
          {
            id: "ventilation-pref",
            label:
              "Any preference for enhanced ventilation, insulation, or radiant barrier?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Logistics",
        questions: [
          {
            id: "timeline",
            label:
              "Desired timeline (urgent due to leaks, insurance deadline, or flexible)?",
            type: "text",
          },
          {
            id: "hoa-permits",
            label: "Any HOA requirements or permit concerns?",
            type: "textarea",
          },
          {
            id: "photos",
            label:
              "Upload photos: multiple angles of the full roof, close-ups of problem areas, eaves/gutters, attic if accessible.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Preliminary pricing by material tier. Strong photo set enables more accurate remote estimates; complex or insurance jobs often need confirmation.",
  },

  // ── Generators ──────────────────────────────────────────────────────────────
  {
    key: "generators",
    title: "Generators",
    matchKeywords: ["generator"],
    sections: [
      {
        title: "Backup Needs",
        questions: [
          {
            id: "backup-scope",
            label: "Whole-home backup or critical loads only?",
            type: "single-choice",
            options: ["Whole-home backup", "Critical loads only"],
          },
          {
            id: "critical-items",
            label:
              "List key items to back up (refrigerator, lights, AC/heat, well pump, medical equipment, sump pump, etc.)",
            type: "textarea",
          },
          {
            id: "sq-footage",
            label:
              "Approximate home square footage (helps with initial sizing)?",
            type: "text",
          },
        ],
      },
      {
        title: "Electrical & Site Details",
        questions: [
          {
            id: "panel-amperage",
            label:
              "Main electrical panel amperage (100A, 200A, etc.) and approximate age/condition?",
            type: "text",
          },
          {
            id: "fuel-type",
            label: "Preferred fuel type?",
            type: "single-choice",
            options: ["Natural gas (if available)", "Propane", "Diesel"],
          },
          {
            id: "generator-location",
            label:
              "Proposed location for the generator? (distance from windows/doors, flooding risk, HOA rules)",
            type: "textarea",
          },
        ],
      },
      {
        title: "Features & Preferences",
        questions: [
          {
            id: "transfer-switch",
            label: "Transfer switch type",
            type: "single-choice",
            options: [
              "Automatic transfer switch (seamless backup)",
              "Manual interlock / transfer switch",
            ],
          },
          {
            id: "additional-features",
            label:
              "Interest in remote monitoring, maintenance plans, or integration with solar/battery?",
            type: "textarea",
          },
          {
            id: "noise-runtime",
            label:
              "Any noise concerns or specific runtime expectations during outages?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Logistics",
        questions: [
          {
            id: "timeline",
            label: "Timeline (especially before storm season)?",
            type: "text",
          },
          {
            id: "photos",
            label:
              "Upload photos: main electrical panel (interior safely), proposed generator pad location, gas meter (if natural gas), and any existing generator or transfer equipment.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Sized recommendation + installed pricing tiers. Load calculation refined during confirmation.",
  },

  // ── HVAC ────────────────────────────────────────────────────────────────────
  {
    key: "hvac",
    title: "HVAC",
    matchKeywords: ["hvac", "heating", "cooling", "air condition"],
    sections: [
      {
        title: "Home Details",
        questions: [
          {
            id: "home-info",
            label:
              "Approximate square footage, number of stories, and general layout / insulation quality?",
            type: "textarea",
          },
          {
            id: "windows-exposure",
            label: "Window types and any major sun exposure?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Current System",
        questions: [
          {
            id: "system-type",
            label: "What type of system do you have?",
            type: "single-choice",
            options: [
              "Central AC + furnace",
              "Heat pump",
              "Mini-splits",
              "Packaged unit",
              "Other",
            ],
          },
          {
            id: "system-age",
            label:
              "Approximate age and condition of current equipment? Any known SEER rating or model info?",
            type: "text",
          },
          {
            id: "current-issues",
            label: "Current issues (select all that apply)",
            type: "multi-choice",
            options: [
              "Not cooling / heating well",
              "High energy bills",
              "Uneven temperatures",
              "Poor air quality",
              "Noise",
              "Frequent repairs",
            ],
          },
        ],
      },
      {
        title: "Desired Solution",
        questions: [
          {
            id: "solution-type",
            label: "What are you looking for?",
            type: "single-choice",
            options: [
              "Full replacement",
              "Repair / service",
              "New zoning",
              "Addition",
            ],
          },
          {
            id: "upgrade-interests",
            label:
              "Interest in high-efficiency upgrades (select all that apply)",
            type: "multi-choice",
            options: [
              "Higher SEER / variable speed",
              "Heat pump",
              "Smart thermostat",
              "Filtration",
              "UV",
              "Dehumidification",
            ],
          },
          {
            id: "ductwork",
            label: "Ductwork condition or any known needs?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Logistics & Preferences",
        questions: [
          {
            id: "timeline",
            label: "Timeline (before summer, flexible, or emergency)?",
            type: "text",
          },
          {
            id: "budget",
            label:
              "Budget range or interest in rebates / tax credits for high-efficiency equipment?",
            type: "text",
          },
          {
            id: "photos",
            label:
              "Upload photos: outdoor condenser, indoor air handler/furnace, nameplate data, thermostat, and ducts if accessible.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Ballpark sizing and pricing tiers. Note that final Manual J load calculation and on-site confirmation are recommended before purchase for replacements.",
  },

  // ── Electrical ──────────────────────────────────────────────────────────────
  {
    key: "electrical",
    title: "Electrical",
    matchKeywords: ["electrical"],
    sections: [
      {
        title: "Scope of Work",
        questions: [
          {
            id: "scope",
            label: "Scope of work (select all that apply)",
            type: "multi-choice",
            options: [
              "Main panel upgrade",
              "Subpanel addition",
              "EV charger circuit / install",
              "Generator transfer switch or interlock",
              "Whole-home surge protection",
              "New circuits / outlets / lighting",
              "Rewiring",
              "Solar-ready upgrades",
              "Other",
            ],
          },
          {
            id: "panel-upgrade-amperage",
            label:
              "If main panel upgrade — to what amperage? (e.g., 200A, 400A)",
            type: "text",
          },
        ],
      },
      {
        title: "Current Electrical System",
        questions: [
          {
            id: "panel-details",
            label:
              "Main panel amperage, brand (Square D, Siemens, etc.), approximate age/condition, and location?",
            type: "text",
          },
          {
            id: "known-issues",
            label:
              "Any known issues (overloaded, tandem breakers, aluminum wiring, or problematic brands)?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Specific Project Details",
        questions: [
          {
            id: "ev-charger-details",
            label:
              "For EV charger: vehicle model and desired charger location/type (Level 2)?",
            type: "textarea",
          },
          {
            id: "existing-systems",
            label: "Any existing solar, battery, or generator?",
            type: "textarea",
          },
          {
            id: "home-age",
            label: "Home age and any known wiring type?",
            type: "text",
          },
        ],
      },
      {
        title: "Logistics",
        questions: [
          {
            id: "timeline",
            label: "Timeline and any permit / HOA considerations?",
            type: "text",
          },
          {
            id: "photos",
            label:
              "Upload clear photos: main panel (door open, safely), meter, and areas where work is needed.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Scoped quote with options. Many upgrades can be priced accurately with good photos and panel details.",
  },

  // ── Always Lit (Permanent Holiday Lighting) ─────────────────────────────────
  {
    key: "always-lit",
    title: "Permanent Holiday Lighting",
    matchKeywords: [
      "always lit",
      "permanent holiday",
      "permanent light",
      "holiday light",
      "always-lit",
    ],
    sections: [
      {
        title: "Coverage & Design",
        questions: [
          {
            id: "linear-feet",
            label:
              "Approximate linear feet of eaves, gutters, or rooflines to cover (or number of peaks / zones)?",
            type: "text",
          },
          {
            id: "home-style",
            label:
              "Home style and number of stories? Any unique architectural features?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Features Desired",
        questions: [
          {
            id: "lighting-style",
            label: "Lighting style",
            type: "single-choice",
            options: [
              "Color-changing (RGB)",
              "Warm white / tunable",
              "Both",
            ],
          },
          {
            id: "smart-controls",
            label: "Smart controls (select all that apply)",
            type: "multi-choice",
            options: [
              "App",
              "Scheduling",
              "Voice integration",
              "Music sync",
              "Independent zones",
            ],
          },
          {
            id: "permanent-mounting",
            label:
              "Permanent mounting hardware that stays up year-round?",
            type: "boolean",
          },
          {
            id: "year-round-use",
            label: "Intended use",
            type: "single-choice",
            options: [
              "Year-round architectural lighting",
              "Holiday-specific use",
              "Both",
            ],
          },
        ],
      },
      {
        title: "Power & Installation",
        questions: [
          {
            id: "power-sources",
            label:
              "Available power sources near the areas to be lit?",
            type: "textarea",
          },
          {
            id: "hoa",
            label: "Any HOA restrictions?",
            type: "textarea",
          },
          {
            id: "install-type",
            label: "Installation preference",
            type: "single-choice",
            options: ["Professional installation", "Kits / components (DIY)"],
          },
        ],
      },
      {
        title: "Logistics",
        questions: [
          {
            id: "budget",
            label: "Budget range (per linear foot or total)?",
            type: "text",
          },
          {
            id: "photos",
            label:
              "Upload photos: full exterior views of eaves/gutters/rooflines from multiple angles, power sources/outlets, and any existing lighting.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote: "Design + pricing by footage and feature tier.",
  },

  // ── Surge Protection ────────────────────────────────────────────────────────
  {
    key: "surge",
    title: "Surge Protection",
    matchKeywords: ["surge"],
    sections: [
      {
        title: "Protection Level",
        questions: [
          {
            id: "protection-level",
            label: "Protection level",
            type: "single-choice",
            options: [
              "Whole-home surge protector (installed at main panel)",
              "Point-of-use devices for specific equipment",
              "Layered approach",
            ],
          },
          {
            id: "equipment",
            label:
              "What sensitive equipment do you want to protect? (Electronics, appliances, home office, medical devices, solar inverter, EV charger, etc.)",
            type: "textarea",
          },
        ],
      },
      {
        title: "Electrical System Details",
        questions: [
          {
            id: "panel-details",
            label:
              "Main panel amperage, brand, age/condition, and location?",
            type: "text",
          },
          {
            id: "surge-history",
            label:
              "Any history of power surges or damaged equipment?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Preferences",
        questions: [
          {
            id: "monitoring",
            label:
              "Interest in monitoring features or integration with other energy systems?",
            type: "textarea",
          },
          {
            id: "photos",
            label:
              "Upload photos: main electrical panel (safely) and meter.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Simple add-on pricing. Can often be bundled with electrical, generator, or solar projects.",
  },

  // ── Energy Monitoring ───────────────────────────────────────────────────────
  {
    key: "energy-monitoring",
    title: "Energy Monitoring",
    matchKeywords: ["energy monitor", "monitoring"],
    sections: [
      {
        title: "Goals",
        questions: [
          {
            id: "primary-reasons",
            label:
              "Primary reasons for monitoring? (select all that apply)",
            type: "multi-choice",
            options: [
              "Understand usage patterns & savings",
              "Optimize solar production vs. consumption",
              "Track EV charging",
              "Detect issues early",
              "Integrate with battery / generator",
              "Other",
            ],
          },
        ],
      },
      {
        title: "Current Setup",
        questions: [
          {
            id: "smart-meter",
            label: "Do you have a utility smart meter?",
            type: "boolean",
          },
          {
            id: "existing-systems",
            label:
              "Any existing solar inverter / monitoring system, battery, or EV charger?",
            type: "textarea",
          },
          {
            id: "circuits-to-track",
            label:
              "Major circuits or appliances you want to track individually (AC, water heater, EV, dryer, etc.)?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Features & Integration",
        questions: [
          {
            id: "granularity",
            label: "Desired granularity",
            type: "single-choice",
            options: ["Whole-home only", "Individual circuits"],
          },
          {
            id: "app-prefs",
            label: "App / dashboard preferences (select all that apply)",
            type: "multi-choice",
            options: [
              "Real-time data",
              "Historical trends",
              "Alerts",
              "Data export",
              "Integration with other smart home systems",
            ],
          },
          {
            id: "privacy",
            label: "Any privacy or data-sharing concerns?",
            type: "textarea",
          },
        ],
      },
      {
        title: "Logistics",
        questions: [
          {
            id: "photos",
            label:
              "Upload photos: main electrical panel(s) and utility meter.",
            type: "file",
          },
        ],
      },
    ],
    outcomeNote:
      "Recommended solution + pricing. Strong upsell or bundle item with solar, generator, or HVAC projects.",
  },
];

export function getQuestionsForService(
  serviceName: string,
): QuestionSet | null {
  const lower = serviceName.toLowerCase();
  for (const set of QUESTION_SETS) {
    for (const kw of set.matchKeywords) {
      if (lower.includes(kw.toLowerCase())) return set;
    }
  }
  return null;
}
