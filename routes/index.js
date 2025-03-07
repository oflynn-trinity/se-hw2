var express = require('express');
var router = express.Router();
var db = require('../database/connection');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('pages/index', { title: 'Home' });
});

router.get('/allrecipes', function(req, res, next) {
  let sql = `
        SELECT Recipes.recipe_id, Recipes.recipe_name, 
               Ingredients.ingredient_name, Recipe_Ingredients.amount, 
               Proteins.protein_name
        FROM Recipes
        JOIN Recipe_Ingredients ON Recipes.recipe_id = Recipe_Ingredients.recipe_id
        JOIN Ingredients ON Recipe_Ingredients.ingredient_id = Ingredients.ingredient_id
        JOIN Proteins ON Recipes.protein_id = Proteins.protein_id
        ORDER BY Proteins.protein_name, Recipes.recipe_id;
    `;

  db.query(sql,(err,result) => {
    if(err) throw err;

    let recipesByProtein = { Chicken: [], Beef: [], Fish: [] };

    result.forEach(row => {
      if (!recipesByProtein[row.protein_name]) {
        recipesByProtein[row.protein_name] = [];
      }

      let recipe = recipesByProtein[row.protein_name].find(r => r.recipe_id === row.recipe_id);
      if (!recipe) {
        recipe = { 
            recipe_id: row.recipe_id, 
            name: row.recipe_name, 
            ingredients: [] 
        };
        recipesByProtein[row.protein_name].push(recipe);
      }
      recipe.ingredients.push({
        name: row.ingredient_name,
        amount: row.amount
      });
    });

    res.render('pages/allrecipes', {
      title: 'All Recipes',
      chickenrecipes: recipesByProtein.Chicken,
      beefrecipes: recipesByProtein.Beef,
      fishrecipes: recipesByProtein.Fish
    })
  })
});

router.get('/recipe/:id', function(req,res,next) {
  const recipeId = req.params.id;

  const sql = `
        SELECT Recipes.recipe_name, 
               Ingredients.ingredient_name, Ingredients.ingredient_description, Ingredients.ingredient_id,
               Recipe_Ingredients.amount,
               Proteins.protein_name
        FROM Recipes
        JOIN Recipe_Ingredients ON Recipes.recipe_id = Recipe_Ingredients.recipe_id
        JOIN Ingredients ON Recipe_Ingredients.ingredient_id = Ingredients.ingredient_id
        JOIN Proteins ON Recipes.protein_id = Proteins.protein_id
        WHERE Recipes.recipe_id = ?;
    `;

  db.query(sql, [recipeId], (err,result) => {
    if(err) throw err;

    if (result.length === 0) {
      return res.status(404).send("Recipe not found");
    }

    let recipe = {
      name: result[0].recipe_name,
      protein: result[0].protein_name,
      ingredients: result.map(row => ({
        name: row.ingredient_name,
        amount: row.amount,
        description: row.ingredient_description,
        id: row.ingredient_id
      }))
    };

    res.render('pages/recipe', {
      title: recipe.name,
      recipe});
  });

});

router.get('/addrecipe', (req, res) => {
  const sql = `SELECT * FROM Ingredients ORDER BY ingredient_name`;

  db.query(sql, (err, result) => {
      if (err) throw err;

      res.render('pages/addrecipe', { 
        title: 'Add Recipe',
        ingredients: result });
  });
});

router.post('/enterrecipe', (req, res) => {
  const { recipe_name, protein_id, ingredient_id, amount } = req.body;

  const sqlRecipe = `INSERT INTO Recipes (recipe_name, protein_id) VALUES (?, ?)`;

  db.query(sqlRecipe, [recipe_name, protein_id], (err, result) => {
      if (err) throw err;

      const recipeId = result.insertId;

      let recipeIngredientQueries = [];
      for (let i = 0; i < ingredient_id.length; i++) {
          const sqlRecipeIngredient = `INSERT INTO Recipe_Ingredients (recipe_id, ingredient_id, amount) VALUES (?, ?, ?)`;
          recipeIngredientQueries.push(
              new Promise((resolve, reject) => {
                  db.query(sqlRecipeIngredient, [recipeId, ingredient_id[i], amount[i]], (err) => {
                      if (err) reject(err);
                      else resolve();
                  });
              })
          );
      }

      Promise.all(recipeIngredientQueries)
          .then(() => {
              res.redirect('/allrecipes');
          })
          .catch(err => {
              console.error(err);
              res.status(500).send("Error adding ingredients");
          });
  });
});




module.exports = router;
