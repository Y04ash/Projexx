#!/bin/bash

# 🚀 ProjectFlow Deployment Script
# This script helps you deploy your application to Vercel and Railway

echo "🚀 Starting ProjectFlow Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "Requirements check passed!"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Build the project
    print_status "Building React app..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend build completed successfully!"
    else
        print_error "Frontend build failed!"
        exit 1
    fi
    
    cd ..
}

# Deploy to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    print_status "Deploying to Vercel..."
    vercel --prod
    
    print_success "Frontend deployed to Vercel!"
    print_warning "Don't forget to set REACT_APP_API_BASE_URL in Vercel dashboard after backend deployment!"
}

# Deploy backend to Railway
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway
    print_status "Logging into Railway..."
    railway login
    
    # Deploy
    print_status "Deploying to Railway..."
    cd backend
    railway up --detach
    
    print_success "Backend deployed to Railway!"
    print_warning "Don't forget to set environment variables in Railway dashboard!"
    
    cd ..
}

# Main deployment function
main() {
    echo "🎯 ProjectFlow Deployment Script"
    echo "================================"
    echo ""
    
    # Check requirements
    check_requirements
    
    # Ask user what they want to deploy
    echo "What would you like to deploy?"
    echo "1) Frontend only (Vercel)"
    echo "2) Backend only (Railway)"
    echo "3) Both frontend and backend"
    echo "4) Just build frontend (no deployment)"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            build_frontend
            deploy_frontend
            ;;
        2)
            deploy_backend
            ;;
        3)
            build_frontend
            deploy_frontend
            deploy_backend
            ;;
        4)
            build_frontend
            print_success "Frontend built successfully! You can now deploy manually."
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Deployment process completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up MongoDB Atlas database"
    echo "2. Configure environment variables in your deployment platforms"
    echo "3. Test your deployed application"
    echo "4. Check the DEPLOYMENT_GUIDE.md for detailed instructions"
    echo ""
    echo "🎉 Happy deploying!"
}

# Run main function
main
