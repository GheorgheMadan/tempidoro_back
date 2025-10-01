Rotte del server: 

GET DI TUTTI I PRODOTTI FILTRATI PER CATEGORIA:
http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0

categorie esistenti:
- portachiavi
- orologi
- orecchini
- anelli
- bracciali
- collane
- sveglie
- ciondoli
- occhiali_da_sole
- montature_da_vista
- cinturini
- preziosi
- orologi_outlet
- orologi_da_parete

GET DEI PRODOTTI CHE SONO IN SCONTO OPPURE SONO NUOVI 


GET DEI PRODOTTI RICERCATI PER NOME E FILTRATI PER CATEGORIA
http://localhost:3000/api/products/search?search=bracciale&categoria=bracciali&limit=20&offset=0

GET DEI PRODOTTI RICERCATI PER NOME search
http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&search=nome prodotto

GET DEL PRODOTTO PER ID 
http://localhost:3000/api/products/1


filtri
Ordinamento
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&order=name_asc
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&order=name_desc

* prezzo ordine crescente 
http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&order=price_asc

* prezzo ordine decrescente 
http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&order=price_desc

Filtri comuni

Per brand
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&brand=Brosway


Solo in promozione
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&isPromo=true


Solo novità
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&isNew=true


Solo in evidenza
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&isEvidence=true

Orologi (cassa)
GET http://localhost:3000/api/products?categoria=Orologi&limit=40&offset=0&materiale_cassa=acciaio&tipologia_movimento=auto

Occhiali (tipo lenti)
GET http://localhost:3000/api/products?categoria=Occhiali da sole&limit=40&offset=0&tipo_lenti=Laser Ultra HD

Preziosi (modello)
GET http://localhost:3000/api/products?categoria=Preziosi&limit=40&offset=0&modello_gioielleria=pendente

// operazioni CRUD 

*** DELETE *** 
http://localhost:3000/api/products/deleteProduct/1636

*** UPDATE ***
http://localhost:3000/api/products/modifyProduct/1647

*** POST ***
http://localhost:3000/api/products/addProduct