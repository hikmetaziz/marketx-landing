# İş kompüteri format — əvvəl checklist (MarktX)

IT format tələb edəndə bu siyahı ilə **kodu, secret-ləri və hesabları** itirməmək üçün addım-addım keçin.

**Son yeniləmə:** 2026-06-30  
**Layihələr:** `marketx-landing` (veb), `marktx-app` (mobil)  
**Disk:** `F:\` = **Box Drive** (fayllar buludda sync olunur)

---

## 0. F:\ = Box — nə deməkdir?

Layihələr `F:\projects\...` altındadırsa, **fayllar Box buludunda da var**. Format local diskı silir, amma Box hesabındakı fayllar adətən **qalır**.

| Formatdan sonra | Nə olur |
|-----------------|--------|
| Box-da olan fayllar | Buludda qalır — itmir |
| Local `F:\` cache | Silinir — yenidən sync lazımdır |
| `C:\` (Git, Node, Cursor, SSH) | **Silinir** — yenidən quraşdırmaq lazımdır |

**Formatdan əvvəl mütləq:**
- [ ] Box tray ikonu → **“All files synced”** / hamısı yaşıl — gözləyən upload bitib
- [ ] Box web (box.com) açıb `projects/websites/marketx-landing` görünürmü yoxla

**Formatdan sonra:**
1. Windows + **Box Drive** client quraşdır
2. Eyni iş hesabı ilə daxil ol
3. `F:\` yenidən map/sync olsun
4. `C:\`-də Git, Node.js, Cursor quraşdır
5. Hər repoda `npm install` ( `node_modules` sync gözləmə — yerində yarat)

**Box sync istisnası (tövsiyə):** Box settings-də `node_modules`, `.next`, `dist` ignore etsən sync sürətli olar. Formatdan sonra yenə `npm install` / `npm run build` edərsən.

**Təhlükəsizlik:** `.env.local` Box-a sync olursa — buludda secret saxlanır. Mümkünsə password manager; Box iş hesabıdırsa IT-nin access-i ola bilər.

---

## 1. Kod — Git (mütləq)

Hər repoda:

```bash
cd F:\projects\websites\marketx-landing
git status
git push

