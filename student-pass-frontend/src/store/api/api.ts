import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import type { User } from '../slices/authSlice';
import type { Application } from '../slices/applicationSlice';
import type { Pass, AccessLog } from '../slices/passSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Application', 'Pass', 'AccessLog'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<
      { user: User; token: string },
      { email: string; password: string }
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<
      { user: User; token: string },
      { email: string; password: string; firstName: string; lastName: string; role?: string }
    >({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Application endpoints
    getApplications: builder.query<Application[], { userId?: string; status?: string }>({
      query: (params) => ({
        url: '/applications',
        params,
      }),
      providesTags: ['Application'],
    }),

    getApplication: builder.query<Application, string>({
      query: (id) => `/applications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Application', id }],
    }),

    createApplication: builder.mutation<
      Application,
      {
        passType: string;
        purpose: string;
        validFrom: string;
        validTo: string;
        documents?: File[];
      }
    >({
      query: (data) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'documents' && Array.isArray(value)) {
            value.forEach(file => formData.append('documents', file));
          } else {
            formData.append(key, value as string);
          }
        });
        return {
          url: '/applications',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Application'],
    }),

    updateApplication: builder.mutation<
      Application,
      { id: string; data: Partial<Application> }
    >({
      query: ({ id, data }) => ({
        url: `/applications/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Application', id }],
    }),

    reviewApplication: builder.mutation<
      Application,
      { id: string; status: 'APPROVED' | 'REJECTED'; comments?: string }
    >({
      query: ({ id, ...data }) => ({
        url: `/applications/${id}/review`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Application', 'Pass'],
    }),

    // Pass endpoints
    getPasses: builder.query<Pass[], { userId?: string; active?: boolean }>({
      query: (params) => ({
        url: '/passes',
        params,
      }),
      providesTags: ['Pass'],
    }),

    getPass: builder.query<Pass, string>({
      query: (id) => `/passes/${id}`,
      providesTags: (result, error, id) => [{ type: 'Pass', id }],
    }),

    generatePass: builder.mutation<Pass, { applicationId: string }>({
      query: (data) => ({
        url: '/passes/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Pass'],
    }),

    deactivatePass: builder.mutation<Pass, string>({
      query: (id) => ({
        url: `/passes/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Pass', id }],
    }),

    // Access endpoints
    verifyPass: builder.mutation<
      { valid: boolean; message: string; passData?: Pass },
      { qrCode: string; accessPoint: string }
    >({
      query: (data) => ({
        url: '/access/verify',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['AccessLog'],
    }),

    getAccessLogs: builder.query<
      AccessLog[],
      { userId?: string; passId?: string; limit?: number }
    >({
      query: (params) => ({
        url: '/access/logs',
        params,
      }),
      providesTags: ['AccessLog'],
    }),

    // Upload endpoints
    uploadFile: builder.mutation<{ url: string; filename: string }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: '/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useGetApplicationsQuery,
  useGetApplicationQuery,
  useCreateApplicationMutation,
  useUpdateApplicationMutation,
  useReviewApplicationMutation,
  useGetPassesQuery,
  useGetPassQuery,
  useGeneratePassMutation,
  useDeactivatePassMutation,
  useVerifyPassMutation,
  useGetAccessLogsQuery,
  useUploadFileMutation,
} = api;