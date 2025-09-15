Rotte del server: 

GET DI TUTTI I PRODOTTI FILTRATI PER CATEGORIA:
http://localhost:3000/api/products?categoria=occhiali_da_sole&limit=20&offset=0

con limit=20 vedo solo 20 prodotti alla volta
con offset=0 prendo i primi 20 prodotti, con offset 20 salto i primi 20 e mostro i seguenti 20 prodotti e cosi via

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
http://localhost:3000/api/products/new-or-discounted?limit=20&offset=0

GET DEI PRODOTTI RICERCATI PER NOME E FILTRATI PER CATEGORIA
http://localhost:3000/api/products/search?search=bracciale&categoria=bracciali&limit=20&offset=0

GET DEI PRODOTTI RICERCATI PER NOME 
http://localhost:3000/api/products/search?search=Occhiali&limit=20&offset=0

GET DEI PRODOTTI FILTRATI PER CATEGORIA 
http://localhost:3000/api/products/search?search&categoria=anelli&limit=20&offset=0

GET DEL PRODOTTO PER ID 
http://localhost:3000/api/products/1


filtri
* prezzo crescente 
http://localhost:3000/api/products?categoria=occhiali_da_sole&limit=20&offset=0&order=price-asc

* prezzo decrescente 
http://localhost:3000/api/products?categoria=occhiali_da_sole&limit=20&offset=0&order=price-desc

* nome ordine crescente 
http://localhost:3000/api/products?categoria=occhiali_da_sole&limit=20&offset=0&order=name-asc

* nome ordine decrescente 
http://localhost:3000/api/products?categoria=occhiali_da_sole&limit=20&offset=0&order=name-desc