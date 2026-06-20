-- Seed data: 10 common bonsai species with seasonal care rules
-- All species are system-managed (is_system = true)

INSERT INTO species (name_he, name_en, name_latin, type, seasonal_care_rules, is_system) VALUES

-- 1. Ficus / פיקוס
(
  'פיקוס',
  'Ficus',
  'Ficus retusa',
  'tropical',
  '{
    "spring": {
      "watering": {"interval_days": 3, "notes": "Increase watering as growth resumes"},
      "fertilizing": {"interval_days": 14, "notes": "Start balanced fertilizer (N-P-K 10-10-10)"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2-3 years in spring"},
      "branch_pruning": {"interval_days": 30, "notes": "Shape and prune new growth"}
    },
    "summer": {
      "watering": {"interval_days": 2, "notes": "Water daily in hot weather, check soil moisture"},
      "fertilizing": {"interval_days": 14, "notes": "Continue with balanced fertilizer"},
      "shading": {"interval_days": 90, "notes": "Protect from intense midday sun"}
    },
    "autumn": {
      "watering": {"interval_days": 4, "notes": "Reduce watering as growth slows"},
      "fertilizing": {"interval_days": 21, "notes": "Switch to low-nitrogen fertilizer"},
      "wiring": {"interval_days": 180, "notes": "Good time for styling – wood is flexible"}
    },
    "winter": {
      "watering": {"interval_days": 7, "notes": "Water sparingly, keep soil barely moist"},
      "fertilizing": {"interval_days": 30, "notes": "Minimal or no fertilizer"},
      "winter_dormancy": {"interval_days": 365, "notes": "Keep indoors above 15°C, protect from cold drafts"}
    }
  }'::jsonb,
  true
),

-- 2. Juniper / ערער
(
  'ערער',
  'Juniper',
  'Juniperus chinensis',
  'conifer',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Water regularly as growth resumes"},
      "fertilizing": {"interval_days": 14, "notes": "High nitrogen fertilizer for foliage growth"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2-3 years in early spring"},
      "branch_pruning": {"interval_days": 21, "notes": "Pinch new growth to maintain shape"}
    },
    "summer": {
      "watering": {"interval_days": 1, "notes": "Water daily, do not let roots dry out"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer"},
      "wiring": {"interval_days": 180, "notes": "Wire branches, check for wire bite"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce watering gradually"},
      "fertilizing": {"interval_days": 21, "notes": "Low nitrogen, high phosphorus and potassium"},
      "wire_removal": {"interval_days": 180, "notes": "Remove wires before growth hardens"}
    },
    "winter": {
      "watering": {"interval_days": 5, "notes": "Water when soil is almost dry"},
      "winter_dormancy": {"interval_days": 365, "notes": "Keep outdoors in cold but frost-free area"}
    }
  }'::jsonb,
  true
),

-- 3. Japanese Maple / מייפל יפני
(
  'מייפל יפני',
  'Japanese Maple',
  'Acer palmatum',
  'deciduous',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Water as leaves emerge, avoid waterlogging"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer as buds open"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2 years before buds open"},
      "branch_pruning": {"interval_days": 30, "notes": "Prune after leaves open, remove dead wood"}
    },
    "summer": {
      "watering": {"interval_days": 1, "notes": "Water daily, keep moist but not waterlogged"},
      "fertilizing": {"interval_days": 21, "notes": "Reduce nitrogen, increase potassium"},
      "shading": {"interval_days": 90, "notes": "Protect from afternoon sun to prevent leaf scorch"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce watering as leaves change colour"},
      "fertilizing": {"interval_days": 30, "notes": "Stop fertilizing once leaves begin to turn"},
      "wiring": {"interval_days": 180, "notes": "Wire deciduous branches after leaf fall"}
    },
    "winter": {
      "watering": {"interval_days": 7, "notes": "Water occasionally, keep roots from drying out"},
      "winter_dormancy": {"interval_days": 365, "notes": "Full dormancy – protect from hard frost below -10°C"}
    }
  }'::jsonb,
  true
),

