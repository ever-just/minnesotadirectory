# User Authentication Feature Plan

## 🎯 **Objective**
Add user authentication to Minnesota Directory with a simple, clean user experience:
- Circle user icon in top-right corner
- Click to sign up/sign in
- Minimal friction authentication flow

## 🏗️ **Architecture Overview**

### **Frontend Components**
- **UserIcon Component**: Circle icon in top-right corner
- **AuthModal Component**: Sign up/Sign in modal overlay
- **AuthContext**: React context for user state management
- **ProtectedRoute Component**: For future user-specific features

### **Authentication Flow**
1. **Unauthenticated State**: Shows circle user icon (outline/gray)
2. **Click Icon**: Opens authentication modal
3. **Modal Options**: 
   - Sign in with existing account
   - Create new account
   - Social login options (if available)
4. **Authenticated State**: Icon shows user avatar or filled circle
5. **Click Icon (Authenticated)**: Shows user menu dropdown

## 🔧 **Technical Implementation**

### **Phase 1: UI Components**
- [ ] Create `UserIcon.tsx` component
- [ ] Position in top-right of header/nav
- [ ] Create `AuthModal.tsx` component
- [ ] Basic modal with sign up/sign in tabs
- [ ] Responsive design for mobile

### **Phase 2: Authentication Backend**
- [ ] Research DigitalOcean authentication options
- [ ] Set up user database/storage
- [ ] Implement authentication endpoints
- [ ] JWT token management
- [ ] Password hashing and security

### **Phase 3: Integration**
- [ ] Connect frontend to backend
- [ ] User state persistence
- [ ] Error handling and validation
- [ ] Loading states and UX polish

### **Phase 4: User Features (Future)**
- [ ] User profiles
- [ ] Favorite companies
- [ ] Company reviews/ratings
- [ ] Personalized recommendations

## 🎨 **UI/UX Design**

### **User Icon States**
- **Unauthenticated**: `👤` Circle outline icon, gray color
- **Authenticated**: `👤` Filled circle or user avatar
- **Hover**: Slight scale/color change
- **Loading**: Subtle spinner overlay

### **Authentication Modal**
- **Design**: Clean, centered modal overlay
- **Tabs**: "Sign In" | "Sign Up"
- **Fields**: 
  - Sign In: Email + Password
  - Sign Up: Name + Email + Password + Confirm Password
- **Actions**: Submit button + "Close" option
- **Social Login**: If available through DigitalOcean or simple OAuth

### **User Menu Dropdown**
- Profile
- Settings
- Sign Out

## 🔒 **Security Considerations**
- Password strength requirements
- Email verification
- Rate limiting on authentication attempts
- Secure session management
- HTTPS enforcement
- Input sanitization and validation

## 🌐 **Authentication Options to Research**

### **DigitalOcean Native Options**
- [ ] DigitalOcean App Platform authentication
- [ ] DigitalOcean Spaces for user data storage
- [ ] Built-in environment variables for auth secrets

### **Alternative Options**
- [ ] Firebase Authentication (Google)
- [ ] Supabase Authentication
- [ ] Auth0 (if needed)
- [ ] Custom JWT implementation

## 📊 **Database Schema**

### **Users Table**
```sql
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR(255) UNIQUE NOT NULL,
  name: VARCHAR(100) NOT NULL,
  password_hash: VARCHAR(255) NOT NULL,
  avatar_url: VARCHAR(255),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW(),
  email_verified: BOOLEAN DEFAULT FALSE,
  is_active: BOOLEAN DEFAULT TRUE
)
```

### **Sessions Table** (if using custom auth)
```sql
sessions (
  id: UUID PRIMARY KEY,
  user_id: UUID REFERENCES users(id),
  token_hash: VARCHAR(255) NOT NULL,
  expires_at: TIMESTAMP NOT NULL,
  created_at: TIMESTAMP DEFAULT NOW()
)
```

## 🚀 **Implementation Timeline**

### **Week 1: Research & Setup**
- DigitalOcean authentication research
- Database setup decisions
- UI component creation

### **Week 2: Core Authentication**
- Backend authentication logic
- Frontend integration
- Basic sign up/sign in flow

### **Week 3: Polish & Security**
- Error handling
- Security hardening
- UI/UX improvements
- Testing

## 📝 **Environment Variables Needed**
```
# Authentication
JWT_SECRET=
AUTH_TOKEN_EXPIRY=24h
PASSWORD_SALT_ROUNDS=12

# Database
DATABASE_URL=
DATABASE_SSL=true

# Email (for verification)
EMAIL_SERVICE_API_KEY=
EMAIL_FROM_ADDRESS=

# Optional: Social Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 🎯 **Success Metrics**
- [ ] User can successfully sign up
- [ ] User can successfully sign in  
- [ ] User state persists across browser sessions
- [ ] Authentication works on mobile devices
- [ ] No security vulnerabilities in auth flow
- [ ] Clean, intuitive user experience

## 🔄 **Version Control Strategy**
- Create `users` branch for all authentication work
- Regular commits with descriptive messages
- Version increment with each major milestone
- Merge to main only after thorough testing

---

*This plan will be updated as we research DigitalOcean's capabilities and make implementation decisions.*
