# Deployment Guide: Prime Glory PPC System

## 🎯 Goal
Get your PPC system running on the internet with **free tier services**.

---

## **Step 1️⃣: Create GitHub Repository**

### 1a. Sign up (if needed)
- Go to [github.com](https://github.com)
- Click **Sign up**
- Create account with email

### 1b. Create new repository
- Click **New** (top left after logging in)
- Name: `prime-glory-ppc` (or anything)
- **Public** (free Vercel requires public repo)
- Skip "Initialize README" (we have one)
- Click **Create repository**

### 1c. Push code
```bash
# From your project directory
cd C:\Users\01\Desktop\Claude\PPC

# Add remote
git remote add origin https://github.com/YOUR-USERNAME/prime-glory-ppc.git
git branch -M main
git push -u origin main
```

✅ Your code is now on GitHub!

---

## **Step 2️⃣: Deploy to Vercel**

### 2a. Sign up at Vercel
- Go to [vercel.com](https://vercel.com)
- Click **Sign up**
- Select "Continue with GitHub"
- Authorize GitHub integration
- You're in! ✅

### 2b. Create new project
1. Click **Add New...** → **Project**
2. Select GitHub account
3. Find & import `prime-glory-ppc` repo
4. Click **Import**

### 2c. Configure environment
1. **Environment Variables** section:
   ```
   VITE_SUPABASE_URL=https://onucjibwifwajzizlshv.supabase.co
   VITE_SUPABASE_KEY=sb_publishable_jR8yyCqOQgAgKfac3TvTmw_APJ3u3ws
   ```
2. Click **Add** for each one
3. No build command needed (HTML is static)

### 2d. Deploy
- Click **Deploy**
- Wait 1-2 minutes...
- ✅ **Your site is live!**

You'll get a URL like: `https://prime-glory-ppc.vercel.app`

---

## **Step 3️⃣: Custom Domain (Optional)**

If you have a domain (e.g., ppc.yourcompany.com):
1. In Vercel project settings → **Domains**
2. Add your domain
3. Follow DNS instructions
4. Done!

---

## **Step 4️⃣: After Deployment**

### Test the live site:
- Open Vercel URL in browser
- Login: `admin` / `prime888`
- Navigate all modules to verify

### Update in production:
Just push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push origin main
```
Vercel redeploys automatically! 🚀

---

## **Troubleshooting**

| Issue | Fix |
|-------|-----|
| Build fails | Check `Prime Glory PPC System.html` exists in root |
| Data not loading | Verify Supabase API key in Vercel env vars |
| Site shows 404 | Make sure `Prime Glory PPC System.html` is the entry |
| Styling broken | Check `app/styles.css` is loading (browser DevTools) |

---

## **Vercel Free Tier Limits**

- ✅ Unlimited sites
- ✅ Unlimited deployments
- ✅ Free SSL certificate
- ✅ Global CDN
- ⚠️ 6GB bandwidth/month (enough for small team)

---

## **Supabase Free Tier Limits**

- ✅ 500MB database
- ✅ 2GB bandwidth
- ✅ Auth included
- ✅ Realtime sync
- ⚠️ No backups (upgrade for that)

---

## **Cost Estimate (Monthly)**

| Service | Cost |
|---------|------|
| Vercel | FREE |
| Supabase | FREE (until 500MB) |
| **Total** | **$0** |

Upgrade when:
- Database > 500MB
- Bandwidth > 2GB/month
- Team members > 5

---

## **Next Steps**

1. ✅ Push to GitHub
2. ✅ Deploy to Vercel
3. 📝 Share the live URL with your team
4. 🔐 Consider adding auth (Supabase Auth)
5. 📊 Monitor Supabase dashboard

---

## **Support Links**

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- GitHub: https://docs.github.com

Enjoy! 🎉
