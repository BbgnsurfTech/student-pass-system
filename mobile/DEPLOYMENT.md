# Mobile App Deployment Guide

This guide covers the complete deployment process for the Student Pass System mobile applications on both iOS App Store and Google Play Store.

## Prerequisites

### Development Environment
- Node.js 18+ installed
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Xcode (macOS only, for iOS builds)
- Android Studio (for Android builds)

### Accounts & Credentials
- **Expo Account**: Sign up at https://expo.dev
- **Apple Developer Account**: $99/year for iOS distribution
- **Google Play Developer Account**: $25 one-time fee for Android distribution
- **Push Notification Services**: FCM (free) and APNs (included with Apple Developer)

## Initial Setup

### 1. Project Configuration

```bash
# Login to Expo
eas login

# Initialize EAS configuration
eas build:configure

# Configure app credentials
eas credentials
```

### 2. Environment Configuration

Create environment-specific configurations:

```javascript
// app.config.js
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
  expo: {
    name: IS_PRODUCTION ? 'Student Pass System' : 'Student Pass (Dev)',
    slug: 'student-pass-system',
    version: '1.0.0',
    // ... other config
  }
};
```

### 3. Code Signing Setup

#### iOS Code Signing
```bash
# Generate iOS credentials
eas credentials -p ios

# Configure push notifications
eas credentials -p ios --push-notifications
```

#### Android Code Signing
```bash
# Generate Android keystore
eas credentials -p android

# Configure FCM for push notifications
eas credentials -p android --push-notifications
```

## Building for Production

### iOS Build Process

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# Build for TestFlight (internal testing)
eas build --platform ios --profile preview
```

**Build Configuration (eas.json):**
```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m1-medium",
        "distribution": "store",
        "autoIncrement": true
      }
    }
  }
}
```

### Android Build Process

```bash
# Build for Google Play Store
eas build --platform android --profile production

# Build APK for internal testing
eas build --platform android --profile preview
```

**Build Configuration (eas.json):**
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

## App Store Submission

### iOS App Store Connect

1. **Prepare App Store Assets**
   - App icons (1024x1024)
   - Screenshots for all device types
   - App preview videos (optional but recommended)

2. **Configure App Information**
   - App name and subtitle
   - Keywords for ASO
   - App description and privacy policy
   - Support URL

3. **Submit for Review**
```bash
# Submit to App Store Connect
eas submit --platform ios

# Or manually upload via Xcode or Application Loader
```

4. **App Store Review Process**
   - Automated checks (1-2 hours)
   - Human review (24-48 hours typically)
   - Respond to review feedback if rejected

### Google Play Console

1. **Prepare Play Store Assets**
   - Feature graphic (1024x500)
   - Screenshots for phone and tablet
   - App icon (512x512)

2. **Configure Store Listing**
   - App title and short description
   - Full description (up to 4000 characters)
   - Categorization and content rating

3. **Upload and Release**
```bash
# Submit to Google Play
eas submit --platform android

# Configure release tracks
# - Internal testing
# - Closed testing (alpha/beta)
# - Open testing
# - Production
```

## Staged Rollout Strategy

### Phase 1: Internal Testing (Week 1)
- TestFlight (iOS) and Internal Testing (Android)
- Development team and QA testing
- Critical bug fixes and performance optimization

### Phase 2: Closed Beta (Week 2-3)
- Limited external beta testers (50-100 users)
- Feedback collection and bug reporting
- Analytics and crash monitoring setup

### Phase 3: Open Beta (Week 4)
- Wider beta testing (500+ users)
- Performance monitoring at scale
- Final UI/UX adjustments

### Phase 4: Production Release (Week 5)
- Gradual rollout starting at 5%
- Monitor crash rates and user feedback
- Scale to 100% over 7 days

## Post-Launch Monitoring

### Analytics Setup
```javascript
// Analytics configuration
import { Analytics } from 'expo-analytics';

