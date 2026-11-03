# Rafael Charcutaria

Portuguese product catalogue for Rafael Charcutaria, Lda.
The website lets visitors search and filter products, choose packaging and quantities, and review a request.

## Website files

- `index.html`: product catalogue.
- `cart.html`: request summary.
- `style.css`: shared styles.
- `main.js`: catalogue and cart behaviour.
- `products.json`: product details, packaging options, and image paths.
- `images/`: product images, versioned with the website.

The site uses plain HTML, CSS, and JavaScript.
There are no package dependencies, server application, or database.
The cart is stored in the visitor's browser using localStorage.

## Local preview

From the project directory, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000>.
Use an HTTP server rather than opening the HTML files directly, since the catalogue fetches `products.json`.