cd F:\projects\mobile_apps\marktx-app
git status
git push
```

- [ ] Commit edilməyən dəyişiklik yoxdur (və ya qəsdən saxlanılan branch adı qeyd olunub)
- [ ] Remote (GitHub/GitLab) açılıb, push uğurludur
- [ ] Remote URL qeyd olunub: `git remote -v`

**Qeyd:** `F:\` Box-dadırsa, fayllar buludda qalır; yenə də **git push** et (versiya tarixçəsi + conflict ehtiyatı).

---

## 2. Secrets — git-ə düşməyən (ən vacib)

Bu fayllar **heç vaxt** repoya commit olunmamalıdır. Formatdan əvvəl **şifrələnmiş** yerə köçürün (password manager və ya BitLocker USB).

### Veb (`marketx-landing`)

- [ ] `.env.local` (Supabase URL, anon key, Turnstile və s.)
- [ ] `.env.example` ilə müqayisə — hansı dəyişənlər istifadə olunur

### Mobil (`marktx-app`)

- [ ] `.env` / `.env.local` (varsa)
- [ ] Expo / EAS secrets (Dashboard və ya `eas secret:list`)

### Ümumi

- [ ] Supabase **service role** key (əgər lokal saxlanılıbsa) — formatdan sonra **rotate** etməyi düşünün
- [ ] Vercel env variables (Dashboard-dan export / screenshot)
- [ ] Cloudflare Turnstile keys (varsa)
- [ ] Digər API açarları (AI, push və s.)

**Saxlama:** Bitwarden / 1Password / IT təklif etdiyi vault. Plain text email-ə göndərməyin.

---

## 3. SSH və GitHub

- [ ] `~/.ssh/id_ed25519` (və `.pub`) backup — **və ya** formatdan sonra **yeni key** yaradıb GitHub-a əlavə edin
- [ ] GitHub Personal Access Token (əgər `gh` / CI üçün istifadə olunursa)
- [ ] `gh auth status` — hesab bağlıdırsa, formatdan sonra yenidən `gh auth login`

Formatdan sonra tövsiyə: **yeni SSH key** + köhnəni GitHub-dan silin.

---

## 4. Hesablar və 2FA

Hər biri üçün giriş + **recovery kodları** password manager-də:

- [ ] GitHub
- [ ] Supabase (layihə admin)
- [ ] Vercel
- [ ] Expo / EAS
- [ ] Google / Apple (mobil test)
- [ ] Cursor (abunə / giriş)
- [ ] Domain / DNS (marketx.az — varsa)

- [ ] Bütün kritik hesablarda **2FA** aktivdir
- [ ] Recovery kodları yazılıb / export olunub

---

## 5. Layihə faylları

**`F:\` Box-dadırsa:** `F:\projects\` buludda sync olunur — ayrıca USB backup çox vaxt lazım deyil. Yoxla:

- [ ] Box sync tamamlanıb (pending upload yoxdur)
- [ ] box.com-da son fayllar görünür

**Box-da olmayan (adətən `C:\`):**

- [ ] `C:\Users\<ad>\.ssh\` — SSH açarları
- [ ] `C:\Users\<ad>\.cursor\` — Cursor settings (istəyə bağlı)
- [ ] Desktop / Downloads — `C:\`-də qalıbsa, Box-a köçür və ya push et
- [ ] Brauzer bookmark / saved passwords

---

## 6. Formatdan əvvəl — təhlükəsizlik

- [ ] Bütün layihə hesablarından brauzerdə **çıxış**
- [ ] İş profilində saxlanmış parolları yoxla (Edge/Chrome)
- [ ] IT-yə soruş: disk **BitLocker** ilə şifrələnibmi?
- [ ] Şübhəli proqram / malware varsa — format məntiqlidir; secrets rotate planı hazırla

---

## 7. Formatdan sonra — yenidən quraşdırma (qısa)

| # | Nə | Əmr / link |
|---|-----|------------|
| 1 | Git | git-scm.com |
| 2 | Node.js LTS | nodejs.org |
| 3 | Cursor | cursor.com |
| 3b | **Box Drive** | box.com/desktop — `F:\` üçün |
| 4 | Layihələr | Box client → `F:\` sync **və ya** `git clone` |
| 5 | Dependencies | `npm install` (hər repo — `node_modules` yenidən) |
| 6 | Env | `.env.local` Box-dan gəlirsə yoxla; yoxdursa password manager-dən |
| 7 | Veb dev | `npm run dev` → localhost:3000 |
| 8 | Mobil | `cd marktx-app && npm run start` |
| 9 | E2E | `npx playwright install chromium` → `npm run test:e2e` |
| 10 | EAS (lazımsa) | `npm i -g eas-cli` → `eas login` |
| 11 | GitHub CLI (lazımsa) | `gh auth login` |

**Bulud (quraşdırma lazım deyil):** Supabase Dashboard, Vercel, Expo web.

**Optional:** Python 3 + Pillow (`scripts/extract-catalogue-icons.py`), Supabase CLI (`supabase functions deploy`), Android Studio (yalnız local emulator).

---

## 8. Formatdan sonra — secret rotate (tövsiyə)

Əgər `.env` və ya service role iş kompüterində açıq saxlanılıbsa:

- [ ] Supabase → Settings → API → service role **yenilə** (lazım idisə)
- [ ] GitHub → SSH keys → köhnə key **sil**, yenisini əlavə et
- [ ] Digər leak ehtimalı olan API key-ləri rotate et

---

## 9. IT ilə paylaşılacaq cümlə (qısa)

> Layihə fayllarım **Box Drive**-dadır (`F:\projects\`). Kod həm GitHub-dadır. Formatdan sonra Box client + Git + Node.js quraşdırıb sync gözləyəcəyəm. Secret-lər `.env`-dədir, repoda deyil.

---

## Tez yoxlama (5 dəqiqə)

```
□ Box sync tamam — tray yaşıl
□ git push — hər iki repo
□ .env Box-da / password manager-də
□ C:\ .ssh backup və ya formatdan sonra yeni key
□ 2FA recovery kodları
```

Format **təhlükəsizlik tədbiri**dir; düzgün backup ilə MarktX işinə 1–2 saatda qayıtmaq olar.
