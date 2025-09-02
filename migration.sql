-- Insert Industries
INSERT INTO industries (name) VALUES ('Department Stores') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Life and Health Insurance') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Travel and Reservation Services') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Grocery Wholesale') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Electronics and Appliances Stores') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Physicians and Health Practitioners') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Banking') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Medical Equipment and Supplies') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Miscellaneous Chemical Manufacturing') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Miscellaneous Amusement and Recreation') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Executive and Legislature') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Food Manufacturing') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Building and Dwelling Services') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Colleges and Universities') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Machinery Wholesale') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Social and Rehabilitation Services') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Hospitals') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Miscellaneous Transportation Equipment Manufacturing') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Administrative Services') ON CONFLICT (name) DO NOTHING;
INSERT INTO industries (name) VALUES ('Metal Products Manufacturing') ON CONFLICT (name) DO NOTHING;

-- Insert Top Companies
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('UnitedHealth Group Incorporated', 'Life and Health Insurance', 400278000000, 400000, 'Eden Prairie', 'Minnesota', 'http://www.unitedhealthgroup.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('Cargill, Incorporated', 'Grocery Wholesale', 159586000000, 155000, 'Wayzata', 'Minnesota', 'http://www.cargill.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('Target Corporation', 'Department Stores', 106566000000, 440000, 'Minneapolis', 'Minnesota', 'http://www.target.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('Saint Paul Regional Water Services', 'Water and Sewage Services', 82392734000, 247, 'Saint Paul', 'Minnesota', 'http://www.stpaul.gov') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('State of Minnesota', 'Executive and Legislature', 58479422000, 35217, 'Saint Paul', 'Minnesota', 'http://www.mncourts.gov') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('U.S. Bancorp', 'Banking', 42712000000, 70263, 'Minneapolis', 'Minnesota', 'http://www.usbank.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('Best Buy Co., Inc.', 'Electronics and Appliances Stores', 41528000000, 85000, 'Richfield', 'Minnesota', 'http://www.bestbuy.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('CHS Inc.', 'Grocery Wholesale', 39261230000, 10730, 'Inver Grove Heights', 'Minnesota', 'http://resources-my.chsinc.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('3M Company', 'Medical Equipment and Supplies', 32681000000, 61500, 'Saint Paul', 'Minnesota', 'http://3m.com') ON CONFLICT DO NOTHING;
INSERT INTO companies (name, industry, sales, employees, city, state, website) VALUES ('General Mills, Inc.', 'Food Manufacturing', 19857199000, 34002, 'Minneapolis', 'Minnesota', 'http://www.generalmills.com') ON CONFLICT DO NOTHING;