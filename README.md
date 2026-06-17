# MilkKart Mobile

Customer mobile app for MilkKart — **React Native (Expo) + TypeScript**, consuming
the same REST APIs as the web app. Built per the MilkKart SRS v1.0.

## Stack
- Expo SDK 51, React Native 0.74, TypeScript
- React Navigation (native-stack + bottom-tabs)
- Redux Toolkit + RTK Query (API client with JWT refresh)
- expo-secure-store (token storage)

## Project layout
```
App.tsx                 # entry: Provider + token bootstrap + navigation
src/
  api/        config.ts (API base URL), baseApi.ts (RTK Query + reauth)
  store/      Redux store, authSlice, secure token storage, typed hooks
  navigation/ RootNavigator (auth vs main), MainTabs
  screens/    auth/LoginScreen, HomeScreen, ProfileScreen
  components/ Screen, Button, TextField (design system)
  theme/      colors, spacing, radius, typography tokens
```

## Run it (physical phone — Expo Go)
1. **Point the app at your backend.** Edit `src/api/config.ts` → `API_BASE` to your
   computer's LAN IP, e.g. `http://192.168.1.5:8000/api/v1`. (Run `ipconfig` to find it.)
2. **Run the backend on your LAN:** in `milkkart-backend`,
   `python manage.py runserver 0.0.0.0:8000`. Phone and computer must be on the **same Wi-Fi**.
3. **Install & start:**
   ```bash
   npm install
   npx expo start
   ```
4. Install **Expo Go** on your phone and scan the QR code from the terminal.

> Emulator base URLs: Android emulator → `http://10.0.2.2:8000/api/v1`; iOS simulator → `http://localhost:8000/api/v1`.

## Auth (current step)
Phone → **Send OTP** → enter the 6-digit code → **Verify**. The OTP is emailed and
printed in the backend logs in dev. Tokens are stored securely and refreshed
transparently on 401.

## Next
Home catalog, search, product detail, cart + checkout (Razorpay), orders + live
tracking, milk subscriptions, wallet — added incrementally.
