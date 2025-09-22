# 🚀 ProjectFlow Deployment Guide

This guide will help you deploy your full-stack ProjectFlow application to production.

## 📋 Prerequisites

- Node.js 16+ installed
- Git repository
- Vercel account (for frontend)
- Railway account (for backend) - or alternative like Render, Heroku
- MongoDB Atlas account (for database)

## 🎯 Deployment Strategy

- **Frontend**: Deploy to Vercel (free tier available)
- **Backend**: Deploy to Railway (free tier available)
- **Database**: Use MongoDB Atlas (free tier available)

## 🖥️ Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Test the build locally**:
   ```bash
   npx serve -s build
   ```

### Step 2: Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project root**:
   ```bash
   vercel --prod
   ```

4. **Configure environment variables** in Vercel dashboard:
   - `REACT_APP_API_BASE_URL`: Your deployed backend URL

### Step 3: Update API URL

After backend deployment, update the environment variable in Vercel:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Set `REACT_APP_API_BASE_URL` to your backend URL (e.g., `https://your-backend.railway.app/api`)

## 🔧 Backend Deployment (Railway)

### Step 1: Prepare Backend

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Connect your GitHub repository**

3. **Create new project** and select your repository

### Step 2: Configure Environment Variables

In Railway dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/projexx
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://your-frontend.vercel.app
CLIENT_URL=https://your-frontend.vercel.app
REACT_APP_URL=https://your-frontend.vercel.app
```

### Step 3: Deploy

1. **Railway will automatically detect** your Node.js app
2. **Set the root directory** to `backend`
3. **Deploy** - Railway will build and deploy automatically

### Step 4: Get Backend URL

After deployment, Railway will provide a URL like:
`https://your-app-name.railway.app`

## 🗄️ Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster

### Step 2: Configure Database

1. **Create a database** named `projexx`
2. **Create a user** with read/write permissions
3. **Whitelist IP addresses** (add `0.0.0.0/0` for all IPs)
4. **Get connection string** and use it in Railway environment variables

### Step 3: Test Connection

Your backend should automatically connect to MongoDB Atlas when deployed.

## 🔄 Alternative Backend Deployment Options

### Option 1: Render

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Set root directory to `backend`
5. Add environment variables
6. Deploy

### Option 2: Heroku

1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set NODE_ENV=production`
4. Deploy: `git push heroku main`

## 🧪 Testing Your Deployment

### 1. Test Backend

```bash
# Health check
curl https://your-backend.railway.app/api/health

# Should return:
{
  "success": true,
  "status": "OK",
  "message": "API server is running"
}
```

### 2. Test Frontend

1. Visit your Vercel URL
2. Check browser console for errors
3. Test login/registration
4. Verify API calls are working

### 3. Test Full Flow

1. **Register a new user** on frontend
2. **Login** with credentials
3. **Create a project server**
4. **Create tasks and submissions**
5. **Test grading functionality**

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check `FRONTEND_URL` environment variable in backend
   - Ensure frontend URL is whitelisted in CORS settings

2. **Database Connection Issues**:
   - Verify MongoDB Atlas connection string
   - Check IP whitelist settings
   - Ensure database user has correct permissions

3. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

4. **Environment Variables**:
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify no trailing spaces

### Debug Commands

```bash
# Check backend logs
railway logs

# Check frontend build
vercel logs

# Test API endpoints
curl -X GET https://your-backend.railway.app/api/health
```

## 📊 Monitoring

### Backend Monitoring (Railway)
- View logs in Railway dashboard
- Monitor resource usage
- Set up alerts for errors

### Frontend Monitoring (Vercel)
- View deployment logs
- Monitor performance
- Check analytics

## 🔐 Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Only allow necessary origins
3. **Rate Limiting**: Enable in production
4. **HTTPS**: Both frontend and backend should use HTTPS
5. **Database**: Use strong passwords and IP whitelisting

## 🚀 Going Live

Once everything is working:

1. **Update DNS** if using custom domain
2. **Set up monitoring** and alerts
3. **Configure backups** for database
4. **Test thoroughly** with real users
5. **Document** any custom configurations

## 📞 Support

If you encounter issues:

1. Check the logs first
2. Verify environment variables
3. Test API endpoints individually
4. Check browser console for frontend errors
5. Review this guide for common solutions

---

**Happy Deploying! 🎉**
