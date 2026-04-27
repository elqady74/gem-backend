# 🌐 i18n (Arabic / English) — Frontend Integration Guide

## كيف تشتغل؟

كل الـ API responses بتدعم **عربي وإنجليزي**. بتبعت الـ language اللي عايزها وبترجعلك الرسائل بيها.

---

## طريقة تحديد اللغة

### Option 1: `Accept-Language` Header (الأفضل)
```
Accept-Language: ar   →  عربي
Accept-Language: en   →  إنجليزي (default)
```

### Option 2: Query Parameter
```
GET /api/artifacts?lang=ar
GET /api/auth/me?lang=ar
```

> لو مبعتش حاجة → الديفولت **إنجليزي**.

---

## API: جلب الترجمات

### 1. جلب كل الترجمات مرة واحدة (الأفضل لتخزينها في الأبلكيشن)
```
GET /api/lang/all/translations
```
**Response:**
```json
{
  "supported": ["en", "ar"],
  "default": "en",
  "translations": {
    "en": {
      "server_error": "Server error",
      "user_already_exists": "User already exists",
      "invalid_credentials": "Invalid credentials",
      "..."
    },
    "ar": {
      "server_error": "خطأ في الخادم",
      "user_already_exists": "المستخدم موجود بالفعل",
      "invalid_credentials": "بيانات الدخول غير صحيحة",
      "..."
    }
  }
}
```

### 2. جلب ترجمة لغة معينة
```
GET /api/lang/ar
GET /api/lang/en
```
**Response:**
```json
{
  "lang": "ar",
  "translations": {
    "server_error": "خطأ في الخادم",
    "user_already_exists": "المستخدم موجود بالفعل",
    "..."
  }
}
```

### 3. جلب ترجمة حسب الهيدر
```
GET /api/lang
Accept-Language: ar
```

---

## مثال عملي (Axios)

```javascript
// ضبط اللغة في كل الريكوستات
axios.defaults.headers.common['Accept-Language'] = 'ar'; // أو 'en'

// مثال: تسجيل دخول
const res = await axios.post('/api/auth/login', {
  email: 'test@test.com',
  password: 'wrong'
});

// res.data.message → "بيانات الدخول غير صحيحة"
```

```javascript
// مثال: تحميل الترجمات عند تشغيل الأبلكيشن
const { data } = await axios.get('/api/lang/all/translations');
// data.translations.ar → كل الرسائل بالعربي
// data.translations.en → كل الرسائل بالإنجليزي
```

---

## كل الـ Translation Keys (68 key)

