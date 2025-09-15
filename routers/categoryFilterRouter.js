const express = require('express');
const router = express.Router();
const { getCategoryFilters, showCategories, showTableData } = require('../controllers/categoryFiltersController');

router.get('/categories', showCategories)

router.get('/:category_name', getCategoryFilters);

router.get('/table/:table_name', showTableData)

module.exports = router;
