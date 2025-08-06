import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authSlice from './slices/authSlice';
import passSlice from './slices/passSlice';
import adminSlice from './slices/adminSlice';
import securitySlice from './slices/securitySlice';
import applicationSlice from './slices/applicationSlice';
import notificationSlice from './slices/notificationSlice';
import networkSlice from './slices/networkSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'passes', 'notifications'], // Only persist these slices
  blacklist: ['network'], // Don't persist network state
};

const rootReducer = combineReducers({
  auth: authSlice,
  passes: passSlice,
  admin: adminSlice,
  security: securitySlice,
  applications: applicationSlice,
  notifications: notificationSlice,
  network: networkSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;