const analytics = new Analytics({
  trackingId: 'YOUR_GA_TRACKING_ID',
  debug: __DEV__,
});

// Track key events
analytics.event('pass_displayed', {
  passType: 'library',
  userRole: 'student',
});
```

### Crash Reporting
```javascript
// Sentry setup for crash reporting
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__,
});
```

### Performance Monitoring
- Monitor app launch time
- Track API response times
- Monitor memory usage
- Battery impact analysis

## Over-the-Air Updates

### CodePush Setup
```bash
# Install CodePush
npm install @microsoft/react-native-code-push

# Release update
eas update --branch production --message "Bug fixes and performance improvements"
```

### Update Configuration
```javascript
// app.config.js
export default {
  expo: {
    updates: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 30000,
    },
  },
};
```

## Maintenance and Updates

### Regular Update Schedule
- **Critical fixes**: Within 24 hours
- **Bug fixes**: Weekly releases
- **Feature updates**: Bi-weekly releases
- **Major versions**: Monthly/quarterly

### Version Management
```json
{
  "version": "1.2.3",
  "buildNumber": "123"
}
```

Version semantics:
- Major: Breaking changes or significant new features
- Minor: New features, backwards compatible
- Patch: Bug fixes and small improvements

### App Store Optimization (ASO)

#### iOS App Store
- **Keywords**: Research and optimize keyword density
- **Screenshots**: A/B test different layouts
- **Reviews**: Respond to user feedback promptly
- **Localization**: Support multiple languages

#### Google Play Store
- **Play Console**: Monitor search performance
- **Store Listing Experiments**: Test different descriptions
- **User Acquisition**: Track install sources
- **Play Pass**: Consider inclusion for premium features

## Security Considerations

### Code Obfuscation
```javascript
// Metro configuration for production builds
module.exports = {
  transformer: {
    minifierConfig: {
      mangle: true,
      keep_fnames: false,
    },
  },
};
```

### API Security
- Implement certificate pinning
- Use proper authentication headers
- Validate all API responses
- Implement request signing

### Data Protection
- Encrypt sensitive local data
- Use secure storage for tokens
- Implement proper session management
- Regular security audits

## Troubleshooting Common Issues

### Build Failures
```bash
# Clear Expo cache
expo r -c

# Clear Metro cache
npx react-native start --reset-cache

# Reset EAS build cache
eas build --clear-cache
```

### iOS-Specific Issues
- **Provisioning Profile**: Ensure valid certificates
- **Bundle Identifier**: Must match App Store Connect
- **Privacy Permissions**: Update Info.plist descriptions

### Android-Specific Issues
- **Keystore**: Backup and secure your release keystore
- **Permissions**: Review and minimize required permissions
- **API Levels**: Target latest stable Android API

## Support and Documentation

### User Support
- In-app help and FAQ
- Email support: support@studentpass.yourinstitution.edu
- Knowledge base with common issues
- Video tutorials for key features

### Developer Documentation
- API integration guides
- Contribution guidelines
- Code style standards
- Testing procedures

## Rollback Procedures

### Emergency Rollback
```bash
# Revert to previous OTA update
eas update --branch production --republish

# Force app store version rollback
# (Requires new build with previous code)
eas build --platform all --profile production
```

### Staged Rollback
1. Stop rollout in app stores
2. Analyze crash reports and user feedback
3. Prepare hotfix build
4. Resume rollout with fixes

---

## Deployment Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] App store assets prepared
- [ ] Beta testing completed
- [ ] Release notes written

### Release Day
- [ ] Build submitted to stores
- [ ] Analytics and monitoring active
- [ ] Support team briefed
- [ ] Marketing materials ready
- [ ] Staged rollout initiated

### Post-Release
- [ ] Monitor crash rates
- [ ] Track user feedback
- [ ] Performance metrics reviewed
- [ ] Support tickets triaged
- [ ] Next version planning

For questions or issues during deployment, contact the development team or refer to the project documentation.