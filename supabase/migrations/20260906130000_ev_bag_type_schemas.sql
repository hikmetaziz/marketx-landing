-- Add versioned Növ fields for the canonical Ev və bağ subcategories.

do $migration$
declare
  ev_bag_category_id uuid;
  parent_count integer;
  row_count integer;
  active_count integer;
  target_specs jsonb := $json$
  [
    {
      "slug": "bag-ve-bostan",
      "field_key": "garden_type",
      "options": [
        {"value": "Bağ çətirləri", "label": "Bağ çətirləri"},
        {"value": "Bağ ləvazimatları", "label": "Bağ ləvazimatları"},
        {"value": "Həşəratlarla və gəmiricilərlə mübarizə", "label": "Həşəratlarla və gəmiricilərlə mübarizə"},
        {"value": "Manqallar və aksesuarlar", "label": "Manqallar və aksesuarlar"},
        {"value": "Otbiçənlər və trimmerlər", "label": "Otbiçənlər və trimmerlər"},
        {"value": "Qamaklar, yelləncəklər və şezlonqlar", "label": "Qamaklar, yelləncəklər və şezlonqlar"},
        {"value": "Qaz balonları", "label": "Qaz balonları"},
        {"value": "Su çənləri", "label": "Su çənləri"},
        {"value": "Su nasosları", "label": "Su nasosları"},
        {"value": "Suvarma, suyun çəkilməsi və drenaj avadanlıqları", "label": "Suvarma, suyun çəkilməsi və drenaj avadanlıqları"},
        {"value": "Toxumlar və gübrələr", "label": "Toxumlar və gübrələr"}
      ]
    },
    {
      "slug": "bitkiler",
      "field_key": "plant_type",
      "options": [
        {"value": "Ağaclar və tinglər", "label": "Ağaclar və tinglər"},
        {"value": "Dibçəklər", "label": "Dibçəklər"},
        {"value": "Güllər", "label": "Güllər"},
        {"value": "Otaq bitkiləri", "label": "Otaq bitkiləri"},
        {"value": "Qazonlar", "label": "Qazonlar"}
      ]
    },
    {
      "slug": "dekor-ve-interyer",
      "field_key": "decor_type",
      "options": [
        {"value": "Bayram dekoru və aksesuarları", "label": "Bayram dekoru və aksesuarları"},
        {"value": "Fotoçərçivələr", "label": "Fotoçərçivələr"},
        {"value": "Güldanlar", "label": "Güldanlar"},
        {"value": "Güzgülər", "label": "Güzgülər"},
        {"value": "Heykəlciklər və fiqurlar", "label": "Heykəlciklər və fiqurlar"},
        {"value": "Pul daxılları və mücrülər", "label": "Pul daxılları və mücrülər"},
        {"value": "Qapılar üçün stoperlər", "label": "Qapılar üçün stoperlər"},
        {"value": "Rəsmlər və pannolar", "label": "Rəsmlər və pannolar"},
        {"value": "Saatlar və zəngli saatlar", "label": "Saatlar və zəngli saatlar"},
        {"value": "Şamlar və şamdanlar", "label": "Şamlar və şamdanlar"},
        {"value": "Süni güllər və meyvələr", "label": "Süni güllər və meyvələr"}
      ]
    },
    {
      "slug": "qida-ve-erzaq",
      "field_key": "food_type",
      "options": [
        {"value": "Bal", "label": "Bal"},
        {"value": "Çay və qəhvə", "label": "Çay və qəhvə"},
        {"value": "Çərəz və quru meyvələr", "label": "Çərəz və quru meyvələr"},
        {"value": "Ədviyyatlar", "label": "Ədviyyatlar"},
        {"value": "Ət və dəniz məhsulları", "label": "Ət və dəniz məhsulları"},
        {"value": "İçkilər", "label": "İçkilər"},
        {"value": "Meyvə və tərəvəzlər", "label": "Meyvə və tərəvəzlər"},
        {"value": "Mürəbbə və doşab", "label": "Mürəbbə və doşab"},
        {"value": "Sirkə və souslar", "label": "Sirkə və souslar"},
        {"value": "Şirniyyat və un məmulatları", "label": "Şirniyyat və un məmulatları"},
        {"value": "Süd və süd məhsulları", "label": "Süd və süd məhsulları"},
        {"value": "Turşu və şorabalar", "label": "Turşu və şorabalar"},
        {"value": "Yağlar", "label": "Yağlar"},
        {"value": "Yumurta", "label": "Yumurta"},
        {"value": "Digər", "label": "Digər"}
      ]
    },
    {
      "slug": "ev-ve-bag-ucun-isiqlandirma",
      "field_key": "lighting_type",
      "options": [
        {"value": "Tavan və asma çilçıraqlar", "label": "Tavan və asma çilçıraqlar"},
        {"value": "Divar çıraqları", "label": "Divar çıraqları"},
        {"value": "Yerüstü və masaüstü çıraqlar", "label": "Yerüstü və masaüstü çıraqlar"},
        {"value": "Küçə çıraqları", "label": "Küçə çıraqları"},
        {"value": "Lampalar", "label": "Lampalar"},
        {"value": "Projektorlar", "label": "Projektorlar"},
        {"value": "Spotlar və trek çıraqlar", "label": "Spotlar və trek çıraqlar"},
        {"value": "İşıqlandırma üçün aksesuarlar", "label": "İşıqlandırma üçün aksesuarlar"}
      ]
    },
    {
      "slug": "ev-tekstili",
      "field_key": "textile_type",
      "options": [
        {"value": "Dəsmallar", "label": "Dəsmallar"},
        {"value": "Mətbəx üçün tekstil", "label": "Mətbəx üçün tekstil"},
        {"value": "Pərdələr və jalüzlər", "label": "Pərdələr və jalüzlər"},
        {"value": "Pledlər və örtüklər", "label": "Pledlər və örtüklər"},
        {"value": "Yastıqlar", "label": "Yastıqlar"},
        {"value": "Yataq tekstili", "label": "Yataq tekstili"},
        {"value": "Yorğanlar", "label": "Yorğanlar"},
        {"value": "Digər", "label": "Digər"}
      ]
    },
    {
      "slug": "ev-teserrufati-mallari",
      "field_key": "household_type",
      "options": [
        {"value": "Əşyaların saxlanması və orqanayzerlər", "label": "Əşyaların saxlanması və orqanayzerlər"},
        {"value": "Hamam və tualet aksesuarları", "label": "Hamam və tualet aksesuarları"},
        {"value": "Məişət kimyəvi maddələri", "label": "Məişət kimyəvi maddələri"},
        {"value": "Paltarqurutma asılqanları və ipləri", "label": "Paltarqurutma asılqanları və ipləri"},
        {"value": "Təmizlik əşyaları", "label": "Təmizlik əşyaları"},
        {"value": "Ütüləmə lövhələri", "label": "Ütüləmə lövhələri"},
        {"value": "Zibil vedrələri və torbaları", "label": "Zibil vedrələri və torbaları"},
        {"value": "Digər", "label": "Digər"}
      ]
    },
    {
      "slug": "qab-qacaq-ve-metbex-levazimatlari",
      "field_key": "kitchenware_type",
      "options": [
        {"value": "Badələr və qədəhlər", "label": "Badələr və qədəhlər"},
        {"value": "Boşqablar", "label": "Boşqablar"},
        {"value": "Çay və qəhvə servizləri", "label": "Çay və qəhvə servizləri"},
        {"value": "Çaydanlar və qəhvədanlar", "label": "Çaydanlar və qəhvədanlar"},
        {"value": "Fincanlar", "label": "Fincanlar"},
        {"value": "Kasalar və salat qabları", "label": "Kasalar və salat qabları"},
        {"value": "Konfet, qənd və mürəbbə qabları", "label": "Konfet, qənd və mürəbbə qabları"},
        {"value": "Külqabılar", "label": "Külqabılar"},
        {"value": "Meyvə qabları", "label": "Meyvə qabları"},
        {"value": "Mətbəx məhsulları", "label": "Mətbəx məhsulları"},
        {"value": "Nahar servizləri", "label": "Nahar servizləri"},
        {"value": "Nəlbəkilər", "label": "Nəlbəkilər"},
        {"value": "Qazanlar və tavalar", "label": "Qazanlar və tavalar"},
        {"value": "Qrafinlər və dolçalar", "label": "Qrafinlər və dolçalar"},
        {"value": "Sinilər və altlıqlar", "label": "Sinilər və altlıqlar"},
        {"value": "Şirniyyat və çərəz qabları", "label": "Şirniyyat və çərəz qabları"},
        {"value": "Şorba qabları", "label": "Şorba qabları"},
        {"value": "Stəkanlar", "label": "Stəkanlar"},
        {"value": "Süfrə ləvazimatları", "label": "Süfrə ləvazimatları"}
      ]
    },
    {
      "slug": "temir-ve-tikinti",
      "field_key": "repair_type",
      "options": [
        {"value": "Buxarılar və qızdırıcılar", "label": "Buxarılar və qızdırıcılar"},
        {"value": "Elektrik malları", "label": "Elektrik malları"},
        {"value": "Nərdivanlar", "label": "Nərdivanlar"},
        {"value": "Pəncərələr, qapılar və eyvanlar", "label": "Pəncərələr, qapılar və eyvanlar"},
        {"value": "Santexnika və sauna", "label": "Santexnika və sauna"},
        {"value": "Təmir və tikinti alətləri", "label": "Təmir və tikinti alətləri"},
        {"value": "Tikinti materialları", "label": "Tikinti materialları"},
        {"value": "Digər", "label": "Digər"}
      ]
    },
    {
      "slug": "xalcalar-ve-aksesuarlar",
      "field_key": "carpet_type",
      "options": [
        {"value": "Xalçalar", "label": "Xalçalar"},
        {"value": "Kilimlər", "label": "Kilimlər"},
        {"value": "Palazlar", "label": "Palazlar"},
        {"value": "Hamam və tualet üçün xalçalar", "label": "Hamam və tualet üçün xalçalar"},
        {"value": "Qapı qabağı xalçalar", "label": "Qapı qabağı xalçalar"}
      ]
    }
  ]
  $json$::jsonb;
  mebel_options jsonb := $json$
  [
    {"value": "Asılqanlar", "label": "Asılqanlar"},
    {"value": "Bufetlər və servantlar", "label": "Bufetlər və servantlar"},
    {"value": "Çarpayılar", "label": "Çarpayılar"},
    {"value": "Dəhliz mebeli", "label": "Dəhliz mebeli"},
    {"value": "Divanlar və kreslolar", "label": "Divanlar və kreslolar"},
    {"value": "Dolablar və komodlar", "label": "Dolablar və komodlar"},
    {"value": "Döşəklər", "label": "Döşəklər"},
    {"value": "Masalar və oturacaqlar", "label": "Masalar və oturacaqlar"},
    {"value": "Mətbəx mebeli", "label": "Mətbəx mebeli"},
    {"value": "Ofis mebeli", "label": "Ofis mebeli"},
    {"value": "Puflar və banketkalar", "label": "Puflar və banketkalar"},
    {"value": "Qonaq otağı mebeli", "label": "Qonaq otağı mebeli"},
    {"value": "Rəflər", "label": "Rəflər"},
    {"value": "Tumbalar", "label": "Tumbalar"},
    {"value": "Yataq otağı mebeli", "label": "Yataq otağı mebeli"},
    {"value": "Digər", "label": "Digər"}
  ]
  $json$::jsonb;
  spec jsonb;
  subcategory_id uuid;
  existing_category_id uuid;
  existing_subcategory_id uuid;
  existing_schema jsonb;
  existing_active boolean;
  expected_schema jsonb;
  mebel_v1_schema_id uuid;
  mebel_v1_category_id uuid;
  mebel_v1_subcategory_id uuid;
  mebel_schema_version integer;
  mebel_v1_schema jsonb;
  mebel_v1_active boolean;
  expected_mebel_schema jsonb;
  mebel_fields jsonb;
