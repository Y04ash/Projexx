# 🚀 Quick Deployment Guide

## Prerequisites
- Node.js 16+
- Git repository
- Vercel account (free)
- Railway account (free)
- MongoDB Atlas account (free)

## 🎯 One-Click Deployment

### Option 1: Use the Deployment Script
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

### Option 2: Manual Deployment

#### Frontend (Vercel)
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Install Vercel CLI
npm install -g vercel

# 3. Deploy
vercel --prod
```

#### Backend (Railway)
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Deploy backend
cd backend
railway up --detach
```

## 🔧 Environment Variables

### Frontend (Vercel)
- `REACT_APP_API_BASE_URL`: Your backend URL (e.g., `https://your-backend.railway.app/api`)

### Backend (Railway)
- `NODE_ENV`: `production`
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A secure random string
- `FRONTEND_URL`: Your Vercel frontend URL

## 🗄️ Database Setup

1. Create MongoDB Atlas account
2. Create a cluster
3. Create database `projexx`
4. Create user with read/write permissions
5. Whitelist IP addresses (add `0.0.0.0/0` for all)
6. Get connection string and use in Railway

## 🧪 Testing

### Test Backend
```bash
curl https://your-backend.railway.app/api/health
```

### Test Frontend
1. Visit your Vercel URL
2. Check browser console for errors
3. Test login/registration

## 📚 Detailed Guide

For complete instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🆘 Troubleshooting

### Common Issues
1. **CORS Errors**: Check `FRONTEND_URL` in backend
2. **Database Issues**: Verify MongoDB Atlas connection
3. **Build Failures**: Check Node.js version and dependencies

### Debug Commands
```bash
# Check backend logs
railway logs

# Check frontend build
vercel logs
```

## 🎉 Success!

Once deployed, your app will be available at:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-app.railway.app`

---

**Need help?** Check the detailed [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) or create an issue in your repository.
