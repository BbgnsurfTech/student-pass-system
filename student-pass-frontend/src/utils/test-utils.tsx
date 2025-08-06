import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import authSlice from '../store/slices/authSlice';
import applicationSlice from '../store/slices/applicationSlice';
import passSlice from '../store/slices/passSlice';
import { api } from '../store/api/api';
import { RootState } from '../store/store';

// Create a custom render function that includes providers
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  store?: EnhancedStore;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = configureStore({
      reducer: {
        auth: authSlice,
        applications: applicationSlice,
        passes: passSlice,
        [api.reducerPath]: api.reducer,
      },
      preloadedState,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['api/updateQueryData'],
          },
        }).concat(api.middleware),
    }),
    initialEntries = ['/'],
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Mock data factories
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'STUDENT' as const,
  profileImage: 'https://example.com/avatar.jpg',
};

export const mockAdminUser = {
  ...mockUser,
  id: '2',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
};

export const mockApplication = {
  id: '1',
  studentId: '1',
  passType: 'TEMPORARY' as const,
  purpose: 'Library access',
  validFrom: '2024-01-01',
  validTo: '2024-01-31',
  status: 'PENDING' as const,
  documents: ['doc1.pdf'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockPass = {
  id: '1',
  applicationId: '1',
  studentId: '1',
  passType: 'TEMPORARY' as const,
  qrCode: 'mock-qr-code',
  isActive: true,
  validFrom: '2024-01-01',
  validTo: '2024-01-31',
  permissions: ['LIBRARY_ACCESS'],
  usageCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockAccessLog = {
  id: '1',
  passId: '1',
  studentId: '1',
  accessPoint: 'Main Library',
  accessType: 'ENTRY' as const,
  timestamp: '2024-01-01T10:00:00Z',
  status: 'GRANTED' as const,
};

// Helper function to create authenticated state
export const createAuthenticatedState = (user = mockUser) => ({
  auth: {
    user,
    token: 'mock-token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
  },
});

// Helper function to create unauthenticated state
export const createUnauthenticatedState = () => ({
  auth: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
});

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';