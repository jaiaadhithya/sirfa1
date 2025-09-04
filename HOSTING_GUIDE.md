# SIRFA Agent Finance - Hosting & Deployment Guide

## 🚀 Quick Deployment Options

### 1. Vercel (Recommended for Frontend + Serverless Backend)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from root directory
vercel --prod
```

**Features:**
- Automatic builds from Git
- Serverless functions for backend
- Global CDN
- Custom domains
- Environment variables management

### 2. Netlify (Frontend) + Heroku (Backend)

**Frontend on Netlify:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy frontend
cd frontend
netlify deploy --prod --dir=dist
```

**Backend on Heroku:**
```bash
# Install Heroku CLI
# Create Heroku app
heroku create sirfa-backend

# Deploy
git push heroku main
```

### 3. Render (Full-Stack)

1. Connect your GitHub repository to Render
2. Render will automatically detect the `render.yaml` configuration
3. Both frontend and backend will be deployed automatically

### 4. Railway (Backend)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway deploy
```

### 5. Surge (Frontend Only)

```bash
# Install Surge CLI
npm install -g surge

# Deploy frontend
cd frontend
npm run build
surge dist sirfa-agent-finance.surge.sh
```

## 🔧 Environment Variables Setup

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com
VITE_ENVIRONMENT=production
```

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.com

# API Keys (Replace with your actual keys)
ALPACA_API_KEY=your_alpaca_key
ALPACA_SECRET_KEY=your_alpaca_secret
ALIBABA_ACCESS_KEY_ID=your_alibaba_key
ALIBABA_ACCESS_KEY_SECRET=your_alibaba_secret
# ... other environment variables
```

## 📦 Build Commands

### Root Level
```bash
# Install all dependencies
npm run install:all

# Build everything
npm run build:all

# Start development
npm run start:dev

# Start production
npm run start:prod
```

### Frontend Only
```bash
cd frontend
npm install
npm run build
npm run preview
```

### Backend Only
```bash
cd backend
npm install
npm start
```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -f Dockerfile.frontend -t sirfa-frontend .
docker build -f backend/Dockerfile -t sirfa-backend ./backend
```

## 🔍 Health Checks

### Backend Health Check
```bash
# Check backend health
curl https://your-backend-url.com/api/health

# Or use the npm script
npm run health-check
```

### Frontend Health Check
- Visit your frontend URL
- Check browser console for errors
- Verify API connections in Network tab

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Update `FRONTEND_URL` in backend environment
   - Check CORS configuration in `server.js`

2. **API Connection Issues**
   - Verify `VITE_API_URL` in frontend environment
   - Check network connectivity

3. **WebSocket Connection Issues**
   - Update `VITE_WS_URL` in frontend environment
   - Ensure WebSocket support on hosting platform

4. **Build Failures**
   - Check Node.js version (>=18.0.0)
   - Clear node_modules and reinstall
   - Check for missing environment variables

### Platform-Specific Notes

**Vercel:**
- Serverless functions have 10s timeout (Hobby) / 60s (Pro)
- WebSocket connections need special handling
- Use Vercel's environment variables UI

**Netlify:**
- Frontend only, need separate backend hosting
- Use Netlify Functions for simple API endpoints
- Configure redirects in `netlify.toml`

**Heroku:**
- Free tier sleeps after 30 minutes of inactivity
- Use Heroku Postgres for database needs
- Configure environment variables via Heroku CLI or dashboard

**Render:**
- Automatic SSL certificates
- Built-in database options
- Good for full-stack applications

**Railway:**
- Simple deployment from Git
- Built-in database and Redis
- Automatic HTTPS

## 📊 Monitoring & Analytics

### Recommended Tools
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User analytics
- **Uptime Robot** - Uptime monitoring

### Performance Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Monitor bundle sizes
- Use lazy loading for components

## 🔐 Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Security headers configured
- [ ] API keys rotated regularly
- [ ] Dependencies updated

## 📞 Support

For deployment issues:
1. Check the logs using platform-specific tools
2. Verify environment variables
3. Test locally first
4. Check platform status pages
5. Contact platform support if needed

---

**Happy Deploying! 🚀**