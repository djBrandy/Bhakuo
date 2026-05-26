### Bhakuo Project Code Snippet
#### Bhakuo Recipe Calculator
```python
class BhakuoRecipe:
    def __init__(self, flour, ghee, sugar, cardamom):
        self.flour = flour
        self.ghee = ghee
        self.sugar = sugar
        self.cardamom = cardamom

    def calculate_ingredients(self, servings):
        ingredients = {
            "flour": self.flour * servings,
            "ghee": self.ghee * servings,
            "sugar": self.sugar * servings,
            "cardamom": self.cardamom * servings
        }
        return ingredients

# Example usage:
recipe = BhakuoRecipe(2, 1, 1, 0.5)
servings = 4
ingredients = recipe.calculate_ingredients(servings)
print(ingredients)
```