from ai_model import CATEGORY_DETAILS


KNOWLEDGE_BASE = [
    {
        "keywords": ["banana", "apple", "fruit", "vegetable", "peel", "food", "leftover", "tea", "coffee", "egg", "bread", "rice", "organic", "compost", "wet"],
        "category": "Wet Waste",
        "recyclable": "Compostable (Organic Recovery)",
        "answer": (
            "This belongs in **Wet Waste (Green Compost Bin)**. Organic kitchen scraps, fruit/vegetable peels, "
            "coffee grounds, and leftover food break down into nutrient-rich compost or biogas. "
            "Tip: Remove any plastic stickers, foil wrappers, or rubber bands first."
        ),
    },
    {
        "keywords": ["plastic", "bottle", "pet", "hdpe", "cardboard", "paper", "box", "carton", "newspaper", "magazine", "envelope", "wrapper", "cup", "dry"],
        "category": "Dry Waste",
        "recyclable": "Recyclable (Dry Material Recovery)",
        "answer": (
            "This belongs in **Dry Waste (Blue Recyclable Bin)**. Clean paper, flattened cardboard, and rigid plastics "
            "(like PET bottles and HDPE jugs) are highly recyclable. "
            "Tip: Empty liquids and give containers a quick rinse so food residue doesn't contaminate paper fibers."
        ),
    },
    {
        "keywords": ["can", "aluminium", "aluminum", "tin", "metal", "steel", "foil", "iron", "copper", "brass", "pan", "utensil", "key", "wire"],
        "category": "Metal Waste",
        "recyclable": "Highly Recyclable (Infinitely Recyclable Metal)",
        "answer": (
            "This belongs in **Metal Waste (Grey Metal Bin)**. Aluminium cans, tin cans, and clean metal scraps "
            "can be recycled repeatedly without losing quality—recycling aluminium saves up to 95% of the energy "
            "needed to make new metal! Rinse cans and keep sharp lids folded inside."
        ),
    },
    {
        "keywords": ["battery", "batteries", "phone", "laptop", "charger", "electronic", "e-waste", "bulb", "cfl", "medicine", "syringe", "paint", "chemical"],
        "category": "Special / Hazardous Waste",
        "recyclable": "Special Drop-Off Required (Do Not Put in Regular Bins)",
        "answer": (
            "Batteries, electronics, bulbs, expired medicines, and chemical containers are **Special / Hazardous Waste**. "
            "Do NOT mix them into regular Wet, Dry, or Metal bins because they can cause fires or toxic leaks. "
            "Use our **Recycling Locator** page to find an authorized e-waste or hazardous drop-off centre."
        ),
    },
    {
        "keywords": ["pizza box", "greasy", "tissue", "napkin", "diaper", "sanitary"],
        "category": "Mixed / Contaminated Paper",
        "recyclable": "Partially Compostable / Non-Recyclable Paper",
        "answer": (
            "Greasy pizza box tops that are clean can be torn off and placed in **Dry Waste**, while heavily oil-soaked "
            "bottoms can be torn into small pieces for **Wet Waste / Compost**. Used tissues and sanitary items are not "
            "recyclable and should be disposed of hygienically."
        ),
    },
    {
        "keywords": ["glass", "jar", "mirror", "ceramic"],
        "category": "Glass / Fragile Dry Waste",
        "recyclable": "Glass Containers Recyclable (Handle Safely)",
        "answer": (
            "Clean glass jars and beverage bottles are 100% recyclable—rinse them, remove metal lids (put lids in Metal Waste), "
            "and take them to a glass drop-off point on the **Recycling Locator** or wrap broken glass safely before collection."
        ),
    },
    {
        "keywords": ["point", "reward", "score", "tier", "leaderboard", "eco"],
        "category": "Platform Guide",
        "recyclable": "EcoSort Rewards",
        "answer": (
            "You earn **+10 points** for Wet Waste, **+15 points** for Dry Waste, and **+25 points** for Metal Waste "
            "for every item classified and sorted! Tiers unlock at 100 (Eco Scout), 250 (Green Guardian), and 500 (Planet Champion)."
        ),
    },
    {
        "keywords": ["pickup", "schedule", "collect", "full", "bin"],
        "category": "Collection & Smart Bins",
        "recyclable": "Smart Bin Management",
        "answer": (
            "Smart bins automatically track fill percentage (`Empty` < 40%, `Half Full` 40–84%, `Full` ≥ 85%). "
            "When a bin approaches Full, you receive an alert and can schedule a pickup from the **Schedule Pickup** page."
        ),
    },
]


def answer_recycling_question(message: str, user_stats: dict | None = None):
    text = (message or "").strip()
    lower = text.lower()
    if not lower:
        return {
            "reply": "Ask me about any item (like a plastic bottle, banana peel, pizza box, or aluminium can) and I will tell you how to segregate and recycle it!",
            "category": "Help",
            "suggestions": [
                "Is a greasy pizza box recyclable?",
                "Where do aluminium soda cans go?",
                "How do I dispose of old batteries?",
                "How are Eco Points calculated?",
            ],
        }

    best_match = None
    best_hits = 0
    for entry in KNOWLEDGE_BASE:
        hits = sum(1 for kw in entry["keywords"] if kw in lower)
        if hits > best_hits:
            best_hits = hits
            best_match = entry

    if best_match and best_hits > 0:
        reply = best_match["answer"]
        if user_stats and ("my" in lower or "score" in lower or "stat" in lower):
            reply += (
                f"\n\nYour current impact: **{user_stats.get('total_items', 0)}** items sorted, "
                f"**{user_stats.get('points', 0)}** Eco Points, and **{user_stats.get('co2_saved_kg', 0):.2f} kg** CO₂ avoided."
            )
        return {
            "reply": reply,
            "category": best_match["category"],
            "recyclable": best_match["recyclable"],
            "suggestions": [
                "What goes into Wet Waste?",
                "How should I prepare Dry Waste?",
                "Where can I recycle e-waste?",
            ],
        }

    return {
        "reply": (
            f"For **\"{text}\"**: check if it is organic/biodegradable (**Wet Waste**), clean paper/cardboard/plastic (**Dry Waste**), "
            "or a metallic item like cans/foil (**Metal Waste**). If it contains electronics, batteries, or chemicals, keep it separate for hazardous drop-off. "
            "You can also upload a photo on the **AI Waste Detection** page for instant MobileNetV2 classification!"
        ),
        "category": "General Segregation Guidance",
        "recyclable": "Check Material Type",
        "suggestions": [
            "Is a plastic water bottle recyclable?",
            "Can I compost vegetable peels?",
            "How do I earn more Eco Points?",
        ],
    }