| Key | English | Arabic |
|-----|---------|--------|
| `server_error` | Server error | خطأ في الخادم |
| `user_already_exists` | User already exists | المستخدم موجود بالفعل |
| `user_registered` | User registered successfully | تم تسجيل المستخدم بنجاح |
| `invalid_credentials` | Invalid credentials | بيانات الدخول غير صحيحة |
| `google_token_required` | Google token is required | توكن جوجل مطلوب |
| `invalid_google_token` | Invalid Google token or unauthorized | توكن جوجل غير صالح أو غير مصرح |
| `no_user_with_email` | There is no user with that email | لا يوجد مستخدم بهذا البريد الإلكتروني |
| `reset_code_sent` | Reset code sent to email | تم إرسال كود إعادة التعيين إلى البريد الإلكتروني |
| `email_not_sent` | Email could not be sent | تعذر إرسال البريد الإلكتروني |
| `invalid_or_expired_code` | Invalid or expired reset code | الكود غير صالح أو منتهي الصلاحية |
| `code_verified` | Code verified successfully! | تم التحقق من الكود بنجاح! |
| `password_updated` | Password updated successfully | تم تحديث كلمة المرور بنجاح |
| `user_not_found` | User not found | المستخدم غير موجود |
| `language_must_be_en_or_ar` | Language must be 'en' or 'ar' | اللغة يجب أن تكون 'en' أو 'ar' |
| `old_password_required` | Old password is required | كلمة المرور القديمة مطلوبة |
| `cannot_change_google_password` | Cannot change password for Google-only accounts | لا يمكن تغيير كلمة المرور لحسابات جوجل فقط |
| `old_password_incorrect` | Old password is incorrect | كلمة المرور القديمة غير صحيحة |
| `new_password_min_length` | New password must be at least 6 characters | كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل |
| `profile_updated` | Profile updated successfully | تم تحديث الملف الشخصي بنجاح |
| `no_token` | No token, authorization denied | لا يوجد توكن، الوصول غير مصرح |
| `token_invalid` | Token is not valid | التوكن غير صالح |
| `access_denied_admin` | Access denied. Admins only. | الوصول مرفوض. للمسؤولين فقط. |
| `access_denied` | Access denied | الوصول مرفوض |
| `artifact_not_found` | Artifact not found | الأثر غير موجود |
| `artifact_deleted` | Artifact deleted successfully | تم حذف الأثر بنجاح |
| `question_required` | Question is required | السؤال مطلوب |
| `image_required` | Image is required | الصورة مطلوبة |
| `detection_api_not_configured` | Detection API is not configured | واجهة كشف الآثار غير مهيأة |
| `detection_api_offline` | Detection API is offline | واجهة كشف الآثار غير متاحة |
| `detection_failed` | Detection failed | فشل الكشف |
| `story_required` | Story text is required | نص القصة مطلوب |
| `story_api_not_configured` | Story-to-Image API is not configured | واجهة تحويل القصة إلى صورة غير مهيأة |
| `story_api_offline` | Story-to-Image API is offline | واجهة تحويل القصة إلى صورة غير متاحة |
| `image_generation_failed` | Image generation failed | فشل توليد الصورة |
| `name_required` | Name is required | الاسم مطلوب |
| `cartouche_failed` | Cartouche generation failed | فشل توليد الخرطوش |
| `statue_id_required` | statueId is required | معرّف التمثال مطلوب |
| `tts_invalid_response` | Invalid response from TTS model | استجابة غير صالحة من نموذج TTS |
| `tts_excel_required` | TTS Model Error: Excel file required | خطأ في نموذج TTS: يتطلب رفع ملف الإكسيل |
| `tts_failed` | Text-to-Speech generation failed | فشل تحويل النص إلى كلام |
| `image_to_3d_coming_soon` | Image-to-3D feature is coming soon | ميزة تحويل الصورة إلى 3D قريباً |
| `pharaoh_api_not_configured` | Photo-to-Pharaoh API is not configured | واجهة تحويل الصورة إلى فرعون غير مهيأة |
| `pharaoh_api_offline` | Photo-to-Pharaoh API is offline | واجهة تحويل الصورة إلى فرعون غير متاحة |
| `pharaoh_failed` | Pharaoh transformation failed | فشل التحويل إلى فرعون |
| `missing_booking_data` | Missing booking data | بيانات الحجز ناقصة |
| `invalid_nationality_type` | Invalid nationality type | نوع الجنسية غير صالح |
| `invalid_visit_date` | Invalid visit date format | صيغة تاريخ الزيارة غير صالحة |
| `visit_date_past` | Visit date cannot be in the past | لا يمكن أن يكون تاريخ الزيارة في الماضي |
| `missing_order_id` | Missing orderId | معرّف الطلب مفقود |
| `booking_not_found` | Booking not found | الحجز غير موجود |
| `payment_already_verified` | Payment already verified | تم التحقق من الدفع بالفعل |
| `payment_successful` | Payment successful | تم الدفع بنجاح |
| `payment_not_completed` | Payment not completed | لم يتم إكمال الدفع |
| `verification_error` | Verification error | خطأ في التحقق |
| `invalid_hmac` | Invalid HMAC | HMAC غير صالح |
| `invalid_webhook_data` | Invalid webhook data | بيانات Webhook غير صالحة |
| `webhook_processed` | Webhook processed | تمت معالجة Webhook |
| `webhook_error` | Webhook error | خطأ في Webhook |
| `invalid_favorite_type` | Invalid type. Must be 'Artifact' or 'Event' | نوع غير صالح. يجب أن يكون 'Artifact' أو 'Event' |
| `already_in_favorites` | Already in favorites | موجود بالفعل في المفضلة |
| `removed_from_favorites` | Removed from favorites | تمت الإزالة من المفضلة |
| `added_to_favorites` | Added to favorites | تمت الإضافة إلى المفضلة |
| `favorite_not_found` | Favorite not found | المفضلة غير موجودة |
| `no_file_uploaded` | No file uploaded | لم يتم رفع أي ملف |
| `upload_failed` | Upload failed | فشل الرفع |
| `event_deleted` | Event deleted | تم حذف الفعالية |
