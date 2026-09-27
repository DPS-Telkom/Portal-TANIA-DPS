-- TANIA migration 3 — master seed (PRD v3.1 §16): 5 activity types, 12 starter skills.
-- Idempotent: on conflict do nothing (§8.4).

insert into public.activities (code, name, category) values
  ('DEL', 'Delivery',       'delivery'),
  ('PRE', 'Presales',       'presales'),
  ('INT', 'Internal',       'internal'),
  ('LEA', 'Cuti / Leave',   'leave'),
  ('TRN', 'Training',       'training')
on conflict (code) do nothing;

insert into public.skills (name, category) values
  ('Product Management',       'Product'),
  ('Business Analysis',        'Product'),
  ('UI/UX Design',             'Design'),
  ('Solution Architecture',    'Architecture'),
  ('Enterprise Architecture',  'Architecture'),
  ('Cloud Infrastructure',     'Technology'),
  ('Data Analytics',           'Data'),
  ('AI / Machine Learning',    'Data'),
  ('Cybersecurity',            'Technology'),
  ('Project Management',       'Delivery'),
  ('Presales & Proposal',      'Commercial'),
  ('Pricing & Business Case',  'Commercial')
on conflict (name) do nothing;
