-- MarktX Security Remediation 2C: classifier and sanitized-error matrix.
-- Use only after applying 20260719130000_message_sensitive_credentials_block.sql
-- in an approved isolated/staging environment.
--
-- This script does not insert public.messages rows.
--
-- Expected client-visible blocked error shape from the trigger:
--   code: 23514
--   message: message_sensitive_credentials_blocked
--   details: {"category":"cvv"}
--
-- The details object must contain no actor_id, conversation_id, customer_id,
-- store_id, message body, matched substring, policy name, stack trace, card
-- number, CVV, PIN, OTP, password, access token, refresh token, or secret.

with samples(label, body, expected_category) as (
  values
    -- ALLOW: normal marketplace/payment logistics must not be blocked.
    ('allow_normal_marketplace_az', 'Salam, mehsul movcuddur?', null::text),
    ('allow_card_number_request_for_transfer_az', 'Odenis etmek ucun kart nomrenizi yazin', null),
    ('allow_valid_test_pan_only', 'Kart nomrem ' || '411111' || '111111' || '1111', null),
    ('allow_iban', 'IBAN: AZ21NABZ00000000137010001944', null),
    ('allow_bank_account_number', 'Bank hesab nomresi 123456789012', null),
    ('allow_phone_number', 'Telefon: +994 51 471 11 18', null),
    ('allow_price', 'Qiymet 250 AZN', null),
    ('allow_ordinary_date', 'Catdirilma 19.07.2026 tarixinde olar', null),
    ('allow_listing_uuid', 'Elan id 11111111-1111-4111-8111-111111111111', null),
    ('allow_contract_number', 'Muqavile nomresi MX-2026-15', null),
    ('allow_product_serial_number', 'Serial nomresi SN-2026-ABCD-7788', null),
    ('allow_product_pin_door_az', 'PIN kodlu qapidir', null),
    ('allow_product_pin_question_az', 'Mehsulun PIN-i var?', null),
    ('allow_router_pin_az', 'Router PIN-i haradadir?', null),
    ('allow_sms_discussion_az', 'SMS geldi', null),
    ('allow_code_discussion_az', 'Kod geldi?', null),
    ('allow_product_code_request_az', 'Mehsulun kodunu gonderin', null),
    ('allow_listing_code_question_az', 'Elanin kodu nedir?', null),
    ('allow_product_expiry_question_az', 'Son istifade tarixi nedir?', null),
    ('allow_product_back_photo_az', 'Mehsulun arxa terefinin seklini gonderin', null),
    ('allow_member_card_color_az', 'Kartin rengi nedir?', null),
    ('allow_sim_card_photo_az', 'SIM kartin seklini gonderin', null),
    ('allow_screen_share_no_bank_az', 'Ekrani paylas', null),
    ('allow_teamviewer_computer_en', 'TeamViewer ile komputere baxaq', null),
    ('allow_phone_screen_photo_az', 'Telefon ekraninin seklini gonderin', null),
    ('allow_turkish_product_pin', 'Urunun PIN kodu var mi?', null),
    ('allow_russian_sms_discussion', 'SMS пришло', null),
    ('allow_russian_product_photo', 'Отправьте фото обратной стороны товара', null),

    -- BLOCK: high-confidence sensitive banking credentials only.
    ('block_cvv_az', 'CVV-ni gonderin', 'cvv'),
    ('block_cvc_az', 'Kartin arxasindaki CVC-ni yazin', 'cvv'),
    ('block_card_security_code_en', 'Send me the card security code', 'cvv'),
    ('block_cvv_ru', 'код CVV напишите', 'cvv'),
    ('block_pin_card_az', 'Kartin PIN kodunu gonderin', 'pin'),
    ('block_pin_bank_az', 'Bank PIN-ni yazin', 'pin'),
    ('block_pin_payment_az', 'Odenis PIN-ni mene deyin', 'pin'),
    ('block_pin_en', 'Send your banking PIN', 'pin'),
    ('block_otp_az', 'OTP kodunu yaz', 'otp'),
    ('block_bank_sms_code_az', 'Bankdan gelen SMS kodunu mene gonder', 'otp'),
    ('block_verification_code_en', 'Send the verification code from your bank', 'otp'),
    ('block_confirmation_code_ru', 'Пришлите код из SMS', 'otp'),
    ('block_mobile_banking_password_az', 'Mobil bank parolunu gonderin', 'banking_password'),
    ('block_online_banking_password_en', 'Online banking password lazimdir', 'banking_password'),
    ('block_banking_password_tr', 'Mobil bank sifreni yaz', 'banking_password'),
    ('block_banking_password_ru', 'Пароль мобильного банка напишите', 'banking_password'),
    ('block_card_photo_az', 'Kartin on ve arxa seklini gonderin', 'card_photo_request'),
    ('block_card_photo_en', 'Send a photo of the back of your card', 'card_photo_request'),
    ('block_card_photo_ru', 'Отправьте фото обратной стороны карты', 'card_photo_request'),
    ('block_card_number_expiry_az', 'Kart nomresi ve son istifade tarixini yazin', 'card_auth_combo'),
    ('block_card_number_expiry_security_en', 'Send card number, expiry and security code', 'card_auth_combo'),
    ('block_luhn_expiry_az', 'Kart ' || '411111' || '111111' || '1111' || ' son istifade 12/28', 'card_auth_combo'),
    ('block_remote_bank_az', 'AnyDesk ac, bank tetbiqine qosulum', 'remote_banking_access'),
    ('block_screen_payment_az', 'Ekrani paylas, odenisi men edim', 'remote_banking_access'),
    ('block_remote_bank_en', 'Give me remote access to your online banking', 'remote_banking_access'),
    ('block_remote_bank_ru', 'Откройте удаленный доступ к банковскому приложению', 'remote_banking_access')
),
actuals as (
  select
    label,
    expected_category,
    public.marktx_classify_message_sensitive_credentials(body) as actual_category
  from samples
)
select
  label,
  expected_category,
  actual_category,
  actual_category is not distinct from expected_category as passed
