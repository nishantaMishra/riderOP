# 📧 Resend.com Email Setup Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Resend Account

1. Visit [resend.com](https://resend.com)
2. Sign up for free account
3. Verify your email address

### Step 2: Get API Key

1. Go to your [Resend Dashboard](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Give it a name (e.g., "RideShare Hub Production")
4. Copy the API key (starts with `re_`)

### Step 3: Set Environment Variables

Create a `.env` file in your project root:

```bash
# Resend Configuration
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
NODE_ENV=production
```

**Important Notes:**

- `RESEND_API_KEY`: Your actual API key from Step 2
- `RESEND_FROM_EMAIL`: Use `onboarding@resend.dev` for testing, or your verified domain email
- `NODE_ENV=production`: Enables real email sending

### Step 4: Test Your Setup

```bash
# Start your server
npm run dev

# Try registering a new account
# Check your email inbox for the OTP
# Check server logs for success confirmation
```

---

## 🔧 **Resend Features You Get**

### ✅ **Free Tier Benefits:**

- **3,000 emails/month** free forever
- **100 emails/day** rate limit
- Professional deliverability
- Email analytics dashboard
- No credit card required

### ✅ **Professional Email Templates:**

- Beautiful HTML emails with RideShare Hub branding
- Gradient headers and modern design
- Mobile-responsive layout
- Large, clear OTP display
- Security messaging

### ✅ **Production Features:**

- High deliverability rates
- Real-time email analytics
- Bounce and complaint handling
- Automatic retries
- Enterprise-grade infrastructure

---

## 🎨 **Email Examples**

### Registration Email:

- **Subject**: "Verify Your RideShare Hub Account"
- **Content**: Welcome message + 6-digit OTP
- **Design**: Professional gradient header with RideShare Hub branding

### Password Reset Email:

- **Subject**: "Reset Your Password - RideShare Hub"
- **Content**: Reset instructions + 6-digit OTP
- **Design**: Security-focused with clear instructions

---

## 🌐 **Domain Setup (Optional but Recommended)**

### For Professional Sender Address:

1. **Add Your Domain** in Resend Dashboard
2. **Add DNS Records** as instructed by Resend
3. **Verify Domain** (usually takes a few minutes)
4. **Update Environment Variable**:
   ```bash
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

### Benefits of Custom Domain:

- ✅ Higher deliverability rates
- ✅ Professional sender address
- ✅ Better brand recognition
- ✅ Reduced spam likelihood

---

## 📊 **Monitoring & Analytics**

### Resend Dashboard Features:

- **Email Delivery Status**: Track sent, delivered, opened
- **Bounce Rate Monitoring**: See failed deliveries
- **Real-time Analytics**: View email performance
- **Error Logs**: Debug delivery issues

### Server Logs:

```bash
# Success logs:
✅ Email sent successfully via Resend: email-id-123
📧 Email delivered to: user@example.com

# Error logs:
❌ Resend error: [error details]
❌ RESEND_API_KEY not found. Please set up your Resend API key.
```

---

## 🔒 **Security Best Practices**

### Environment Variables:

- ✅ Keep API keys in `.env` file
- ✅ Add `.env` to `.gitignore`
- ✅ Use different keys for development/production
- ✅ Rotate API keys periodically

### Email Security:

- ✅ 10-minute OTP expiration
- ✅ Maximum 3 verification attempts
- ✅ Rate limiting (prevent spam)
- ✅ Secure token generation

---

## 🚀 **Production Deployment**

### Hosting Platform Setup:

#### **Netlify/Vercel/Railway:**

```bash
# Add these environment variables in your platform's dashboard:
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
```

#### **Heroku:**

```bash
heroku config:set RESEND_API_KEY=re_your_actual_api_key_here
heroku config:set RESEND_FROM_EMAIL=noreply@yourdomain.com
heroku config:set NODE_ENV=production
```

#### **VPS/Docker:**

```bash
# Create .env file on server:
echo "RESEND_API_KEY=re_your_actual_api_key_here" >> .env
echo "RESEND_FROM_EMAIL=noreply@yourdomain.com" >> .env
echo "NODE_ENV=production" >> .env
```

---

## 💰 **Pricing & Limits**

### Free Tier:

- **3,000 emails/month** free
- **100 emails/day** rate limit
- Perfect for small to medium rideshare communities

### Paid Plans:

- **$20/month**: 50,000 emails
- **$80/month**: 500,000 emails
- **Enterprise**: Custom pricing

### Usage Estimation:

- 50 new users/month = 50 registration emails
- 10 password resets/month = 10 reset emails
- **Total: ~60 emails/month** (well within free limits)

---

## 🛠 **Troubleshooting**

### Common Issues:

#### "Failed to send OTP email"

```bash
# Check:
1. API key is correct (starts with 're_')
2. NODE_ENV=production is set
3. No typos in environment variables
4. Internet connection is working
```

#### "Demo mode still showing"

```bash
# Ensure:
NODE_ENV=production  # Exactly this value
# Not 'prod', 'dev', or 'development'

# Restart server after changing environment
npm run dev
```

#### Rate Limiting:

```bash
# Free tier: 100 emails/day
# If exceeded, upgrade plan or wait 24 hours
# Check usage in Resend dashboard
```

---

## 🎯 **Testing Checklist**

### Before Going Live:

- [ ] API key is set correctly
- [ ] Environment variables configured
- [ ] Test registration email flow
- [ ] Test password reset flow
- [ ] Check spam folder if emails don't arrive
- [ ] Verify sender domain (if using custom domain)
- [ ] Monitor Resend dashboard for delivery status

---

## 🌟 **Why Resend.com?**

### Developer Experience:

- ✅ **Simple API**: Easy integration
- ✅ **Modern Dashboard**: Clean, intuitive interface
- ✅ **Great Documentation**: Comprehensive guides
- ✅ **React Email Support**: Build emails with React (optional)

### Reliability:

- ✅ **High Deliverability**: 99%+ delivery rates
- ✅ **Fast Delivery**: Usually under 1 second
- ✅ **Global Infrastructure**: Worldwide email delivery
- ✅ **Enterprise Grade**: Used by major companies

### Pricing:

- ✅ **Generous Free Tier**: 3,000 emails/month
- ✅ **Transparent Pricing**: No hidden fees
- ✅ **Pay as You Grow**: Scale with your business

---

Your RideShare Hub is now ready for professional email delivery with Resend.com! 🚗📧✨
