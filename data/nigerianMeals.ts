export interface NigerianMeal {
  id: string;
  name: string;
  localNames?: string[];
  region: 'South-West' | 'South-East' | 'North' | 'South-South' | 'Pan-Nigerian';
  category: 'Soups & Swallows' | 'Rice & Grains' | 'Grills & Proteins' | 'Snacks & Legumes' | 'Breakfast & Porridge';
  servingSize: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  glycemicIndex: 'Low' | 'Moderate' | 'High';
  glycemicIndexValue: number;
  sodiumLevel: 'Low' | 'Moderate' | 'High';
  oilContent: 'Low' | 'Moderate' | 'High';
  keyIngredients: string[];
  healthBenefits: string[];
  dietarySuitability: {
    hypertension: 'Excellent' | 'Moderate' | 'Limit Portion' | 'Avoid High Salt';
    diabetes: 'Suitable (Low GI)' | 'Moderate' | 'Watch Portion (High GI)';
    genotypeAS_SS: string;
    bloodGroupNotes?: string;
  };
  localNutritionalStandard: {
    recommendedFrequency: 'Daily Staple' | '2-3x Weekly' | 'Occasional / Festive';
    nisRating: 'Nutritious & Balanced' | 'Energy-Dense Staple' | 'High Fiber / Gut Health' | 'High Protein / Lean';
    portionTip: string;
  };
  description: string;
}

