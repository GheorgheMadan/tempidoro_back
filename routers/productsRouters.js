const Router = require('express').Router();
const { getProducts, showProduct } = require('../controllers/getProductsController');
const { addProduct } = require('../controllers/addAndModifyController')

// Rotta per mostrare un singolo prodotto
Router.get("/:id", showProduct);

// Rotta per mostrare i prodotti in base alla categoria
Router.get('/', getProducts);

// Rotta per l'aggiunta di un prodotto
Router.post('/addProduct', addProduct)

module.exports = Router; 