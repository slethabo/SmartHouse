-- Demo data. Applied automatically on first run when the users table is empty.
-- Passwords (bcrypt, cost 10):
--   admin@smarthouse.test  / Admin123!
--   client@smarthouse.test / Client123!

INSERT INTO users (full_name, email, password_hash, role) VALUES
  ('Site Administrator', 'admin@smarthouse.test',  '$2a$10$rxvFQZmULiO6vpotaTu0luNQj06Rb0aM3B/fj/3gpULxJ4xxqbvBK', 'admin'),
  ('Thandi Client',      'client@smarthouse.test', '$2a$10$kUDmW5KQyJl5W2YDPB7w6eqXu2qZ3qcaWlB0e8Qz7AhBYpMTyNHmK', 'client');

INSERT INTO cost_rates (finish_level, rate_per_m2) VALUES
  ('basic',    9500.00),
  ('standard', 12500.00),
  ('premium',  17000.00);

INSERT INTO house_plans
  (name, description, bedrooms, bathrooms, floors, floor_area_m2, footprint_m2, min_plot_size_m2, style, image_url, created_by)
VALUES
  ('Starter Studio',
   'An open-plan studio with a kitchenette and a covered stoep. Ideal as a first home or a rental unit.',
   1, 1, 1, 45, 45, 120, 'Modern', 'https://picsum.photos/seed/smarthouse-1/640/420', 1),

  ('Eco Micro Home',
   'A compact, energy-efficient home with north-facing windows, a solar-ready roof and rainwater harvesting.',
   1, 1, 1, 48, 48, 110, 'Eco', 'https://picsum.photos/seed/smarthouse-2/640/420', 1),

  ('Garden Flat',
   'One bedroom with a separate lounge and a private garden door. Works well as a granny flat or starter home.',
   1, 1, 1, 55, 55, 140, 'Contemporary', 'https://picsum.photos/seed/smarthouse-3/640/420', 1),

  ('Compact Cottage',
   'Two bedrooms, a cosy lounge and a galley kitchen under a pitched roof. Low-maintenance and quick to build.',
   2, 1, 1, 65, 65, 160, 'Cottage', 'https://picsum.photos/seed/smarthouse-4/640/420', 1),

  ('Urban Loft',
   'A narrow double-storey design for small town plots: living downstairs, two bedrooms and a study nook upstairs.',
   2, 2, 2, 95, 50, 150, 'Modern', 'https://picsum.photos/seed/smarthouse-5/640/420', 1),

  ('Family Bungalow',
   'Three bedrooms on one level with an open-plan kitchen, a family bathroom and an en-suite main bedroom.',
   3, 2, 1, 110, 110, 280, 'Traditional', 'https://picsum.photos/seed/smarthouse-6/640/420', 1),

  ('Courtyard Home',
   'Three bedrooms wrapped around a sheltered central courtyard that brings light into every room.',
   3, 2, 1, 125, 135, 300, 'Mediterranean', 'https://picsum.photos/seed/smarthouse-7/640/420', 1),

  ('Cape Dutch Revival',
   'A classic gabled facade with modern interiors: three bedrooms, two bathrooms and a generous veranda.',
   3, 2, 1, 140, 140, 350, 'Cape Dutch', 'https://picsum.photos/seed/smarthouse-8/640/420', 1),

  ('Coastal Retreat',
   'A double-storey home with upstairs living to catch the views, three bedrooms and a wrap-around deck.',
   3, 2.5, 2, 150, 80, 220, 'Coastal', 'https://picsum.photos/seed/smarthouse-9/640/420', 1),

  ('Veld Homestead',
   'A sprawling single-storey farmhouse with four bedrooms, a big farm kitchen and a wide stoep.',
   4, 2.5, 1, 160, 160, 400, 'Farmhouse', 'https://picsum.photos/seed/smarthouse-10/640/420', 1),

  ('Highveld Double-Storey',
   'Four bedrooms and three bathrooms over two floors, with a double garage and an entertainment patio.',
   4, 3, 2, 190, 100, 300, 'Contemporary', 'https://picsum.photos/seed/smarthouse-11/640/420', 1),

  ('Executive Manor',
   'Five en-suite bedrooms, a home office, a cinema room and a triple garage. For large suburban estates.',
   5, 4, 2, 300, 170, 500, 'Luxury', 'https://picsum.photos/seed/smarthouse-12/640/420', 1);
