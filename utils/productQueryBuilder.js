// utils/productQueryBuilder.js

const categoriaDettagli = {
    orologi: {
        join: `LEFT JOIN orologi_detail ON products.id = orologi_detail.prodotto_id
               LEFT JOIN materiale_cassa ON materiale_cassa.id = orologi_detail.materiale_cassa_id
               LEFT JOIN materiale_cinturino ON materiale_cinturino.id = orologi_detail.materiale_cinturino_id
               LEFT JOIN tipologia_movimento ON tipologia_movimento.id = orologi_detail.tipologia_movimento_id
               LEFT JOIN tipologia_cinturino ON tipologia_cinturino.id = orologi_detail.tipologia_cinturino_id`,
        fields: [
            'materiale_cassa.name AS materiale_cassa',
            'materiale_cinturino.name AS materiale_cinturino',
            'tipologia_movimento.name AS tipologia_movimento',
            'tipologia_cinturino.name AS tipologia_cinturino'
        ]
    },
    montature_da_vista: {
        join: `LEFT JOIN occhiali_detail ON products.id = occhiali_detail.prodotto_id
               LEFT JOIN tipo_lenti ON tipo_lenti.id = occhiali_detail.tipo_lenti_id`,
        fields: ['tipo_lenti.name AS tipo_lenti']
    },
    occhiali_da_sole: {
        join: `LEFT JOIN occhiali_detail ON products.id = occhiali_detail.prodotto_id
               LEFT JOIN tipo_lenti ON tipo_lenti.id = occhiali_detail.tipo_lenti_id`,
        fields: ['tipo_lenti.name AS tipo_lenti']
    },
    anelli: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id
               LEFT JOIN misura_anello ON misura_anello.id = gioielli_detail.misura_anello_id`,
        fields: [
            'pietre.name AS pietre',
            'misura_anello.name AS misura_anello'
        ]
    },
    bracciali: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    collane: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    ciondoli: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    orecchini: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    portachiavi: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    cavigliere: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id`,
        fields: ['pietre.name AS pietre']
    },
    cinturini: {
        join: `LEFT JOIN orologi_detail ON products.id = orologi_detail.prodotto_id
               LEFT JOIN misura_ansa ON misura_ansa.id = orologi_detail.misura_ansa_id
               LEFT JOIN tipologia_cinturino ON tipologia_cinturino.id = orologi_detail.tipologia_cinturino_id`,
        fields: [
            'misura_ansa.name AS misura_ansa',
            'tipologia_cinturino.name AS tipologia_cinturino'
        ]
    },
    // ✅ SOLO GIOIELLERIA
    preziosi: {
        join: `LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id
               LEFT JOIN misura_anello ON misura_anello.id = gioielli_detail.misura_anello_id
               LEFT JOIN modello_gioielleria ON modello_gioielleria.id = gioielli_detail.modello_gioielleria_id`,
        fields: [
            'pietre.name AS pietre',
            'misura_anello.name AS misura_anello',
            'modello_gioielleria.name AS modello_gioielleria'
        ]
    },
    // ✅ OUTLET: include dettagli OROLOGI + GIOIELLI + OCCHIALI
    outlet: {
        join: `LEFT JOIN orologi_detail ON products.id = orologi_detail.prodotto_id
               LEFT JOIN materiale_cassa ON materiale_cassa.id = orologi_detail.materiale_cassa_id
               LEFT JOIN materiale_cinturino ON materiale_cinturino.id = orologi_detail.materiale_cinturino_id
               LEFT JOIN tipologia_movimento ON tipologia_movimento.id = orologi_detail.tipologia_movimento_id
               LEFT JOIN tipologia_cinturino ON tipologia_cinturino.id = orologi_detail.tipologia_cinturino_id
               LEFT JOIN misura_ansa ON misura_ansa.id = orologi_detail.misura_ansa_id
               LEFT JOIN gioielli_detail ON products.id = gioielli_detail.prodotto_id
               LEFT JOIN pietre ON pietre.id = gioielli_detail.pietre_id
               LEFT JOIN misura_anello ON misura_anello.id = gioielli_detail.misura_anello_id
               LEFT JOIN modello_gioielleria ON modello_gioielleria.id = gioielli_detail.modello_gioielleria_id
               LEFT JOIN occhiali_detail ON products.id = occhiali_detail.prodotto_id
               LEFT JOIN tipo_lenti ON tipo_lenti.id = occhiali_detail.tipo_lenti_id`,
        fields: [
            // orologi
            'materiale_cassa.name AS materiale_cassa',
            'materiale_cinturino.name AS materiale_cinturino',
            'tipologia_movimento.name AS tipologia_movimento',
            'tipologia_cinturino.name AS tipologia_cinturino',
            'misura_ansa.name AS misura_ansa',
            // gioielli
            'pietre.name AS pietre',
            'misura_anello.name AS misura_anello',
            'modello_gioielleria.name AS modello_gioielleria',
            // occhiali
            'tipo_lenti.name AS tipo_lenti'
        ]
    }
};

function getCategoryQueryParts(categoria) {
    const { join = '', fields = [] } = categoriaDettagli[categoria] || {};
    return {
        join,
        fields: fields.length > 0 ? `${fields.join(', ')}` : ''
    };
}

function getCommonSelectFields() {
    return `
select 
products.id, products.title, products.codice, products.price, products.discount, products.image, products.description, products.available, products.stock, products.in_promozione, products.in_evidenza, products.codice_ean,
categories.category_name as categoria, 
products_detail.confezione, products_detail.garanzia, products_detail.codice_produttore, products_detail.novita,
brands.name as brand, materiale.name as materiale, finitura.name as finitura, colore.name as colore,
tipologia.name as tipologia, collezione.name as collezione, genere.name as genere
from products 
join categories on categories.id = products.category_id 
left join brands on brands.id = products.marca_id
left join products_detail on products_detail.prodotto_id = products.id 
left join materiale on materiale.id = products_detail.materiale_id
left join finitura on finitura.id = products_detail.finitura_id
left join tipologia on tipologia.id = products_detail.tipologia_id
left join collezione on collezione.id = products_detail.collezione_id
left join genere on genere.id = products_detail.genere_id
left join colore on colore.id = products_detail.colore_id
`;
}

function formatBooleans(product) {
    return {
        ...product,
        available: !!product.available,
        novita: !!product.novita,
        in_promozione: !!product.in_promozione,
        in_evidenza: !!product.in_evidenza
    };
}

function getOrderClause(order) {
    switch (order) {
        case "price-asc":
            return 'ORDER BY (products.price * (1 - IFNULL(products.discount, 0) / 100)) ASC';
        case "price-desc":
            return 'ORDER BY (products.price * (1 - IFNULL(products.discount, 0) / 100)) DESC';
        case "name-asc":
            return 'ORDER BY products.title ASC';
        case "name-desc":
            return 'ORDER BY products.title DESC';
        default:
            return "";
    }
}




module.exports = {
    getCategoryQueryParts,
    getCommonSelectFields,
    formatBooleans,
    getOrderClause,
};