-- 4. Chinese Elm / אלם סיני
(
  'אלם סיני',
  'Chinese Elm',
  'Ulmus parvifolia',
  'deciduous',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Water regularly as new leaves emerge"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer, high nitrogen"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2 years in early spring"},
      "branch_pruning": {"interval_days": 21, "notes": "Prune vigorously to refine ramification"}
    },
    "summer": {
      "watering": {"interval_days": 1, "notes": "Water daily in heat, mist foliage"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced or low nitrogen fertilizer"},
      "pest_treatment": {"interval_days": 30, "notes": "Check for spider mites and aphids"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce watering as growth slows"},
      "fertilizing": {"interval_days": 21, "notes": "Low nitrogen to harden growth"},
      "wiring": {"interval_days": 180, "notes": "Wire after partial defoliation"}
    },
    "winter": {
      "watering": {"interval_days": 5, "notes": "Keep soil slightly moist"},
      "winter_dormancy": {"interval_days": 365, "notes": "Semi-evergreen – may keep leaves in mild winters. Protect below -5°C"}
    }
  }'::jsonb,
  true
),

-- 5. Pine / אורן
(
  'אורן',
  'Pine',
  'Pinus thunbergii',
  'conifer',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Water as candles extend, do not overwater"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer as candles develop"},
      "branch_pruning": {"interval_days": 90, "notes": "Pinch candles by half to balance growth"}
    },
    "summer": {
      "watering": {"interval_days": 2, "notes": "Water when soil starts to dry"},
      "fertilizing": {"interval_days": 21, "notes": "Low or no fertilizer in midsummer heat"},
      "root_pruning": {"interval_days": 1460, "notes": "Repot and root prune every 3-5 years in midsummer"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Water less frequently"},
      "fertilizing": {"interval_days": 14, "notes": "High phosphorus and potassium fertilizer"},
      "wiring": {"interval_days": 180, "notes": "Best time for wiring pine branches"}
    },
    "winter": {
      "watering": {"interval_days": 7, "notes": "Water sparingly, only when dry"},
      "winter_dormancy": {"interval_days": 365, "notes": "Keep outdoors, protect from wet and wind"}
    }
  }'::jsonb,
  true
),

-- 6. Olive / זית
(
  'זית',
  'Olive',
  'Olea europaea',
  'temperate',
  '{
    "spring": {
      "watering": {"interval_days": 3, "notes": "Water moderately as growth resumes"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer as leaves emerge"},
      "repotting": {"interval_days": 1095, "season_only": true, "notes": "Repot every 3 years in spring"},
      "branch_pruning": {"interval_days": 30, "notes": "Shape and remove unwanted shoots"}
    },
    "summer": {
      "watering": {"interval_days": 2, "notes": "Olives are drought-tolerant but need water in heat"},
      "fertilizing": {"interval_days": 21, "notes": "Continue with balanced fertilizer"},
      "sun_exposure": {"interval_days": 90, "notes": "Full sun – minimum 6 hours per day"}
    },
    "autumn": {
      "watering": {"interval_days": 4, "notes": "Reduce watering"},
      "fertilizing": {"interval_days": 30, "notes": "Low nitrogen, high potassium to harden growth"},
      "wiring": {"interval_days": 180, "notes": "Wire in autumn for spring growth direction"}
    },
    "winter": {
      "watering": {"interval_days": 7, "notes": "Minimal watering, do not let roots freeze"},
      "winter_dormancy": {"interval_days": 365, "notes": "Hardy to about -10°C, protect younger trees"}
    }
  }'::jsonb,
  true
),

-- 7. Pomegranate / רימון
(
  'רימון',
  'Pomegranate',
  'Punica granatum',
  'tropical',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Increase watering as buds break"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer to encourage flowering"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2 years in early spring"},
      "branch_pruning": {"interval_days": 30, "notes": "Prune to shape before flowering begins"}
    },
    "summer": {
      "watering": {"interval_days": 2, "notes": "Keep evenly moist during fruiting"},
      "fertilizing": {"interval_days": 14, "notes": "High potassium to support fruit development"},
      "sun_exposure": {"interval_days": 90, "notes": "Needs full sun for flowering and fruiting"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce as leaves yellow"},
      "fertilizing": {"interval_days": 30, "notes": "Stop fertilizing after fruit ripens"},
      "wiring": {"interval_days": 180, "notes": "Wire after leaf drop for shaping"}
    },
    "winter": {
      "watering": {"interval_days": 10, "notes": "Very sparse watering during dormancy"},
      "winter_dormancy": {"interval_days": 365, "notes": "Deciduous in winter – protect from frost below -5°C"}
    }
  }'::jsonb,
  true
),

