# E-Hokimiyat Frontend - Netlify Deployment Guide

## 🚀 Quick Deployment Steps

### Method 1: Drag & Drop (Easiest)
1. Run the build script: `./deploy-netlify.sh`
2. Go to [Netlify Drop](https://app.netlify.com/drop)
3. Drag the `.next` folder to Netlify
4. Your site will be live instantly! 🎉

### Method 2: Netlify CLI (Recommended)
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run the deployment script: `./deploy-netlify.sh`
3. Deploy: `npx netlify deploy --prod --dir=.next`
4. Follow the prompts to complete deployment

### Method 3: GitHub Integration (Best for CI/CD)
1. Push your code to GitHub
2. Connect your GitHub repository to Netlify
3. Netlify will automatically deploy on push

## 📁 Build Configuration
- **Build Command**: `npm run build`
- **Publish Directory**: `.next`
- **Node Version**: 18
- **Framework**: Next.js 14

## 🔧 What's Configured
✅ Static export enabled for optimal performance
✅ Image optimization enabled
✅ Security headers configured
✅ Proper build outputs

## 🌐 Live Site URL
After deployment, your site will be available at:
`https://your-site-name.netlify.app`

## 📋 Deployment Checklist
- [x] Project builds successfully
- [x] All pages generated
- [x] Static assets optimized
- [x] Environment variables configured
- [ ] Custom domain (optional)
- [ ] SSL certificate (auto-enabled)

## 🐛 Troubleshooting
If build fails:
1. Check Node.js version (should be 18+)
2. Clear cache: `rm -rf .next`
3. Reinstall dependencies: `rm -rf node_modules && npm install`

## 📞 Support
- Netlify Docs: https://docs.netlify.com
- Next.js Deployment: https://nextjs.org/docs/deployment