from actuals
order by label;

with samples(label, body, expected_category) as (
  values
    ('allow_normal_marketplace_az', 'Salam, mehsul movcuddur?', null::text),
    ('allow_card_number_request_for_transfer_az', 'Odenis etmek ucun kart nomrenizi yazin', null),
    ('allow_valid_test_pan_only', 'Kart nomrem ' || '411111' || '111111' || '1111', null),
    ('allow_iban', 'IBAN: AZ21NABZ00000000137010001944', null),
    ('allow_bank_account_number', 'Bank hesab nomresi 123456789012', null),
    ('allow_phone_number', 'Telefon: +994 51 471 11 18', null),
    ('allow_price', 'Qiymet 250 AZN', null),
    ('allow_ordinary_date', 'Catdirilma 19.07.2026 tarixinde olar', null),
    ('allow_listing_uuid', 'Elan id 11111111-1111-4111-8111-111111111111', null),
    ('allow_contract_number', 'Muqavile nomresi MX-2026-15', null),
    ('allow_product_serial_number', 'Serial nomresi SN-2026-ABCD-7788', null),
    ('allow_product_pin_door_az', 'PIN kodlu qapidir', null),
    ('allow_product_pin_question_az', 'Mehsulun PIN-i var?', null),
    ('allow_router_pin_az', 'Router PIN-i haradadir?', null),
    ('allow_sms_discussion_az', 'SMS geldi', null),
    ('allow_code_discussion_az', 'Kod geldi?', null),
    ('allow_product_code_request_az', 'Mehsulun kodunu gonderin', null),
    ('allow_listing_code_question_az', 'Elanin kodu nedir?', null),
    ('allow_product_expiry_question_az', 'Son istifade tarixi nedir?', null),
    ('allow_product_back_photo_az', 'Mehsulun arxa terefinin seklini gonderin', null),
    ('allow_member_card_color_az', 'Kartin rengi nedir?', null),
    ('allow_sim_card_photo_az', 'SIM kartin seklini gonderin', null),
    ('allow_screen_share_no_bank_az', 'Ekrani paylas', null),
    ('allow_teamviewer_computer_en', 'TeamViewer ile komputere baxaq', null),
    ('allow_phone_screen_photo_az', 'Telefon ekraninin seklini gonderin', null),
    ('allow_turkish_product_pin', 'Urunun PIN kodu var mi?', null),
    ('allow_russian_sms_discussion', 'SMS пришло', null),
    ('allow_russian_product_photo', 'Отправьте фото обратной стороны товара', null),
    ('block_cvv_az', 'CVV-ni gonderin', 'cvv'),
    ('block_cvc_az', 'Kartin arxasindaki CVC-ni yazin', 'cvv'),
    ('block_card_security_code_en', 'Send me the card security code', 'cvv'),
    ('block_cvv_ru', 'код CVV напишите', 'cvv'),
    ('block_pin_card_az', 'Kartin PIN kodunu gonderin', 'pin'),
    ('block_pin_bank_az', 'Bank PIN-ni yazin', 'pin'),
    ('block_pin_payment_az', 'Odenis PIN-ni mene deyin', 'pin'),
    ('block_pin_en', 'Send your banking PIN', 'pin'),
    ('block_otp_az', 'OTP kodunu yaz', 'otp'),
    ('block_bank_sms_code_az', 'Bankdan gelen SMS kodunu mene gonder', 'otp'),
    ('block_verification_code_en', 'Send the verification code from your bank', 'otp'),
    ('block_confirmation_code_ru', 'Пришлите код из SMS', 'otp'),
    ('block_mobile_banking_password_az', 'Mobil bank parolunu gonderin', 'banking_password'),
    ('block_online_banking_password_en', 'Online banking password lazimdir', 'banking_password'),
    ('block_banking_password_tr', 'Mobil bank sifreni yaz', 'banking_password'),
    ('block_banking_password_ru', 'Пароль мобильного банка напишите', 'banking_password'),
    ('block_card_photo_az', 'Kartin on ve arxa seklini gonderin', 'card_photo_request'),
    ('block_card_photo_en', 'Send a photo of the back of your card', 'card_photo_request'),
    ('block_card_photo_ru', 'Отправьте фото обратной стороны карты', 'card_photo_request'),
    ('block_card_number_expiry_az', 'Kart nomresi ve son istifade tarixini yazin', 'card_auth_combo'),
    ('block_card_number_expiry_security_en', 'Send card number, expiry and security code', 'card_auth_combo'),
    ('block_luhn_expiry_az', 'Kart ' || '411111' || '111111' || '1111' || ' son istifade 12/28', 'card_auth_combo'),
    ('block_remote_bank_az', 'AnyDesk ac, bank tetbiqine qosulum', 'remote_banking_access'),
    ('block_screen_payment_az', 'Ekrani paylas, odenisi men edim', 'remote_banking_access'),
    ('block_remote_bank_en', 'Give me remote access to your online banking', 'remote_banking_access'),
    ('block_remote_bank_ru', 'Откройте удаленный доступ к банковскому приложению', 'remote_banking_access')
),
actuals as (
  select
    label,
    expected_category,
    public.marktx_classify_message_sensitive_credentials(body) as actual_category
  from samples
)
select
  count(*) filter (where actual_category is distinct from expected_category) as failing_checks,
  count(*) as total_checks
from actuals;
