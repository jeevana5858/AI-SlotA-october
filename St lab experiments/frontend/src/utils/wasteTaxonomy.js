window.EcoSort = window.EcoSort || {};

(function () {
  const CATEGORY_META = {
    'Wet Waste': {
      color: 'emerald',
      hex: '#16a34a',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-700',
      barBg: 'bg-emerald-500',
      binName: 'Green Compost Bin',
      points: 10,
      instructions:
        'Place in the Green Wet Waste bin. Remove any plastic stickers, rubber bands, or packaging before composting.',
    },
    'Dry Waste': {
      color: 'sky',
      hex: '#0284c7',
      badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
      border: 'border-sky-300 dark:border-sky-700',
      barBg: 'bg-sky-500',
      binName: 'Blue Recyclable Bin',
      points: 15,
      instructions:
        'Rinse food residue if plastic/cardboard, flatten boxes, keep dry, and deposit in the Blue Dry Waste bin.',
    },
    'Metal Waste': {
      color: 'amber',
      hex: '#d97706',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-700',
      barBg: 'bg-amber-500',
      binName: 'Grey Metal Bin',
      points: 25,
      instructions:
        'Empty and rinse cans or metal containers, handle sharp edges safely, and deposit in the Grey Metal Waste bin.',
    },
  };

  const WET_KEYWORDS = [
    'banana', 'apple', 'granny smith', 'orange', 'lemon', 'fig', 'pineapple', 'strawberry',
    'pomegranate', 'custard apple', 'jackfruit', 'broccoli', 'cauliflower', 'cabbage',
    'zucchini', 'cucumber', 'bell pepper', 'mushroom', 'carrot', 'potato', 'tomato',
    'corn', 'artichoke', 'squash', 'pumpkin', 'onion', 'garlic', 'mango', 'watermelon',
    'grape', 'pear', 'peach', 'plum', 'avocado', 'bread', 'bagel', 'pretzel', 'pizza',
    'burger', 'cheeseburger', 'hotdog', 'sandwich', 'burrito', 'taco', 'cake', 'pie',
    'pasta', 'spaghetti', 'rice', 'salad', 'soup', 'meat', 'steak', 'chicken', 'fish',
    'egg', 'leaf', 'flower', 'grass', 'soil', 'compost', 'espresso', 'coffee', 'tea',
    'guacamole', 'mashed potato', 'french loaf', 'dough', 'fruit', 'vegetable', 'peel',
  ];

  const METAL_KEYWORDS = [
    'can', 'tin', 'pop bottle', 'soda', 'aluminium', 'aluminum', 'foil', 'steel', 'iron',
    'nail', 'screw', 'bolt', 'wrench', 'hammer', 'pliers', 'screwdriver', 'kettle',
    'frying pan', 'wok', 'pot', 'ladle', 'spatula', 'spoon', 'fork', 'knife', 'cleaver',
    'scissors', 'key', 'padlock', 'chain', 'coin', 'watch', 'bicycle', 'toaster',
    'microwave', 'bucket', 'pail', 'barrel', 'drum', 'tray', 'wire', 'safety pin',
    'whistle', 'bell', 'lighter', 'battery', 'metal', 'brass', 'copper', 'thermos',
    'cocktail shaker', 'corkscrew', 'can opener', 'oil filter', 'radiator',
  ];

  const DRY_KEYWORDS = [
    'bottle', 'water bottle', 'plastic bag', 'shopping bag', 'carton', 'box', 'cardboard',
    'envelope', 'paper', 'newspaper', 'magazine', 'book', 'notebook', 'binder', 'folder',
    'packet', 'wrapper', 'cup', 'paper towel', 'tissue', 'toilet tissue', 'napkin',
    'straw', 'milk can', 'jug', 'jar', 'container', 'tub', 'crate', 'bag', 'backpack',
    'shoe', 'sneaker', 'sandal', 'shirt', 't-shirt', 'jersey', 'jean', 'sock', 'cloth',
    'towel', 'pillow', 'sponge', 'toothbrush', 'comb', 'pen', 'pencil', 'marker',
    'keyboard', 'mouse', 'remote', 'cassette', 'cd', 'disk', 'plastic', 'poly',
    'menu', 'comic book', 'dust jacket',
  ];

  function mapLabelToCategory(className) {
    const norm = (className || '').toLowerCase();
    for (const kw of METAL_KEYWORDS) {
      if (norm.includes(kw) && !norm.includes('ashcan') && !norm.includes('trash')) {
        return 'Metal Waste';
      }
    }
    for (const kw of WET_KEYWORDS) {
      if (norm.includes(kw)) return 'Wet Waste';
    }
    for (const kw of DRY_KEYWORDS) {
      if (norm.includes(kw)) return 'Dry Waste';
    }
    return null;
  }

  let modelPromise = null;
  let loadedModel = null;
  let modelLoadError = null;

  async function ensureModel() {
    if (loadedModel) return loadedModel;
    if (modelLoadError) throw modelLoadError;
    if (!window.mobilenet || !window.tf) {
      const err = new Error('TensorFlow.js / MobileNetV2 library is not available.');
      modelLoadError = err;
      throw err;
    }
    if (!modelPromise) {
      modelPromise = window.mobilenet
        .load({ version: 2, alpha: 1.0 })
        .then((m) => {
          loadedModel = m;
          return m;
        })
        .catch((err) => {
          modelLoadError = err;
          throw err;
        });
    }
    return modelPromise;
  }

  async function classifyImageElement(imgElement) {
    try {
      const model = await ensureModel();
      const predictions = await model.classify(imgElement, 5);
      if (!predictions || !predictions.length) {
        return { available: false, reason: 'No predictions returned by MobileNetV2.' };
      }

      let matchedCategory = null;
      let chosen = predictions[0];
      for (const p of predictions) {
        const cat = mapLabelToCategory(p.className);
        if (cat) {
          matchedCategory = cat;
          chosen = p;
          break;
        }
      }

      if (!matchedCategory) {
        matchedCategory = 'Dry Waste';
      }

      return {
        available: true,
        predicted_category: matchedCategory,
        detected_label: chosen.className,
        confidence: Math.round(chosen.probability * 1000) / 10,
        raw_predictions: predictions.map((p) => ({
          label: p.className,
          probability: p.probability,
        })),
        model_source: 'MobileNetV2 (TensorFlow.js v2)',
      };
    } catch (err) {
      return {
        available: false,
        reason: err.message || 'MobileNetV2 model unavailable.',
      };
    }
  }

  window.EcoSort.taxonomy = {
    CATEGORY_META,
    mapLabelToCategory,
    ensureModel,
    classifyImageElement,
  };
})();

