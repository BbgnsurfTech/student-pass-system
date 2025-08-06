import { configureStore } from '@reduxjs/toolkit';
import { api } from '../api';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
};

describe('API Integration Tests', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  afterEach(() => {
    store.dispatch(api.util.resetApiState());
  });

  describe('Auth API', () => {
    describe('login', () => {
      it('should login successfully with valid credentials', async () => {
        const credentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        const result = await store.dispatch(
          api.endpoints.login.initiate(credentials)
        );

        expect(result.data).toEqual({
          user: expect.objectContaining({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT',
          }),
          token: 'mock-token',
        });
      });

      it('should fail login with invalid credentials', async () => {
        const credentials = {
          email: 'wrong@example.com',
          password: 'wrongpassword',
        };

        const result = await store.dispatch(
          api.endpoints.login.initiate(credentials)
        );

        expect(result.error).toBeDefined();
        expect(result.error?.status).toBe(401);
      });
    });

    describe('register', () => {
      it('should register a new user', async () => {
        const userData = {
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Doe',
        };

        const result = await store.dispatch(
          api.endpoints.register.initiate(userData)
        );

        expect(result.data).toEqual({
          user: expect.objectContaining({
            email: 'newuser@example.com',
            firstName: 'Jane',
            lastName: 'Doe',
          }),
          token: 'mock-token',
        });
      });
    });

    describe('getCurrentUser', () => {
      it('should get current user', async () => {
        const result = await store.dispatch(
          api.endpoints.getCurrentUser.initiate()
        );

        expect(result.data).toEqual(
          expect.objectContaining({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'STUDENT',
          })
        );
      });
    });
  });

  describe('Applications API', () => {
    describe('getApplications', () => {
      it('should fetch applications', async () => {
        const result = await store.dispatch(
          api.endpoints.getApplications.initiate({})
        );

        expect(result.data).toEqual([
          expect.objectContaining({
            id: '1',
            passType: 'TEMPORARY',
            purpose: 'Library access',
            status: 'PENDING',
          }),
        ]);
      });

      it('should filter applications by status', async () => {
        // Mock filtered response
        server.use(
          http.get('/api/v1/applications', ({ request }) => {
            const url = new URL(request.url);
            const status = url.searchParams.get('status');
            
            if (status === 'APPROVED') {
              return HttpResponse.json([]);
            }
            
            return HttpResponse.json([
              {
                id: '1',
                studentId: '1',
                passType: 'TEMPORARY',
                purpose: 'Library access',
                validFrom: '2024-01-01',
                validTo: '2024-01-31',
                status: 'PENDING',
                documents: ['doc1.pdf'],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
            ]);
          })
        );

        const result = await store.dispatch(
          api.endpoints.getApplications.initiate({ status: 'PENDING' })
        );

        expect(result.data).toHaveLength(1);
        expect(result.data?.[0].status).toBe('PENDING');
      });
    });

    describe('createApplication', () => {
      it('should create a new application', async () => {
        const applicationData = {
          passType: 'TEMPORARY',
          purpose: 'Lab access',
          validFrom: '2024-01-01',
          validTo: '2024-01-31',
        };

        const result = await store.dispatch(
          api.endpoints.createApplication.initiate(applicationData)
        );

        expect(result.data).toEqual(
          expect.objectContaining({
            passType: 'TEMPORARY',
            purpose: 'Lab access',
            validFrom: '2024-01-01',
            validTo: '2024-01-31',
          })
        );
      });
    });

    describe('reviewApplication', () => {
      it('should review an application', async () => {
        const reviewData = {
          id: '1',
          status: 'APPROVED' as const,
          comments: 'Application approved',
        };

        const result = await store.dispatch(
          api.endpoints.reviewApplication.initiate(reviewData)
        );

        expect(result.data).toEqual(
          expect.objectContaining({
            id: '1',
            status: 'APPROVED',
            reviewComments: 'Application approved',
          })
        );
      });
    });
  });

  describe('Passes API', () => {
    describe('getPasses', () => {
      it('should fetch passes', async () => {
        const result = await store.dispatch(
          api.endpoints.getPasses.initiate({})
        );

        expect(result.data).toEqual([
          expect.objectContaining({
            id: '1',
            passType: 'TEMPORARY',
            isActive: true,
          }),
        ]);
      });

      it('should filter active passes', async () => {
        const result = await store.dispatch(
          api.endpoints.getPasses.initiate({ active: true })
        );

        expect(result.data).toEqual([
          expect.objectContaining({
            isActive: true,
          }),
        ]);
      });
    });

    describe('generatePass', () => {
      it('should generate a new pass', async () => {
        const passData = {
          applicationId: '1',
        };

        const result = await store.dispatch(
          api.endpoints.generatePass.initiate(passData)
        );

        expect(result.data).toEqual(
          expect.objectContaining({
            applicationId: '1',
            passType: 'TEMPORARY',
            isActive: true,
          })
        );
      });
    });

    describe('deactivatePass', () => {
      it('should deactivate a pass', async () => {
        const result = await store.dispatch(
          api.endpoints.deactivatePass.initiate('1')
        );

        expect(result.data).toEqual(
          expect.objectContaining({
            id: '1',
            isActive: false,
          })
        );
      });
    });
  });

  describe('Access API', () => {
    describe('verifyPass', () => {
      it('should verify a valid pass', async () => {
        const verifyData = {
          qrCode: 'valid-qr-code',
          accessPoint: 'Main Library',
        };

        const result = await store.dispatch(
          api.endpoints.verifyPass.initiate(verifyData)
        );

        expect(result.data).toEqual({
          valid: true,
          message: 'Access granted',
          passData: expect.objectContaining({
            id: '1',
            isActive: true,
          }),
        });
      });

      it('should reject an invalid pass', async () => {
        const verifyData = {
          qrCode: 'invalid-qr-code',
          accessPoint: 'Main Library',
        };

        const result = await store.dispatch(
          api.endpoints.verifyPass.initiate(verifyData)
        );

        expect(result.data).toEqual({
          valid: false,
          message: 'Invalid pass',
        });
      });
    });

    describe('getAccessLogs', () => {
      it('should fetch access logs', async () => {
        const result = await store.dispatch(
          api.endpoints.getAccessLogs.initiate({})
        );

        expect(result.data).toEqual([
          expect.objectContaining({
            id: '1',
            accessPoint: 'Main Library',
            accessType: 'ENTRY',
            status: 'GRANTED',
          }),
        ]);
      });
    });
  });

  describe('Upload API', () => {
    describe('uploadFile', () => {
      it('should upload a file', async () => {
        const file = new File(['test content'], 'test.pdf', {
          type: 'application/pdf',
        });

        const result = await store.dispatch(
          api.endpoints.uploadFile.initiate(file)
        );

        expect(result.data).toEqual({
          url: 'https://example.com/uploads/test.pdf',
          filename: 'test.pdf',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Simulate network error
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.error();
        })
      );

      const result = await store.dispatch(
        api.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(result.error).toBeDefined();
    });

    it('should handle server errors', async () => {
      // Simulate server error
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      const result = await store.dispatch(
        api.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(result.error).toBeDefined();
      expect(result.error?.status).toBe(500);
    });
  });
});