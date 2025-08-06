import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';
import { PassApplication } from '../../types/pass';

export interface ApplicationForm {
  type: string;
  reason: string;
  startDate: string;
  endDate: string;
  duration: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  additionalInfo?: string;
  documents: {
    uri: string;
    type: string;
    name: string;
    size: number;
  }[];
}

export interface ApplicationStatus {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  submittedAt: string;
  processedAt?: string;
  processedBy?: string;
  comments?: string;
  estimatedProcessingTime?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ApplicationState {
  applications: ApplicationStatus[];
  currentApplication: ApplicationForm;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  uploadProgress: number;
  passTypes: {
    id: string;
    name: string;
    description: string;
    requirements: string[];
    processingTime: number;
    fee?: number;
    icon: string;
  }[];
}

const initialFormState: ApplicationForm = {
  type: '',
  reason: '',
  startDate: '',
  endDate: '',
  duration: 30,
  emergencyContact: {
    name: '',
    relationship: '',
    phone: '',
    email: '',
  },
  additionalInfo: '',
  documents: [],
};

const initialState: ApplicationState = {
  applications: [],
  currentApplication: initialFormState,
  isSubmitting: false,
  isLoading: false,
  error: null,
  uploadProgress: 0,
  passTypes: [],
};

// Async thunks
export const fetchPassTypes = createAsyncThunk(
  'applications/fetchPassTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/pass-types');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch pass types',
      });
    }
  }
);

export const fetchApplications = createAsyncThunk(
  'applications/fetchApplications',
  async (filters: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  } = {}, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/applications', { params: filters });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to fetch applications',
      });
    }
  }
);

export const submitApplication = createAsyncThunk(
  'applications/submit',
  async (application: ApplicationForm, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.entries(application).forEach(([key, value]) => {
        if (key === 'documents' || key === 'emergencyContact') return;
        
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add emergency contact
      Object.entries(application.emergencyContact).forEach(([key, value]) => {
        if (value) {
          formData.append(`emergencyContact[${key}]`, value);
        }
      });

      // Add documents with progress tracking
      application.documents.forEach((doc, index) => {
        formData.append(`documents`, {
          uri: doc.uri,
          type: doc.type,
          name: doc.name,
        } as any);
      });

      const response = await apiClient.uploadFile(
        '/applications',
        formData,
        (progress) => {
          dispatch(setUploadProgress(progress));
        }
      );

      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to submit application',
      });
    }
  }
);

export const cancelApplication = createAsyncThunk(
  'applications/cancel',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/applications/${id}/cancel`, { reason });
      return { id, ...response.data.data };
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to cancel application',
      });
    }
  }
);

export const resubmitApplication = createAsyncThunk(
  'applications/resubmit',
  async ({ 
    id, 
    updates 
  }: { 
    id: string; 
    updates: Partial<ApplicationForm>;
  }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/applications/${id}/resubmit`, updates);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to resubmit application',
      });
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'applications/uploadDocument',
  async (document: {
    uri: string;
    type: string;
    name: string;
  }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('document', {
        uri: document.uri,
        type: document.type,
        name: document.name,
      } as any);

      const response = await apiClient.uploadFile('/applications/upload-document', formData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to upload document',
      });
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'applications/deleteDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/applications/documents/${documentId}`);
      return documentId;
    } catch (error: any) {
      return rejectWithValue({
        message: error.response?.data?.message || 'Failed to delete document',
      });
    }
  }
);

// Slice
const applicationSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    updateForm: (state, action: PayloadAction<Partial<ApplicationForm>>) => {
      state.currentApplication = { ...state.currentApplication, ...action.payload };
    },
    updateEmergencyContact: (state, action: PayloadAction<Partial<ApplicationForm['emergencyContact']>>) => {
      state.currentApplication.emergencyContact = {
        ...state.currentApplication.emergencyContact,
        ...action.payload,
      };
    },
    addDocument: (state, action: PayloadAction<ApplicationForm['documents'][0]>) => {
      state.currentApplication.documents.push(action.payload);
    },
    removeDocument: (state, action: PayloadAction<number>) => {
      state.currentApplication.documents.splice(action.payload, 1);
    },
    resetForm: (state) => {
      state.currentApplication = initialFormState;
      state.uploadProgress = 0;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    updateApplicationStatus: (state, action: PayloadAction<{
      id: string;
      status: ApplicationStatus['status'];
      processedAt?: string;
      processedBy?: string;
      comments?: string;
    }>) => {
      const application = state.applications.find(app => app.id === action.payload.id);
      if (application) {
        application.status = action.payload.status;
        if (action.payload.processedAt) application.processedAt = action.payload.processedAt;
        if (action.payload.processedBy) application.processedBy = action.payload.processedBy;
        if (action.payload.comments) application.comments = action.payload.comments;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch pass types
      .addCase(fetchPassTypes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPassTypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.passTypes = action.payload;
        state.error = null;
      })
      .addCase(fetchPassTypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch pass types';
      })

      // Fetch applications
      .addCase(fetchApplications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.applications = action.payload;
        state.error = null;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Failed to fetch applications';
      })

      // Submit application
      .addCase(submitApplication.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitApplication.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.applications.unshift(action.payload);
        state.currentApplication = initialFormState;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(submitApplication.rejected, (state, action) => {
        state.isSubmitting = false;
        state.uploadProgress = 0;
        state.error = action.payload?.message || 'Failed to submit application';
      })

      // Cancel application
      .addCase(cancelApplication.fulfilled, (state, action) => {
        const application = state.applications.find(app => app.id === action.payload.id);
        if (application) {
          application.status = 'cancelled';
          application.processedAt = new Date().toISOString();
        }
      })

      // Resubmit application
      .addCase(resubmitApplication.fulfilled, (state, action) => {
        const index = state.applications.findIndex(app => app.id === action.payload.id);
        if (index !== -1) {
          state.applications[index] = action.payload;
        }
      })

      // Upload document
      .addCase(uploadDocument.fulfilled, (state, action) => {
        // Document is already added to form via addDocument action
        // This is for any server-side processing confirmation
      })

      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.currentApplication.documents = state.currentApplication.documents.filter(
          doc => doc.uri !== action.payload
        );
      })

      // Handle errors for all async actions
      .addMatcher(
        (action) => action.type.endsWith('/rejected'),
        (state, action) => {
          state.isLoading = false;
          state.isSubmitting = false;
          state.uploadProgress = 0;
          state.error = action.payload?.message || 'An error occurred';
        }
      );
  },
});

export const {
  updateForm,
  updateEmergencyContact,
  addDocument,
  removeDocument,
  resetForm,
  setUploadProgress,
  updateApplicationStatus,
  clearError,
} = applicationSlice.actions;

export default applicationSlice.reducer;