-- 8. Azalea / אזלאה
(
  'אזלאה',
  'Azalea',
  'Rhododendron indicum',
  'temperate',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Use rainwater or soft water; avoid hard tap water"},
      "fertilizing": {"interval_days": 14, "notes": "After flowering: balanced fertilizer; before: none"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot immediately after flowering"},
      "branch_pruning": {"interval_days": 30, "notes": "Prune immediately after flowering"}
    },
    "summer": {
      "watering": {"interval_days": 1, "notes": "Daily watering in heat, keep moist"},
      "fertilizing": {"interval_days": 14, "notes": "Acidic fertilizer for azaleas"},
      "shading": {"interval_days": 90, "notes": "Protect from intense afternoon sun"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce slightly, keep moist"},
      "fertilizing": {"interval_days": 21, "notes": "Low or no nitrogen to set buds"},
      "wiring": {"interval_days": 180, "notes": "Wire after summer growth hardens"}
    },
    "winter": {
      "watering": {"interval_days": 5, "notes": "Keep moist but not wet"},
      "winter_dormancy": {"interval_days": 365, "notes": "Keep cool but frost-free (0-5°C) for bud development"}
    }
  }'::jsonb,
  true
),

-- 9. Trident Maple / מייפל תלת-שיני
(
  'מייפל תלת-שיני',
  'Trident Maple',
  'Acer buergerianum',
  'deciduous',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Increase watering as buds break"},
      "fertilizing": {"interval_days": 14, "notes": "High nitrogen for vigorous growth"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2-3 years in early spring"},
      "branch_pruning": {"interval_days": 21, "notes": "Prune hard in spring for fine ramification"}
    },
    "summer": {
      "watering": {"interval_days": 1, "notes": "Water daily in summer heat"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced fertilizer"},
      "root_pruning": {"interval_days": 730, "notes": "Surface root work can be done in summer"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce as leaves change colour"},
      "fertilizing": {"interval_days": 21, "notes": "No nitrogen – harden the tree for winter"},
      "wiring": {"interval_days": 180, "notes": "Wire after leaf fall"}
    },
    "winter": {
      "watering": {"interval_days": 7, "notes": "Minimal watering during dormancy"},
      "winter_dormancy": {"interval_days": 365, "notes": "Fully dormant – protect from severe frost below -15°C"}
    }
  }'::jsonb,
  true
),

-- 10. Bougainvillea / בוגנוויליה
(
  'בוגנוויליה',
  'Bougainvillea',
  'Bougainvillea spectabilis',
  'tropical',
  '{
    "spring": {
      "watering": {"interval_days": 2, "notes": "Water as growth resumes; allow slight drying to trigger flowering"},
      "fertilizing": {"interval_days": 14, "notes": "High phosphorus fertilizer to encourage blooms"},
      "repotting": {"interval_days": 730, "season_only": true, "notes": "Repot every 2 years in spring"},
      "branch_pruning": {"interval_days": 30, "notes": "Hard prune in early spring before growth flush"}
    },
    "summer": {
      "watering": {"interval_days": 2, "notes": "Water moderately; slight stress promotes flowering"},
      "fertilizing": {"interval_days": 14, "notes": "Balanced with higher potassium during bloom"},
      "sun_exposure": {"interval_days": 90, "notes": "Full sun essential – minimum 6 hours for flowering"}
    },
    "autumn": {
      "watering": {"interval_days": 3, "notes": "Reduce watering to encourage dormancy"},
      "fertilizing": {"interval_days": 30, "notes": "Stop fertilizing to harden growth"},
      "wiring": {"interval_days": 180, "notes": "Wire main branches after flowering ends"}
    },
    "winter": {
      "watering": {"interval_days": 10, "notes": "Very sparse watering during rest period"},
      "winter_dormancy": {"interval_days": 365, "notes": "Tropical – protect from any frost; minimum 10°C"}
    }
  }'::jsonb,
  true
);
