CREATE TABLE IF NOT EXISTS product_reviews (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_reviews_product_user (product_id, user_id),
  CONSTRAINT fk_product_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Black Floral Tulle Gown',
       'Flowing tulle gown with a delicate floral print and tie shoulder straps.',
       4999.00, 6499.00, '/catalog/black-floral-tulle-gown.jpg', 'dresses', 12
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Black Floral Tulle Gown');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Midnight Halter Gown',
       'Figure-hugging ruched halter gown for evenings and receptions.',
       3799.00, 4999.00, '/catalog/midnight-halter-gown.jpg', 'dresses', 9
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Midnight Halter Gown');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'White Bell-Sleeve Mini Dress',
       'Light textured mini dress with ruched bodice and bell sleeves.',
       2499.00, 3299.00, '/catalog/white-bell-sleeve-mini-dress.jpg', 'dresses', 15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'White Bell-Sleeve Mini Dress');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Navy Flare Party Dress',
       'Sweetheart neckline, puff sleeves and a full flared skirt.',
       3299.00, NULL, '/catalog/navy-flare-party-dress.jpg', 'dresses', 7
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Navy Flare Party Dress');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Red Ruched Mini Dress',
       'Statement red mini with ruched front and balloon sleeves.',
       2899.00, 3699.00, '/catalog/red-ruched-mini-dress.jpg', 'dresses', 11
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Red Ruched Mini Dress');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Navy Anarkali with Dupatta',
       'Floor-length anarkali with gold-edged dupatta for festive occasions.',
       5499.00, 6999.00, '/catalog/navy-anarkali-with-dupatta.jpg', 'ethnic', 6
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Navy Anarkali with Dupatta');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Powder Blue Sequin Saree',
       'Lightweight saree with sequin border and a soft powder blue drape.',
       6999.00, 8999.00, '/catalog/powder-blue-sequin-saree.jpg', 'ethnic', 5
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Powder Blue Sequin Saree');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Black Zari Dupatta Suit',
       'Black suit paired with a maroon zari-work dupatta for evening wear.',
       5999.00, NULL, '/catalog/black-zari-dupatta-suit.jpg', 'ethnic', 8
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Black Zari Dupatta Suit');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Blush Chain Shoulder Bag',
       'Structured blush bag with a gold chain strap and magnetic flap.',
       3499.00, 4499.00, '/catalog/blush-chain-shoulder-bag.jpg', 'bags', 20
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Blush Chain Shoulder Bag');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Mocha Crossbody Bag',
       'Everyday crossbody with chain-leather strap and zip closure.',
       3999.00, NULL, '/catalog/mocha-crossbody-bag.jpg', 'bags', 14
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mocha Crossbody Bag');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'White Cowl Halter Top',
       'Soft draped cowl-neck halter top, easy to dress up or down.',
       1299.00, 1799.00, '/catalog/white-cowl-halter-top.jpg', 'western', 25
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'White Cowl Halter Top');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Light Wash Wide-Leg Jeans',
       'High-rise wide-leg jeans in a light wash with a relaxed fit.',
       2799.00, NULL, '/catalog/light-wash-wide-leg-jeans.jpg', 'western', 18
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Light Wash Wide-Leg Jeans');

INSERT INTO products (name, description, price, old_price, image, category, stock)
SELECT 'Formal Shirt and Trouser Set',
       'Striped shirt with cream wide-leg trousers for the office.',
       4499.00, 5499.00, '/catalog/formal-shirt-trouser-set.jpg', 'western', 10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Formal Shirt and Trouser Set');
