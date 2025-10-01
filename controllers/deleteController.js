const connection = require('../database/db');

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const [results] = await connection.query(
            'DELETE FROM products WHERE id = ?',
            [productId]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Prodotto non trovato'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Prodotto eliminato con successo!'
        });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({
            success: false,
            message: 'Errore del server riprova più tardi'
        });
    }
};

module.exports = { deleteProduct };
