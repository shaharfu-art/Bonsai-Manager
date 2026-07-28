-- Run this in Supabase SQL Editor to add new species
-- It checks for duplicates by name_latin before inserting

INSERT INTO species (name_he, name_en, name_latin, type, is_system)
SELECT * FROM (VALUES
  ('ברוש ביצות', 'Bald Cypress', 'Taxodium distichum', 'deciduous', true),
  ('שקמה', 'Sycamore Fig', 'Ficus sycomorus', 'tropical', true),
  ('אוג', 'Sumac', 'Rhus coriaria', 'deciduous', true),
  ('ליגיסטריום', 'Privet', 'Ligustrum sinense', 'temperate', true),
  ('ינבוט', 'Jujube', 'Ziziphus spina-christi', 'tropical', true),
  ('שיטה', 'Acacia', 'Vachellia tortilis', 'tropical', true),
  ('ג׳יראף', 'Giraffe Thorn', 'Vachellia erioloba', 'tropical', true),
  ('פלפלון', 'Brazilian Pepper Tree', 'Schinus terebinthifolia', 'tropical', true),
  ('מללויקה', 'Melaleuca', 'Melaleuca alternifolia', 'tropical', true),
  ('גודגדן', 'Hawthorn', 'Crataegus monogyna', 'deciduous', true),
  ('פרוקרפוס', 'Yellowwood', 'Podocarpus macrophyllus', 'conifer', true),
  ('מסנס', 'Mesquite', 'Prosopis juliflora', 'tropical', true),
  ('ברוש דליל / אטלנטי', 'Atlantic Cedar', 'Cedrus atlantica', 'conifer', true),
  ('רוזמרין', 'Rosemary', 'Salvia rosmarinus', 'temperate', true)
) AS new_species(name_he, name_en, name_latin, type, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM species 
  WHERE species.name_latin = new_species.name_latin
);