export const NIGERIAN_MEALS_DATABASE: NigerianMeal[] = [
  {
    id: 'jollof_rice_chicken',
    name: 'Nigerian Jollof Rice with Grilled Chicken & Dodo',
    localNames: ['Jollof Rice', 'Party Jollof'],
    region: 'Pan-Nigerian',
    category: 'Rice & Grains',
    servingSize: '1 plate (350g)',
    calories: 580,
    protein: '28g',
    carbs: '72g',
    fat: '18g',
    fiber: '4.5g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 62,
    sodiumLevel: 'Moderate',
    oilContent: 'Moderate',
    keyIngredients: ['Long grain parboiled rice', 'Tomato & Tatase puree', 'Vegetable oil', 'Seasoning spices', 'Grilled chicken breast', 'Fried ripe plantain'],
    healthBenefits: [
      'Lycopene from cooked tomatoes provides powerful anti-inflammatory antioxidants.',
      'Chicken breast yields high lean protein supporting muscle repair and metabolic health.',
      'Potassium from plantains assists in electrolyte balance and blood pressure regulation.'
    ],
    dietarySuitability: {
      hypertension: 'Moderate',
      diabetes: 'Watch Portion (High GI)',
      genotypeAS_SS: 'Provides essential B-vitamins and iron from tomato-pepper base and lean poultry.',
      bloodGroupNotes: 'Ideal for Blood Group O & B; Blood Group A should limit heavy palm/vegetable oil seasoning.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Pair with fresh cucumber slices or steamed garden eggs to lower the overall meal Glycemic Load.'
    },
    description: 'A national staple cooked in rich tomato-pepper broth with aromatic herbs, served alongside grilled lean chicken and sweet plantains.'
  },
  {
    id: 'pounded_yam_egusi',
    name: 'Pounded Yam with Egusi Soup & Assorted Meat',
    localNames: ['Iyan ATI Egusi', 'Utara na Ofe Egusi'],
    region: 'South-West',
    category: 'Soups & Swallows',
    servingSize: '1 medium wrap + soup (400g)',
    calories: 720,
    protein: '32g',
    carbs: '84g',
    fat: '28g',
    fiber: '6g',
    glycemicIndex: 'High',
    glycemicIndexValue: 75,
    sodiumLevel: 'Moderate',
    oilContent: 'Moderate',
    keyIngredients: ['Pounded white yam', 'Melon seeds (Egusi)', 'Palm oil', 'Ugwu (Pumpkin leaves)', 'Stockfish', 'Beef & Cow tripe'],
    healthBenefits: [
      'Melon seeds are rich in healthy polyunsaturated fats, zinc, and magnesium.',
      'Ugwu leaves provide iron, folate, and essential Vitamin A for immune defence.',
      'Stockfish supplies bioavailable collagen and essential amino acids.'
    ],
    dietarySuitability: {
      hypertension: 'Limit Portion',
      diabetes: 'Watch Portion (High GI)',
      genotypeAS_SS: 'High iron and folate content in Ugwu leaves supports hemoglobin synthesis for AS & SS genotypes.',
      bloodGroupNotes: 'Heavy yam starch benefits active Blood Group O individuals; Group A should keep swallow portion small.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Energy-Dense Staple',
      portionTip: 'Reduce yam wrap size to fist-size (approx. 150g) and double the vegetable Egusi soup portion.'
    },
    description: 'Smooth, elastic pounded yam paired with rich melon seed soup cooked with dark green leafy vegetables and tender meats.'
  },
  {
    id: 'amala_abula',
    name: 'Amala (Yam Flour) with Abula (Ewedu, Gbegiri & Stew)',
    localNames: ['Amala ATI Ewedu', 'Amala Abula', 'Amala Ogede / Dudu'],
    region: 'South-West',
    category: 'Soups & Swallows',
    servingSize: '1 wrap + mixed soups (380g)',
    calories: 460,
    protein: '22g',
    carbs: '68g',
    fat: '12g',
    fiber: '11.5g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 48,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Elubo (Unpeeled dried yam flour)', 'Jute leaves (Ewedu)', 'Yellow cowpea flour (Gbegiri)', 'Locust beans (Iru)', 'Tomato-pepper stew', 'Boiled beef'],
    healthBenefits: [
      'Very high dietary fiber from dried yam peel reduces cholesterol and regulates gut motility.',
      'Ewedu mucilage calms stomach lining and supports slow glucose absorption (Low GI).',
      'Locust beans (Iru) provide prebiotic fermented nutrients and natural umami without excess sodium.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Gbegiri black-eyed pea soup delivers high plant iron and folate essential for red blood cell renewal.',
      bloodGroupNotes: 'Extremely beneficial for Blood Groups A, AB, and O due to high fiber and gut-friendly mucilage.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Daily Staple',
      nisRating: 'High Fiber / Gut Health',
      portionTip: 'One of the healthier traditional swallows in Nigeria thanks to its low glycemic impact and high soluble fiber.'
    },
    description: 'A classic Oyo-Yoruba delicacy made from fermented unpeeled yam flour, served with slimy jute leaf soup, golden cowpea stew, and locust bean stew.'
  },
  {
    id: 'eba_okra_soup',
    name: 'Yellow Eba (Garri) with Okra & Fresh Fish Soup',
    localNames: ['Eba na Ofe Okwuru', 'Garri ATI Ila'],
    region: 'Pan-Nigerian',
    category: 'Soups & Swallows',
    servingSize: '1 medium wrap + soup (360g)',
    calories: 510,
    protein: '26g',
    carbs: '70g',
    fat: '14g',
    fiber: '9g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 58,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Cassava garri (Yellow or White)', 'Fresh diced okra', 'Catfish / Tilapia', 'Crayfish', 'Locust beans', 'Palm oil'],
    healthBenefits: [
      'Okra mucilage traps cholesterol in digestive tract and lowers post-meal blood sugar spikes.',
      'Fresh fish supplies omega-3 fatty acids vital for cardiovascular and cognitive wellness.',
      'Crayfish adds natural calcium and protein without excessive calorie density.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Omega-3 fatty acids in fresh fish reduce microvascular inflammation in Sickle Cell (SS/AS) individuals.',
      bloodGroupNotes: 'Well tolerated across all blood groups. Highly recommended for Blood Group A & AB.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Daily Staple',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Opt for light yellow or white garri steeped in warm water for lower carbohydrate density.'
    },
    description: 'Steeped fermented cassava swallow accompanied by vibrant green fresh okra soup enriched with fresh fish, crayfish, and traditional spices.'
  },
  {
    id: 'beef_suya',
    name: 'Northern Beef Suya with Fresh Onions & Cabbage',
    localNames: ['Suya', 'Tsire'],
    region: 'North',
    category: 'Grills & Proteins',
    servingSize: '1 skewer / wrap (200g)',
    calories: 380,
    protein: '42g',
    carbs: '8g',
    fat: '18g',
    fiber: '2.5g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 20,
    sodiumLevel: 'Moderate',
    oilContent: 'Low',
    keyIngredients: ['Lean beef strips', 'Yaji spice mix (Groundnut cake, Ginger, Chili, Garlic, Cloves)', 'Peanut oil coating', 'Sliced red onions', 'Cabbage', 'Tomatoes'],
    healthBenefits: [
      'High protein concentration aids lean muscle mass retention and high satiety.',
      'Yaji spice blend contains ginger and garlic which offer natural antimicrobial and vascular benefits.',
      'Raw onion and cabbage garnish provide quercetin, sulfur compounds, and dietary fiber.'
    ],
    dietarySuitability: {
      hypertension: 'Moderate',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'High bioavailable heme iron and zinc support optimal oxygen transport and red blood cell production.',
      bloodGroupNotes: 'Exceptional protein source for Blood Group O & B. Blood Group A should moderate heavy beef intake.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'High Protein / Lean',
      portionTip: 'Consume with plenty of raw cabbage, tomatoes, and onions to buffer sodium and boost digestive transit.'
    },
    description: 'Thinly sliced boneless beef marinated in spicy peanut Yaji spice blend, wood-grilled to perfection and served with fresh vegetables.'
  },
  {
    id: 'tuwo_shinkafa_kuka',
    name: 'Tuwo Shinkafa with Miyan Kuka & Beef',
    localNames: ['Tuwon Shinkafa da Miyan Kuka'],
    region: 'North',
    category: 'Soups & Swallows',
    servingSize: '1 swallow wrap + soup (380g)',
    calories: 490,
    protein: '24g',
    carbs: '74g',
    fat: '11g',
    fiber: '8.5g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 60,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Soft short-grain rice', 'Powdered baobab leaves (Kuka)', 'Dried fish', 'Beef', 'Dawa dawa (Locust bean paste)', 'Chili pepper'],
    healthBenefits: [
      'Baobab leaf powder (Kuka) is a superfood extraordinarily high in Vitamin C, calcium, and prebiotics.',
      'Easily digestible rice swallow provides smooth energy without digestive heavy burden.',
      'Dawa dawa enhances gut microbiota health and cardiovascular micro-circulation.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Moderate',
      genotypeAS_SS: 'Baobab powder Vitamin C enhances dietary iron absorption essential for AS and SS genotypes.',
      bloodGroupNotes: 'Hypoallergenic and gentle on all blood groups.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Baobab leaf soup is an ancient nutrient powerhouse—enjoy generous ladlefuls over moderate Tuwo.'
    },
    description: 'A traditional Hausa staple made from mashed soft rice dough, paired with nutrient-dense baobab leaf soup and tender beef.'
  },
  {
    id: 'moi_moi',
    name: 'Steamed Bean Pudding (Moi Moi) with Egg & Fish',
    localNames: ['Moi-Moi Elemi Meji', 'Moin Moin'],
    region: 'Pan-Nigerian',
    category: 'Snacks & Legumes',
    servingSize: '1 leaf wrap / container (220g)',
    calories: 290,
    protein: '19g',
    carbs: '32g',
    fat: '9g',
    fiber: '7g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 35,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Peeled brown beans (Ewa Oloyin)', 'Red bell peppers (Tatase)', 'Onions', 'Vegetable oil', 'Hard-boiled egg', 'Mackerel fish flakes'],
    healthBenefits: [
      'High plant protein and complex fiber promote prolonged fullness and glucose stabilization.',
      'Rich in B-vitamins, magnesium, and potassium supporting metabolic health.',
      'Steamed in leaf wraps (Ewe Iran) retaining natural plant flavonoids without frying acrylamides.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Plentiful natural folate and iron promote red blood cell formation and tissue oxygenation.',
      bloodGroupNotes: 'Ideal for Blood Groups A, AB, and B. Group O benefits from added fish and egg protein.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Daily Staple',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'One of Nigeria’s most nutrient-complete dishes—great as a main breakfast or healthy lunch side.'
    },
    description: 'Steamed savory bean pudding made from blended peeled cowpeas, bell peppers, onions, eggs, and mackerel fish.'
  },
  {
    id: 'ofada_rice_ayamase',
    name: 'Unpolished Ofada Rice with Ayamase (Designer Stew)',
    localNames: ['Ofada Rice', 'Ayamase', 'Designer Rice'],
    region: 'South-West',
    category: 'Rice & Grains',
    servingSize: '1 leaf wrap meal (350g)',
    calories: 610,
    protein: '25g',
    carbs: '68g',
    fat: '26g',
    fiber: '6.5g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 50,
    sodiumLevel: 'Moderate',
    oilContent: 'Moderate',
    keyIngredients: ['Short-grain unpolished Ofada rice', 'Green bell peppers & Scotch bonnet', 'Bleached palm oil', 'Iru (Locust beans)', 'Assorted meats (Shaki, Kpomo, Beef)', 'Boiled egg'],
    healthBenefits: [
      'Unpolished Ofada rice retains its nutrient-dense bran layer rich in B-complex vitamins, magnesium, and fiber.',
      'Locust beans deliver natural probiotics and bioactive fermented enzymes.',
      'Lower glycemic response compared to imported white parboiled rice.'
    ],
    dietarySuitability: {
      hypertension: 'Moderate',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Unpolished bran layer provides natural copper, manganese, and iron.',
      bloodGroupNotes: 'Suitable for all blood groups; request moderate palm oil stew portion for optimal lipid profile.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'High Fiber / Gut Health',
      portionTip: 'Prefer traditional Ofada cooked in leaf wraps for natural aroma and unpolished nutritional superiority.'
    },
    description: 'Aromatic unpolished short-grain brown rice served in banana leaves with green pepper, locust bean, and palm oil stew.'
  },
  {
    id: 'edikang_ikong',
    name: 'Edikang Ikong Vegetable Soup with Semovita',
    localNames: ['Edikang Ikong', 'Ofe Ugwu na Waterleaf'],
    region: 'South-South',
    category: 'Soups & Swallows',
    servingSize: '1 plate + wrap (420g)',
    calories: 520,
    protein: '34g',
    carbs: '62g',
    fat: '16g',
    fiber: '10g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 55,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Ugwu (Fluted pumpkin leaves)', 'Waterleaf', 'Dried stockfish head', 'Crayfish', 'Beef & Goat meat', 'Palm oil'],
    healthBenefits: [
      'Dense concentrations of chlorophyll, carotenoids, and antioxidants protect cellular health.',
      'Waterleaf acts as a natural digestive hydrator and gentle stool softener.',
      'High iron and calcium density strengthen bone structure and blood cell replenishment.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Gold standard for Genotype AS & SS due to massive iron, folate, and antioxidant density in Ugwu leaves.',
      bloodGroupNotes: 'Highly suitable across all blood groups.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Daily Staple',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'The ultimate nutrient-dense Nigerian vegetable soup—pair with light swallow or enjoy as a stew on its own.'
    },
    description: 'Efik-Ibibio luxury vegetable soup made with generous portions of pumpkin leaves, waterleaf, stockfish, and tender meats.'
  },
  {
    id: 'banga_soup_starch',
    name: 'Banga Soup (Ofe Akwu) with Yellow Starch',
    localNames: ['Banga ATI Starch', 'Ofe Akwu', 'Amiedi'],
    region: 'South-South',
    category: 'Soups & Swallows',
    servingSize: '1 plate + starch (400g)',
    calories: 680,
    protein: '29g',
    carbs: '76g',
    fat: '28g',
    fiber: '5g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 62,
    sodiumLevel: 'Moderate',
    oilContent: 'High',
    keyIngredients: ['Palm fruit extract', 'Banga spice mix (Beletete, Oburunbebe stick)', 'Catfish / Bushmeat', 'Dried crayfish', 'Beletete leaves', 'Cassava starch'],
    healthBenefits: [
      'Unrefined palm fruit extract is naturally rich in Vitamin E (Tocotrienols) and Beta-carotene.',
      'Banga herbal spice sticks deliver anti-inflammatory phytonutrients.',
      'Fresh catfish provides high quality lean protein and omega-3 lipids.'
    ],
    dietarySuitability: {
      hypertension: 'Limit Portion',
      diabetes: 'Moderate',
      genotypeAS_SS: 'High natural beta-carotene and Vitamin E help protect red blood cell membranes against oxidative fragility.',
      bloodGroupNotes: 'Best suited for active Blood Group O individuals.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Occasional / Festive',
      nisRating: 'Energy-Dense Staple',
      portionTip: 'Skim excess surface oil before serving and moderate the cassava starch wrap size.'
    },
    description: 'Niger Delta palm fruit soup seasoned with indigenous Banga herbs and spices, served with pliable yellow cassava starch.'
  },
  {
    id: 'ewa_aganyin_dodo',
    name: 'Ewa Aganyin (Mashed Beans) with Spicy Stew & Dodo',
    localNames: ['Ewa Aganyin', 'Ewa ATI Dodo'],
    region: 'South-West',
    category: 'Snacks & Legumes',
    servingSize: '1 plate (320g)',
    calories: 480,
    protein: '21g',
    carbs: '66g',
    fat: '15g',
    fiber: '12g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 42,
    sodiumLevel: 'Low',
    oilContent: 'Moderate',
    keyIngredients: ['Soft boiled brown beans', 'Dark caramelized onion-chili pepper oil', 'Fried plantain (Dodo)', 'Fried fish'],
    healthBenefits: [
      'Exceptional dietary fiber content (12g per serving) dramatically improves lipid profiles and gut biome health.',
      'Low Glycemic Index ensures sustained stamina without insulin spikes.',
      'Rich source of plant iron, molybdenum, and potassium.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Supports steady erythropoiesis with abundant iron and plant folate.',
      bloodGroupNotes: 'Extremely beneficial for Blood Group A, AB, and O.'
    },
    localNutritionalStandard: {
      recommendedFrequency: 'Daily Staple',
      nisRating: 'High Fiber / Gut Health',
      portionTip: 'A high-fiber powerhouse meal. Keep dark pepper sauce to 2 tablespoons to limit saturated fat.'
    },
    description: 'Soft-mashed honey beans served with signature dark, slow-fried spicy onion chili sauce and golden fried plantains.'
  },
  {
    id: 'akara_pap',
    name: 'Akara (Fried Bean Cakes) with Ogi / Pap',
    localNames: ['Akara ATI Ogi', 'Kosai da Koko', 'Akara na Akamu'],
    region: 'Pan-Nigerian',
    category: 'Breakfast & Porridge',
    servingSize: '4 akara balls + 1 bowl pap (300g)',
    calories: 390,
    protein: '16g',
    carbs: '58g',
    fat: '11g',
    fiber: '6g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 54,
    sodiumLevel: 'Low',
    oilContent: 'Moderate',
    keyIngredients: ['Whipped brown bean paste', 'Onions', 'Fresh chili', 'Vegetable oil for light frying', 'Fermented corn pap (Ogi/Akamu)', 'Milk/Honey'],
    healthBenefits: [
      'Fermented corn pap (Ogi) supplies natural probiotics and organic lactic acids for gut microflora.',
      'Bean protein in Akara balances the carb content of pap.',
      'Easily digested breakfast option providing gentle morning nourishment.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Moderate',
      genotypeAS_SS: 'Bean protein and fermented Ogi nutrients aid stamina.',
      bloodGroupNotes: 'Well tolerated breakfast for all blood groups.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Ensure vegetable oil is hot before frying Akara balls to minimize oil absorption.'
    },
    description: 'Crispy golden bean fritters made from whipped cowpea puree, paired with warm fermented corn silk porridge.'
  },
  {
    id: 'pepper_soup_goat',
    name: 'Nigerian Goat Meat Pepper Soup',
    localNames: ['Ofe Nsala Goat', 'Ogun Pepper Soup', 'Ofe Pepper Soup'],
    region: 'Pan-Nigerian',
    category: 'Soups & Swallows',
    servingSize: '1 bowl (300ml)',
    calories: 260,
    protein: '30g',
    carbs: '6g',
    fat: '12g',
    fiber: '1.5g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 15,
    sodiumLevel: 'Moderate',
    oilContent: 'Low',
    keyIngredients: ['Lean goat meat / Chunk cut', 'Pepper soup spice mix (Uda, Ehuru, Uziza seeds)', 'Scent leaves (Efirin/Nchanwu)', 'Chili pepper', 'Ginger & Garlic'],
    healthBenefits: [
      'Uziza and Ehuru indigenous spices act as potent decongestants, anti-inflammatories, and circulatory stimulants.',
      'Goat meat is leaner and lower in saturated fat than beef or mutton.',
      'Scent leaves (Efirin) offer natural antibacterial properties and soothe respiratory airways.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Warm aromatic broth with zinc-rich goat meat boosts circulatory flow and pain relief during cold weather.',
      bloodGroupNotes: 'Outstanding for Blood Group O & B; light and beneficial for Blood Group A.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'High Protein / Lean',
      portionTip: 'A medicinal and therapeutic meal—perfect for recovery, flu relief, and low-calorie protein intake.'
    },
    description: 'Aromatic therapeutic broth infused with calabash nutmeg, Uda pods, scent leaves, and tender chunks of lean goat meat.'
  },
  {
    id: 'bole_fish',
    name: 'Bole (Roasted Plantain) with Grilled Tilapia & Pepper Sauce',
    localNames: ['Bole na Okporoko', 'Bole ATI Eja'],
    region: 'South-South',
    category: 'Grills & Proteins',
    servingSize: '1 plantain + 1 fish piece (350g)',
    calories: 450,
    protein: '32g',
    carbs: '54g',
    fat: '11g',
    fiber: '5.5g',
    glycemicIndex: 'Low',
    glycemicIndexValue: 45,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['Unripe or semi-ripe charcoal roasted plantain', 'Whole grilled Tilapia or Croaker fish', 'Utazi leaves', 'Spicy palm oil sauce', 'Onions'],
    healthBenefits: [
      'Roasted unripe plantain is rich in resistant starch that feeds beneficial gut bacteria and prevents glucose spikes.',
      'Char-grilled fish provides clean protein, phosphorus, and omega-3 fatty acids without deep frying.',
      'Utazi leaves provide bitter bioflavonoids that stimulate bile production and metabolic detoxification.'
    ],
    dietarySuitability: {
      hypertension: 'Excellent',
      diabetes: 'Suitable (Low GI)',
      genotypeAS_SS: 'Resistant starch and high potassium aid vascular elasticity and steady cellular hydration.',
      bloodGroupNotes: 'Highly suitable across all blood groups.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Request unripe or firm roasted plantain rather than overly ripe dodo for maximum low-GI resistant starch benefits.'
    },
    description: 'Port Harcourt style charcoal-roasted plantain paired with seasoned grilled fish, bitter Utazi leaf shreds, and spicy palm oil dip.'
  },
  {
    id: 'yam_asaro',
    name: 'Yam Porridge (Asaro) with Ugwu & Dried Fish',
    localNames: ['Asaro', 'Yam Porridge', 'Asaro ATI Eja Kika'],
    region: 'Pan-Nigerian',
    category: 'Breakfast & Porridge',
    servingSize: '1 plate (350g)',
    calories: 490,
    protein: '20g',
    carbs: '76g',
    fat: '12g',
    fiber: '6g',
    glycemicIndex: 'Moderate',
    glycemicIndexValue: 64,
    sodiumLevel: 'Low',
    oilContent: 'Low',
    keyIngredients: ['White yam cubes', 'Palm oil', 'Tomato-pepper paste', 'Dried smoked fish', 'Crayfish', 'Ugwu leaves'],
    healthBenefits: [
      'Yam tubers provide sustained complex energy along with copper, manganese, and dietary fiber.',
      'Smoked fish supplies protein and bioavailable calcium from edible soft bones.',
      'Ugwu greens furnish essential folate and beta-carotene.'
    ],
    dietarySuitability: {
      hypertension: 'Moderate',
      diabetes: 'Moderate',
      genotypeAS_SS: 'Good source of iron and Vitamin C when prepared with generous green Ugwu leaves.',
      bloodGroupNotes: 'Well tolerated by Blood Group O & B; Group A should keep portions moderate.'
    },
    localNutritionalStandard: {
      recommendedFrequency: '2-3x Weekly',
      nisRating: 'Nutritious & Balanced',
      portionTip: 'Mash porridge lightly to preserve fiber structure and add fresh greens right before turning off flame.'
    },
    description: 'Savory stewed yam cubes simmered in palm oil pepper broth with smoked fish and finished with fresh leafy Ugwu greens.'
  }
];

