"""Split the converted recipe book text into recipes (title, category, ingredients, method)."""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding='utf-8').read().splitlines()

# Titles as they appear in the body, in order. Sub-recipes stay inside their parent.
TITLES = [
    "Jamaican Greater Cake", "Jamaican blue Draws", "Gizzardas", "Sausage Rolls", "Plantain Tarts",
    "Beef Patties", "Pin wheels", "Tiramisu", "Cherry Cheese Pie", "Apple Pie", "Pineapple Pie",
    "Key Lime Pie", "Lemon Meringue Pie", "Benjamin Easter Bun", "Coffee Cake", "Muffins", "Corn Bread",
    "Carrot Cake", "Coconut Rum & Raisin Bread Pudding", "Banana Cream For Banana Cake",
    "Victoria Sponge Cupcakes", "Hershey's Chocolate Cake", "Boston Cream Pie", "Pumpkin Spice Cake",
    "Philadelphia Classic Cheesecake", "Oreo Mini Cheesecakes", "Rum And Raisin Cheesecake",
    "Baileys Rum Cheesecake", "Berry Cheesecake", "Carrot Cake Cheesecake", "Plain Cake",
    "Pineapple. Upside-Down Cake", "Pumkin Cake", "Carrot Cake:", "Pound Cake", "Vanilla Cupcake",
    "Butter Cookies", "Fruit Cake", "Caramel Sauce", "Butter Cream Icing", "White Chocolate Buttercream",
    "Coffee Buttercream", "Caramel Buttercream", "Boiled Frosting", "Royal Icing", "Fondant", "Candy glass",
    "Notes",
]
NICE = {
    "Jamaican blue Draws": "Jamaican Blue Draws", "Pin wheels": "Pinwheel Cookies",
    "Pineapple. Upside-Down Cake": "Pineapple Upside-Down Cake", "Pumkin Cake": "Pumpkin Cake",
    "Carrot Cake:": "Carrot Cake (II)", "Candy glass": "Candy Glass", "Jamaican Greater Cake": "Jamaican Grater Cake", "Gizzardas": "Gizzadas",
}

start = next(i for i, l in enumerate(lines) if l.strip().startswith("Sweet Pastries and Cakes Yummy"))
pos, cur = [], start
for t in TITLES:
    for i in range(cur, len(lines)):
        s = lines[i].strip()
        if s.rstrip(':').lower() == t.rstrip(':').lower() or (t.endswith(':') and s.lower() == t.lower()):
            pos.append((i, t)); cur = i + 1; break
    else:
        print("not found:", t, file=sys.stderr)

def category(title):
    t = title.lower()
    if 'cheesecake' in t: return 'Cheesecakes'
    if 'cupcake' in t or 'muffin' in t: return 'Cupcakes & muffins'
    if any(w in t for w in ['icing', 'buttercream', 'frosting', 'fondant', 'sauce', 'cream for', 'glass']): return 'Icings & toppings'
    if any(w in t for w in ['pie', 'tart', 'patties', 'rolls', 'gizzada']): return 'Pies & pastries'
    if 'cookie' in t: return 'Cookies'
    return 'Cakes & breads'

recipes = []
for n, (i, t) in enumerate(pos):
    if t == "Notes": break
    end = pos[n + 1][0] if n + 1 < len(pos) else len(lines)
    body = [l.rstrip() for l in lines[i + 1:end]]
    text = "\n".join(body).strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Split at the first INSTRUCTIONS / PROCEDURE heading
    m = re.search(r"^\s*(INSTRUCTIONS?|PROCEDURE|METHOD)[^\n]*$", text, re.M | re.I)
    ingredients, method = (text[:m.start()].strip(), text[m.end():].strip()) if m else (text, "")
    ingredients = re.sub(r"^\s*INGRED[A-Z]*:?\s*\n", "", ingredients, flags=re.I)
    method = re.sub(r"^ {2,}", "", method, flags=re.M)
    title = NICE.get(t, t.rstrip(':'))
    recipes.append({"title": title, "category": category(title), "ingredients": ingredients, "method": method})

json.dump(recipes, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(recipes), "recipes")
for r in recipes: print(f"- {r['title']} [{r['category']}] ing={len(r['ingredients'])} meth={len(r['method'])}")
