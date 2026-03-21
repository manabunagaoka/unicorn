# 📈 Stock Price API Setup Guide

## ✅ What's Already Done

The stock price integration is **fully implemented** and working with mock data. Once you add your API key, it will automatically switch to real-time prices.

---

## 🚀 Get Your Free Finnhub API Key (2 minutes)

### Step 1: Sign Up
1. Go to: https://finnhub.io/register
2. Enter your email
3. Click "Sign Up" (it's instant - no credit card needed!)

### Step 2: Get API Key
1. After login, you'll see your **API Key** on the dashboard
2. Copy it (looks like: `abc123xyz456...`)

### Step 3: Add to RIZE
1. Open `.env.local` in your project
2. Find the line: `STOCK_API_KEY=`
3. Paste your key: `STOCK_API_KEY=abc123xyz456...`
4. Save the file

### Step 4: Add to Vercel (Production)
1. Go to: https://vercel.com/manabunagaokas-projects/rize-git-main-manabunagaokas-projects/settings/environment-variables
2. Click "Add New"
3. Name: `STOCK_API_KEY`
4. Value: `abc123xyz456...` (your key)
5. Environments: ✅ Production, ✅ Preview, ✅ Development
6. Click "Save"
7. Redeploy from Deployments tab

**Done!** Stock prices will now update from real market data every 5 minutes.

---

## 📊 How It Works

### Current Setup:
- **Endpoint:** `/api/stock/[ticker]`
- **Cache:** 5 minutes (300 seconds)
- **Fallback:** Mock data if API key missing or API fails
- **Rate Limit:** 60 calls/minute (free tier)
- **Usage:** ~3 calls per page load (META, MSFT, DBX)

### With Caching:
- Page loads from 100 users = only 3 API calls (all cached)
- API refreshes every 5 minutes automatically
- **Daily usage:** ~864 API calls (well under free limit)

---

## 🧪 Testing

### Without API Key (Current State):
- Stock prices show mock data
- Everything works perfectly
- Good for development

### With API Key:
```bash
# Local testing
npm run dev
# Visit: http://localhost:3000
# Stock prices update from real market data
```

### Production:
- Vercel auto-deploys on git push
- Add STOCK_API_KEY in Vercel dashboard
- Redeploy to activate real prices

---

## 📈 What You Get

### Real-Time Stock Data:
- **Current Price:** $497.43
- **Change:** +$5.23
- **Change %:** +1.06%
- **Updates:** Every 5 minutes
- **Trending Arrows:** 📈 Green for up, 📉 Red for down

### Companies Tracked:
- **META** (Facebook)
- **MSFT** (Microsoft)
- **DBX** (Dropbox)

---

## 🔧 Advanced Options (Optional)

### Change Cache Duration:
```typescript
// src/app/api/stock/[ticker]/route.ts
{ next: { revalidate: 300 } } // 300 seconds = 5 minutes

// Options:
// 60 = 1 minute (more frequent updates)
// 600 = 10 minutes (less API usage)
// 3600 = 1 hour (minimal API usage)
```

### Add More Stocks:
```typescript
// src/app/page.tsx
const SUCCESS_STORIES = [
  {
    name: 'Reddit',
    ticker: 'RDDT', // Just add ticker!
    // ... rest of config
  }
];
```

---

## 💡 Pro Tips

1. **No rush:** Mock data works great for testing
2. **Free forever:** 60 calls/min is plenty for your use case
3. **Smart caching:** Server-side cache means minimal API usage
4. **Automatic fallback:** If API fails, shows last cached value
5. **Production ready:** Just add the key and deploy!

---

## 🐛 Troubleshooting

### Prices Not Updating?
- Check API key is correct in `.env.local`
- Restart dev server: `npm run dev`
- Check Vercel environment variables

### Seeing Mock Data in Production?
- Verify STOCK_API_KEY is set in Vercel
- Redeploy after adding environment variable

### API Rate Limit Hit?
- Unlikely with caching
- Check if cache is working: `revalidate: 300`
- Contact Finnhub for higher limits (paid plan)

---

## 📚 Resources

- **Finnhub Docs:** https://finnhub.io/docs/api
- **Dashboard:** https://finnhub.io/dashboard
- **Support:** support@finnhub.io

---

**Ready when you are! No pressure - the site works great with mock data for now.** 🚀