/**
 * Cross-references a food string against the Nigerian Meals Database.
 * Returns the matching NigerianMeal or closest match based on keyword search.
 */
export function findMatchingNigerianMeal(query: string): NigerianMeal | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // 1. Direct or Local Name Exact/Partial Match
  for (const meal of NIGERIAN_MEALS_DATABASE) {
    if (q.includes(meal.name.toLowerCase())) return meal;
    if (meal.localNames && meal.localNames.some(ln => q.includes(ln.toLowerCase()))) return meal;
  }

  // 2. Keyword Fuzzy Matching
  const keywordMap: { [key: string]: string } = {
    'jollof': 'jollof_rice_chicken',
    'fried rice': 'jollof_rice_chicken',
    'pounded yam': 'pounded_yam_egusi',
    'iyan': 'pounded_yam_egusi',
    'egusi': 'pounded_yam_egusi',
    'amala': 'amala_abula',
    'ewedu': 'amala_abula',
    'gbegiri': 'amala_abula',
    'abula': 'amala_abula',
    'elubo': 'amala_abula',
    'eba': 'eba_okra_soup',
    'garri': 'eba_okra_soup',
    'gari': 'eba_okra_soup',
    'okra': 'eba_okra_soup',
    'okro': 'eba_okra_soup',
    'suya': 'beef_suya',
    'tsire': 'beef_suya',
    'yaji': 'beef_suya',
    'tuwo': 'tuwo_shinkafa_kuka',
    'kuka': 'tuwo_shinkafa_kuka',
    'moi moi': 'moi_moi',
    'moin moin': 'moi_moi',
    'ofada': 'ofada_rice_ayamase',
    'ayamase': 'ofada_rice_ayamase',
    'edikang': 'edikang_ikong',
    'edikaikong': 'edikang_ikong',
    'banga': 'banga_soup_starch',
    'ofe akwu': 'banga_soup_starch',
    'starch': 'banga_soup_starch',
    'aganyin': 'ewa_aganyin_dodo',
    'ewa': 'ewa_aganyin_dodo',
    'beans': 'ewa_aganyin_dodo',
    'akara': 'akara_pap',
    'pap': 'akara_pap',
    'ogi': 'akara_pap',
    'akamu': 'akara_pap',
    'kosai': 'akara_pap',
    'pepper soup': 'pepper_soup_goat',
    'goat meat': 'pepper_soup_goat',
    'bole': 'bole_fish',
    'roasted plantain': 'bole_fish',
    'asaro': 'yam_asaro',
    'yam porridge': 'yam_asaro'
  };

  for (const [kw, mealId] of Object.entries(keywordMap)) {
    if (q.includes(kw)) {
      return NIGERIAN_MEALS_DATABASE.find(m => m.id === mealId) || null;
    }
  }

  return null;
}
