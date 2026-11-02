# Deploy guide — At-Taqwa Institute

| Part | Kothay | Free shuru? |
|---|---|---|
| Frontend (Next.js, repo root) | Vercel | Hobby plan |
| Backend API (`backend/`) | Render (`render.yaml`) | Free (15 min idle hole ghumay, prothom request e ~1 min) — live er jonno Starter plan valo |
| Database | MongoDB Atlas (already ache: `cluster0.jiloy9j`) | M0 free |
| Email (OTP) | Resend | 3,000/mash free |
| File upload | Cloudflare R2 | 10 GB free |

## 0. Domain age lagbe

Login cookie (`accessToken`) frontend ar API — duitate porte hobe, tai **duita ekoi domain er niche thakte hobe**:

- Website: `attaqwainstitute.com` (ar `www.`)
- API: `api.attaqwainstitute.com`

`*.vercel.app` ar `*.onrender.com` diye login kaj korbe na. Domain onno hole `render.yaml` er `FRONTEND_URL`, `COOKIE_DOMAIN`, `EMAIL_FROM` bodlate hobe.

## 1. MongoDB Atlas

1. Atlas → **Network Access** → `0.0.0.0/0` allow (Render er IP fixed na).
2. **Database Access** → production er jonno notun user + strong password.
3. Connection string copy: `mongodb+srv://USER:PASS@cluster0.jiloy9j.mongodb.net/?retryWrites=true&w=majority`

## 2. Resend (OTP email)

1. resend.com → domain add (`attaqwainstitute.com`) → je DNS record dey, segulo domain e bosan → Verify.
2. API key banan → pore Render e `RESEND_API_KEY` e dibo.

## 3. Backend → Render

1. render.com → GitHub diye login → **New → Blueprint** → `attaqwainstitute` repo select.
2. `render.yaml` theke `attaqwa-api` service banabe. `sync: false` gula chaibe: `INTERNAL_API_KEY` (niche dekhun), `MONGODB_URI`, `RESEND_API_KEY`, bKash/Nagad number, R2 er 5 ta (R2 pore dile upload 503 dibe, baki shob cholbe).
3. Deploy shesh hole: `https://attaqwa-api.onrender.com/api/v1/health` → `ok` ashle thik.
4. **Settings → Custom Domain** → `api.attaqwainstitute.com` add → je CNAME dey seta DNS e bosan.

`JWT_SECRET` ar `OTP_SECRET` Render nije random baniye dey — kokhono bodlaben na (bodlale shobai logout).

### `INTERNAL_API_KEY` banano

Ekta lomba random string, Render ar Vercel **duitatei ekoi value**:

```
openssl rand -hex 32
```

`JWT_SECRET` / `OTP_SECRET` theke alada hote hobe. Kauke dekhaben na, GitHub e push korben na.

## 4. Frontend → Vercel

1. vercel.com → GitHub diye login → **Add New → Project** → `attaqwainstitute` repo → Framework: Next.js, Root: `./` (default).
2. **Environment Variables**:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://attaqwainstitute.com` |
   | `API_URL` | `https://api.attaqwainstitute.com/api/v1` |
   | `NEXT_PUBLIC_API_URL` | `https://api.attaqwainstitute.com/api/v1` |
   | `INTERNAL_API_KEY` | Render e je value diyechen **hubohu sheta** (na dile `/admin` ar `/my-account` rate limit e bondho hoye jabe) |
   | `ANTHROPIC_API_KEY` | AI chat er jonno (na dile chat bondho thakbe) |
   | `CHAT_MODEL` | `claude-sonnet-5-5` |
   | `NEXT_PUBLIC_MADRASATUT_TAQWA_URL` | Madrasatut Taqwa er site (optional) |

3. Deploy → **Settings → Domains** → `attaqwainstitute.com` ar `www.attaqwainstitute.com` add → DNS record bosan.

### AI chat er khoroch er limit (obosshoi)

console.anthropic.com → **Settings → Limits** → mashik spend limit set korun (jemon $20). Code e o limit ache, kintu sheta server er memory te thake ar Vercel e reset hoy — asol shima eta.

## 5. Prothom admin

1. Live site e `/bn/register` diye nijer email e account khulun.
2. Nijer computer e (`backend/.env` e production `MONGODB_URI` thakle):
   ```
   cd backend
   npm run admin:promote -- apnar@email.com
   ```
3. Logout → abar login → `/admin`.

## 6. Live er por check

- [ ] `https://attaqwainstitute.com` → `/bn` e jay, homepage ashe
- [ ] Register → email e OTP ashe → login hoy
- [ ] `/admin` → course + batch banano jay → homepage e course dekhay
- [ ] Ekta test enrollment → admin approve → email ashe → test data muche din
- [ ] Browser e `https://` lock ache

## Code update korle

`main` branch e push korlei Vercel ar Render nije nije abar deploy kore.
