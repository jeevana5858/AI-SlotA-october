import os
from io import BytesIO
import numpy as np
from PIL import Image

# Optional server-side TensorFlow MobileNetV2 (if tensorflow is installed on server).
# Note: The frontend also runs TensorFlow.js MobileNetV2 v2 directly in the browser.
# If neither model is available, the system explicitly enters Demo Mode and never fakes predictions.
_TF_AVAILABLE = False
_MOBILENET_MODEL = None
_PREPROCESS = None
_DECODE = None

try:
    import tensorflow as tf  # type: ignore
    from tensorflow.keras.applications.mobilenet_v2 import (  # type: ignore
        MobileNetV2,
        preprocess_input,
        decode_predictions,
    )

    _TF_AVAILABLE = True
    _PREPROCESS = preprocess_input
    _DECODE = decode_predictions
except Exception:
    _TF_AVAILABLE = False


CATEGORY_DETAILS = {
    "Wet Waste": {
        "bin_label": "Green Compost Bin (Wet / Organic)",
        "disposal_instructions": (
            "Place in the Green Wet Waste bin. Remove any plastic stickers, rubber bands, or "
            "packaging before composting. Ideal for aerobic composting or biogas conversion."
        ),
        "points": 10,
        "estimated_weight_kg": 0.30,
        "co2_saved_kg": 0.35,
        "recyclable": True,
    },
    "Dry Waste": {
        "bin_label": "Blue Recyclable Bin (Dry / Paper & Plastic)",
        "disposal_instructions": (
            "Rinse food residue if plastic/cardboard, flatten boxes, keep dry, and deposit in "
            "the Blue Dry Waste bin for material recovery and recycling."
        ),
        "points": 15,
        "estimated_weight_kg": 0.22,
        "co2_saved_kg": 0.52,
        "recyclable": True,
    },
    "Metal Waste": {
        "bin_label": "Grey Metal Bin (Aluminium & Scrap Metal)",
        "disposal_instructions": (
            "Empty and rinse cans or metal containers, crush gently if safe, watch for sharp edges, "
            "and place into the Grey Metal Waste bin for high-efficiency smelting and reuse."
        ),
        "points": 25,
        "estimated_weight_kg": 0.18,
        "co2_saved_kg": 0.95,
        "recyclable": True,
    },
}

# Keywords matching ImageNet labels from MobileNetV2 to the 3 smart waste bins
WET_KEYWORDS = [
    "banana", "apple", "granny smith", "orange", "lemon", "fig", "pineapple", "strawberry",
    "pomegranate", "custard apple", "jackfruit", "broccoli", "cauliflower", "cabbage",
    "zucchini", "cucumber", "bell pepper", "mushroom", "carrot", "potato", "tomato",
    "corn", "artichoke", "squash", "pumpkin", "onion", "garlic", "mango", "watermelon",
    "grape", "pear", "peach", "plum", "avocado", "bread", "bagel", "pretzel", "pizza",
    "burger", "cheeseburger", "hotdog", "sandwich", "burrito", "taco", "cake", "pie",
    "pasta", "spaghetti", "rice", "salad", "soup", "meat", "steak", "chicken", "fish",
    "egg", "leaf", "flower", "grass", "soil", "compost", "espresso", "coffee", "tea",
    "guacamole", "mashed potato", "french loaf", "dough", "fruit", "vegetable", "peel",
]

METAL_KEYWORDS = [
    "can", "tin", "pop bottle", "beer bottle", "soda", "aluminium", "aluminum", "foil",
    "steel", "iron", "nail", "screw", "bolt", "wrench", "hammer", "pliers", "screwdriver",
    "kettle", "frying pan", "wok", "pot", "ladle", "spatula", "spoon", "fork", "knife",
    "cleaver", "scissors", "key", "padlock", "chain", "coin", "watch", "bicycle",
    "toaster", "microwave", "bucket", "pail", "barrel", "drum", "tray", "wire",
    "safety pin", "whistle", "bell", "lighter", "battery", "metal", "brass", "copper",
    "thermos", "cocktail shaker", "corkscrew", "can opener", "oil filter", "radiator",
]

DRY_KEYWORDS = [
    "bottle", "water bottle", "plastic bag", "shopping bag", "carton", "box", "cardboard",
    "envelope", "paper", "newspaper", "magazine", "book", "notebook", "binder", "folder",
    "packet", "wrapper", "cup", "paper towel", "tissue", "toilet tissue", "napkin",
    "straw", "milk can", "jug", "jar", "container", "tub", "crate", "bag", "backpack",
    "shoe", "sneaker", "sandal", "shirt", "t-shirt", "jersey", "jean", "sock", "cloth",
    "towel", "pillow", "sponge", "toothbrush", "comb", "pen", "pencil", "marker",
    "keyboard", "mouse", "remote", "cassette", "cd", "disk", "plastic", "poly",
    "menu", "comic book", "dust jacket", "ashcan", "trash", "bin", "tray",
]


