const Router = require('express').Router();
const { getProducts, showProduct } = require('../controllers/getProductsController');
const { addProduct } = require('../controllers/addProductController')
const { updateProduct } = require("../controllers/modifyController")
const { deleteProduct } = require("../controllers/deleteController")

// Rotta per mostrare un singolo prodotto
Router.get("/:id", showProduct);

// Rotta per mostrare i prodotti in base alla categoria
Router.get('/', getProducts);

// Rotta per l'aggiunta di un prodotto
Router.post('/addProduct', addProduct)

// modifica prodotto
Router.patch('/modifyProduct/:id', updateProduct);

Router.delete('/deleteProduct/:id', deleteProduct);

module.exports = Router; 