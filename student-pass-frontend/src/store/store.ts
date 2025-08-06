import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import applicationSlice from './slices/applicationSlice';
import passSlice from './slices/passSlice';
import analyticsSlice from './slices/analyticsSlice';
import { api } from './api/api';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    applications: applicationSlice,
    passes: passSlice,
    analytics: analyticsSlice,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['api/updateQueryData'],
      },
    }).concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;