def map_label_to_waste_category(label: str):
    """Map an ImageNet MobileNetV2 class name deterministically to Wet, Dry, or Metal Waste."""
    normalized = (label or "").lower().replace("_", " ").strip()
    if not normalized:
        return None

    for kw in METAL_KEYWORDS:
        # Avoid matching 'trash can' / 'ashcan' as metal unless clearly metallic container
        if kw in normalized and "ashcan" not in normalized and "trash" not in normalized:
            return "Metal Waste"

    for kw in WET_KEYWORDS:
        if kw in normalized:
            return "Wet Waste"

    for kw in DRY_KEYWORDS:
        if kw in normalized:
            return "Dry Waste"

    return None


def get_server_model_status():
    return {
        "tensorflow_installed": _TF_AVAILABLE,
        "server_model_loaded": _MOBILENET_MODEL is not None,
        "client_model_supported": True,
        "architecture": "MobileNetV2 (ImageNet 1000-class -> Smart Waste Taxonomy)",
    }


def _load_server_model():
    global _MOBILENET_MODEL
    if not _TF_AVAILABLE:
        return None
    if _MOBILENET_MODEL is None:
        _MOBILENET_MODEL = MobileNetV2(weights="imagenet")
    return _MOBILENET_MODEL


def classify_image_server(image_bytes: bytes):
    """Run server-side MobileNetV2 if TensorFlow is installed; otherwise report unavailable."""
    if not _TF_AVAILABLE:
        return {
            "available": False,
            "reason": "TensorFlow runtime is not installed on the Python server.",
        }
    try:
        model = _load_server_model()
        img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        arr = np.expand_dims(np.array(img, dtype=np.float32), axis=0)
        arr = _PREPROCESS(arr)
        preds = model.predict(arr, verbose=0)
        decoded = _DECODE(preds, top=5)[0]
        raw_predictions = [
            {"label": label.replace("_", " "), "probability": float(prob)}
            for (_, label, prob) in decoded
        ]

        chosen_category = None
        chosen_label = raw_predictions[0]["label"]
        chosen_conf = raw_predictions[0]["probability"]

        for pred in raw_predictions:
            cat = map_label_to_waste_category(pred["label"])
            if cat:
                chosen_category = cat
                chosen_label = pred["label"]
                chosen_conf = pred["probability"]
                break

        if not chosen_category:
            # Fallback to Dry Waste only if top prediction has no organic/metal match,
            # preserving the actual MobileNetV2 detected label and probability.
            chosen_category = "Dry Waste"

        info = CATEGORY_DETAILS[chosen_category]
        return {
            "available": True,
            "model_source": "Server MobileNetV2 (TensorFlow/Keras)",
            "predicted_category": chosen_category,
            "detected_label": chosen_label,
            "confidence": round(chosen_conf * 100, 2),
            "raw_predictions": raw_predictions,
            **info,
        }
    except Exception as exc:
        return {
            "available": False,
            "reason": f"Server MobileNetV2 could not run: {str(exc)}",
        }


def get_taxonomy_payload():
    return {
        "categories": CATEGORY_DETAILS,
        "keywords": {
            "Wet Waste": WET_KEYWORDS,
            "Metal Waste": METAL_KEYWORDS,
            "Dry Waste": DRY_KEYWORDS,
        },
        "demo_samples": [
            {
                "id": "demo-wet-banana",
                "title": "Organic Fruit & Vegetable Scraps",
                "category": "Wet Waste",
                "detected_label": "banana & vegetable peel (Demo Sample)",
                "confidence": 94.2,
                "description": "Biodegradable kitchen and food scraps for composting.",
            },
            {
                "id": "demo-dry-bottle",
                "title": "PET Plastic Bottle & Cardboard",
                "category": "Dry Waste",
                "detected_label": "water bottle & carton (Demo Sample)",
                "confidence": 91.8,
                "description": "Clean dry plastic and paper packaging for material recovery.",
            },
            {
                "id": "demo-metal-can",
                "title": "Aluminium Beverage Can",
                "category": "Metal Waste",
                "detected_label": "aluminium soda can (Demo Sample)",
                "confidence": 96.4,
                "description": "Recyclable metal container suited for scrap smelting.",
            },
        ],
    }

