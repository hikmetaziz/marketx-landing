select
  id,
  attributes ->> 'sku' as sku,
  status,
  image_url
from public.listings
where source = 'ecosoft_price_list'
  and attributes ->> 'sku' in (
    'MO1500PECO',
    'MO675ALCPUREECO',
    'MO675PUREMACECO',
    'MO675MPUREBALECO',
    'MO675MALCPSECO',
    'MO675PSMACECO',
    'MO675MBALPSECO',
    'MO550MPSECOSTD',
    'MO550PECOSTD',
    'MO550MPECOSTD',
    'FU1018CABCE',
    'FU0835CABCE',
    'FU1035CABCE',
    'FU1235CABCE',
    'NatureWater Premium SF-P2',
    'ROBUST1000STD',
    'ROBUST1500ECO',
    'ROBUST3000MAX',
    'ROBUST4000',
    'FK1054CEMIXA',
    'FK1354CEMIXA',
    'FK1252CEMIXA',
    'FPV4510ECOGR',
    'FPV4520ECOGR'
  )
order by attributes ->> 'sku';