begin
  select count(*)
  into parent_count
  from public.categories
  where slug = 'ev-ve-bag';

  if parent_count <> 1 then
    raise exception 'Expected exactly one ev-ve-bag category, found %', parent_count;
  end if;

  select id
  into ev_bag_category_id
  from public.categories
  where slug = 'ev-ve-bag';

  if jsonb_array_length(target_specs) <> 10 then
    raise exception 'Expected exactly 10 new Ev ve bag type schema specs';
  end if;

  for spec in select value from jsonb_array_elements(target_specs)
  loop
    select count(*)
    into row_count
    from public.subcategories
    where category_id = ev_bag_category_id
      and slug = spec ->> 'slug';

    if row_count <> 1 then
      raise exception 'Expected exactly one % subcategory under ev-ve-bag, found %', spec ->> 'slug', row_count;
    end if;

    select id
    into subcategory_id
    from public.subcategories
    where category_id = ev_bag_category_id
      and slug = spec ->> 'slug';

    expected_schema := jsonb_build_object(
      'contract_version', 1,
      'category_key', 'home_garden',
      'category_slug', 'ev-ve-bag',
      'schema_version', 1,
      'subcategory_slugs', jsonb_build_array(spec ->> 'slug'),
      'requires_subcategory', true,
      'fields', jsonb_build_array(
        jsonb_build_object(
          'key', spec ->> 'field_key',
          'type', 'select',
          'label', 'Növ',
          'order', 10,
          'options', spec -> 'options',
          'required', true,
          'destination', 'attributes'
        )
      )
    );

    select count(*)
    into row_count
    from public.category_form_schemas
    where category_slug = 'ev-ve-bag'
      and subcategory_slug = spec ->> 'slug'
      and schema_version = 1;

    if row_count = 0 then
      select count(*)
      into active_count
      from public.category_form_schemas
      where category_slug = 'ev-ve-bag'
        and subcategory_slug = spec ->> 'slug'
        and is_active;

      if active_count <> 0 then
        raise exception 'Unexpected active schema already exists for %', spec ->> 'slug';
      end if;

      insert into public.category_form_schemas (
        category_id,
        subcategory_id,
        category_slug,
        subcategory_slug,
        schema_version,
        schema,
        is_active
      )
      values (
        ev_bag_category_id,
        subcategory_id,
        'ev-ve-bag',
        spec ->> 'slug',
        1,
        expected_schema,
        true
      );
    elsif row_count = 1 then
      select form_schema.category_id, form_schema.subcategory_id, form_schema.schema, form_schema.is_active
      into existing_category_id, existing_subcategory_id, existing_schema, existing_active
      from public.category_form_schemas as form_schema
      where form_schema.category_slug = 'ev-ve-bag'
        and form_schema.subcategory_slug = spec ->> 'slug'
        and form_schema.schema_version = 1;

      if existing_category_id is distinct from ev_bag_category_id
        or existing_subcategory_id is distinct from subcategory_id
        or existing_schema is distinct from expected_schema
        or not existing_active then
        raise exception 'Existing schema version 1 for % does not match the approved schema', spec ->> 'slug';
      end if;
    else
      raise exception 'Expected at most one schema version 1 for %, found %', spec ->> 'slug', row_count;
    end if;
  end loop;

  select count(*)
  into row_count
  from public.subcategories
  where category_id = ev_bag_category_id
    and slug = 'mebel';

  if row_count <> 1 then
    raise exception 'Expected exactly one mebel subcategory under ev-ve-bag, found %', row_count;
  end if;

  select id
  into subcategory_id
  from public.subcategories
  where category_id = ev_bag_category_id
    and slug = 'mebel';

  select count(*)
  into row_count
  from public.category_form_schemas
  where category_slug = 'ev-ve-bag'
    and subcategory_slug = 'mebel'
    and schema_version = 1;

  if row_count <> 1 then
    raise exception 'Expected exactly one historical mebel schema version 1, found %', row_count;
  end if;

  select form_schema.id,
         form_schema.category_id,
         form_schema.subcategory_id,
         form_schema.schema_version,
         form_schema.schema,
         form_schema.is_active
  into mebel_v1_schema_id,
       mebel_v1_category_id,
       mebel_v1_subcategory_id,
       mebel_schema_version,
       mebel_v1_schema,
       mebel_v1_active
  from public.category_form_schemas as form_schema
  where form_schema.category_slug = 'ev-ve-bag'
    and form_schema.subcategory_slug = 'mebel'
    and form_schema.schema_version = 1;

  if mebel_v1_category_id is distinct from ev_bag_category_id
    or mebel_v1_subcategory_id is distinct from subcategory_id then
    raise exception 'Historical mebel schema version 1 does not belong to the canonical ev-ve-bag/mebel taxonomy';
  end if;

  if mebel_schema_version <> 1 then
    raise exception 'Expected mebel schema version 1, found %', mebel_schema_version;
  end if;

  if jsonb_typeof(mebel_v1_schema -> 'fields') <> 'array' then
    raise exception 'Historical mebel schema version 1 has no valid fields array';
  end if;

  select count(*)
  into row_count
  from jsonb_array_elements(mebel_v1_schema -> 'fields') as fields(field)
  where field ->> 'key' = 'furniture_type';

  if row_count <> 1 then
    raise exception 'Expected exactly one furniture_type field in historical mebel schema version 1, found %', row_count;
  end if;

  select jsonb_agg(
    case
      when field ->> 'key' = 'furniture_type'
        then field || jsonb_build_object('label', 'Növ', 'options', mebel_options)
      else field
    end
    order by ordinal
  )
  into mebel_fields
  from jsonb_array_elements(mebel_v1_schema -> 'fields') with ordinality as fields(field, ordinal);

  expected_mebel_schema := jsonb_set(mebel_v1_schema, '{fields}', mebel_fields, false);
  expected_mebel_schema := jsonb_set(expected_mebel_schema, '{schema_version}', '2'::jsonb, true);

  select count(*)
  into row_count
  from public.category_form_schemas
  where category_slug = 'ev-ve-bag'
    and subcategory_slug = 'mebel'
    and schema_version = 2;

  if row_count = 0 then
    select count(*)
    into active_count
    from public.category_form_schemas
    where category_slug = 'ev-ve-bag'
      and subcategory_slug = 'mebel'
      and is_active;

    if active_count <> 1 or mebel_v1_active is distinct from true then
      raise exception 'Expected mebel schema version 1 to be the only active schema';
    end if;

    update public.category_form_schemas
    set is_active = false,
        updated_at = now()
    where id = mebel_v1_schema_id
      and is_active;

    if not found then
      raise exception 'Active mebel schema changed concurrently';
    end if;

    insert into public.category_form_schemas (
      category_id,
      subcategory_id,
      category_slug,
      subcategory_slug,
      schema_version,
      schema,
      is_active
    )
    values (
      ev_bag_category_id,
      subcategory_id,
      'ev-ve-bag',
      'mebel',
      2,
      expected_mebel_schema,
      true
    );
  elsif row_count = 1 then
    select form_schema.category_id, form_schema.subcategory_id, form_schema.schema, form_schema.is_active
    into existing_category_id, existing_subcategory_id, existing_schema, existing_active
    from public.category_form_schemas as form_schema
    where form_schema.category_slug = 'ev-ve-bag'
      and form_schema.subcategory_slug = 'mebel'
      and form_schema.schema_version = 2;

    select count(*)
    into active_count
    from public.category_form_schemas
    where category_slug = 'ev-ve-bag'
      and subcategory_slug = 'mebel'
      and is_active;

    if existing_category_id is distinct from ev_bag_category_id
      or existing_subcategory_id is distinct from subcategory_id
      or not existing_active
      or mebel_v1_active is distinct from false
      or active_count <> 1
      or existing_schema is distinct from expected_mebel_schema then
      raise exception 'Existing mebel schema version 2 does not match the approved schema';
    end if;
  else
    raise exception 'Expected at most one mebel schema version 2, found %', row_count;
  end if;
end;
$migration$;
