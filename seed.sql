-- ============================================================
--  Sample data for the simple ecommerce database
-- ============================================================

INSERT INTO categories (id, name, slug, parent_id) VALUES
    (1, 'Electronics',    'electronics',    NULL),
    (2, 'Audio',          'audio',          1),
    (3, 'Home & Kitchen', 'home-kitchen',   NULL),
    (4, 'Books',          'books',          NULL),
    (5, 'Apparel',        'apparel',        NULL);

INSERT INTO products (id, sku, name, description, category_id, price_cents, stock) VALUES
    (1,  'ELEC-001', 'Wireless Mouse',          'Ergonomic 2.4 GHz wireless mouse.',            1,  2499, 120),
    (2,  'ELEC-002', 'Mechanical Keyboard',     '87-key tenkeyless board, brown switches.',     1,  8900,  45),
    (3,  'ELEC-003', 'USB-C Hub 7-in-1',        'HDMI, USB 3.0 x3, SD, microSD, PD 100W.',      1,  3999,  60),
    (4,  'AUD-001',  'Noise-Cancelling Headphones', 'Over-ear ANC headphones, 30h battery.',    2, 19900,  30),
    (5,  'AUD-002',  'Portable Bluetooth Speaker',  'Water-resistant speaker with 12h battery.', 2,  5900,  75),
    (6,  'AUD-003',  'Studio Earbuds',          'Wired in-ear monitors with balanced sound.',    2,  3499,  90),
    (7,  'HOME-001', 'Ceramic Coffee Mug',      '350 ml stoneware mug, dishwasher safe.',        3,  1200, 200),
    (8,  'HOME-002', 'Pour-Over Kettle',        'Gooseneck kettle with precision spout.',        3,  4599,  40),
    (9,  'BOOK-001', 'The Pragmatic Programmer','Classic guide to software craftsmanship.',      4,  3200, 100),
    (10, 'BOOK-002', 'Designing Data-Intensive Applications', 'Systems design for data-heavy apps.', 4, 4200,  80),
    (11, 'APP-001',  'Cotton T-Shirt',          'Unisex heavyweight cotton tee.',                 5,  1800, 150),
    (12, 'APP-002',  'Canvas Tote Bag',         'Everyday tote with inner pocket.',               5,  1400,   0);

-- Seeded demo accounts all use the password: password123
INSERT INTO customers (id, email, full_name, password_hash) VALUES
    (1, 'ada@example.com',    'Ada Lovelace',
     'scrypt$13ee5390868d25da5903a178f1d47c2f$58d7e3db0dd784f6a3084bc9a0430c9c23f8ddc69b8a8a1374fdb2fc70ea39f66fc003da8e4e21c0ca7c93567579ccc91c4101efae437611abed3039e9e613ed'),
    (2, 'grace@example.com',  'Grace Hopper',
     'scrypt$8516b57b2a6ab5fa6148222f9ff28844$218fd5ddc49bc2bf7e2735e0b1c4a7fb9745e18df559a8531497f12aab5b1b52ecc66e216feb979ff1fd973c25f324766a89ec76f18a8ceb887669a8cddb0a49'),
    (3, 'alan@example.com',   'Alan Turing',
     'scrypt$e2285b783d6fa1449d6b01803c5d7663$79ac17626acce31dbe3cbc10777a997ac6edd421ff39651b868021894eb74c0c5d7501e9243fa19b27a283e813a78d008c5e52efb5facbbbf11976a92360449b'),
    (4, 'linus@example.com',  'Linus Torvalds',
     'scrypt$f0f86cd4920c0bc08ab2eab5cf675b32$c086d42c3876fd22f790507d803a383cd9e043c6aebcccae51a1847d63463fa7c089d484e2edd909a680d7f7fc89e13048012f837a309b7e6dbc28ebe03b08de');

INSERT INTO addresses (id, customer_id, line1, city, state, postal_code, country, is_default) VALUES
    (1, 1, '12 Analytical Way',  'London',  'ENG', 'SW1A 1AA', 'GB', 1),
    (2, 2, '1 Compiler Street',  'Arlington', 'VA', '22201',   'US', 1),
    (3, 3, '7 Bletchley Park',   'Milton Keynes', 'BKM', 'MK3 6EB', 'GB', 1),
    (4, 4, '42 Kernel Road',     'Portland', 'OR', '97205',    'US', 1);

INSERT INTO orders (id, customer_id, shipping_address_id, status, shipping_cents, tax_cents) VALUES
    (1, 1, 1, 'completed', 500,  240),
    (2, 2, 2, 'shipped',   0,    178),
    (3, 3, 3, 'paid',      500,  420),
    (4, 4, 4, 'pending',   500,  0),
    (5, 2, 2, 'cancelled', 500,  0);

INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES
    (1, 4,  1, 19900),
    (1, 7,  2,  1200),
    (2, 2,  1,  8900),
    (2, 3,  1,  3999),
    (3, 9,  2,  3200),
    (3, 10, 1,  4200),
    (4, 11, 3,  1800),
    (5, 5,  1,  5900);

INSERT INTO payments (id, order_id, provider, status, amount_cents, transaction_ref) VALUES
    (1, 1, 'stripe', 'captured', 23040, 'ch_3Pseed0001'),
    (2, 2, 'paypal', 'captured', 13077, 'pp_tx_88301'),
    (3, 3, 'stripe', 'captured', 11520, 'ch_3Pseed0003'),
    (4, 4, 'stripe', 'pending',  5900,  NULL),
    (5, 5, 'stripe', 'failed',   6400,  'ch_3Pseed0005');

-- Order 5 was cancelled: put its reserved stock back.
UPDATE products SET stock = stock + 1 WHERE id = 5;

INSERT INTO reviews (product_id, customer_id, rating, title, body) VALUES
    (4, 1, 5, 'Best purchase this year', 'Noise cancellation is superb on flights.'),
    (4, 2, 4, 'Great, slightly tight',    'Sound is excellent but the clamp takes getting used to.'),
    (2, 2, 5, 'Typing bliss',             'Brown switches are a joy for coding.'),
    (9, 3, 5, 'Timeless',                 'Still the best book on pragmatic engineering.'),
    (10, 3, 5, 'Essential read',          'Explains distributed systems clearly.'),
    (7, 1, 4, 'Nice mug',                 'Good weight, keeps coffee warm.'),
    (11, 4, 3, 'Decent tee',              'Fit runs a bit large.');
