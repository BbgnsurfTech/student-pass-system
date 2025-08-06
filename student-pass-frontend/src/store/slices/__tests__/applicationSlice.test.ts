import applicationReducer, {
  setApplications,
  addApplication,
  updateApplication,
  setCurrentApplication,
  setLoading,
  setError,
  setFilters,
  clearFilters,
  Application,
} from '../applicationSlice';

const mockApplication: Application = {
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
};

const mockApplication2: Application = {
  ...mockApplication,
  id: '2',
  purpose: 'Lab access',
  status: 'APPROVED',
};

describe('applicationSlice', () => {
  const initialState = {
    applications: [],
    currentApplication: null,
    isLoading: false,
    error: null,
    filters: {},
  };

  it('should return the initial state', () => {
    expect(applicationReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setApplications', () => {
    it('should set the applications array', () => {
      const applications = [mockApplication, mockApplication2];
      const action = setApplications(applications);
      const state = applicationReducer(initialState, action);

      expect(state.applications).toEqual(applications);
    });
  });

  describe('addApplication', () => {
    it('should add new application to the beginning of the array', () => {
      const previousState = {
        ...initialState,
        applications: [mockApplication2],
      };

      const action = addApplication(mockApplication);
      const state = applicationReducer(previousState, action);

      expect(state.applications).toEqual([mockApplication, mockApplication2]);
    });
  });

  describe('updateApplication', () => {
    it('should update existing application', () => {
      const previousState = {
        ...initialState,
        applications: [mockApplication, mockApplication2],
      };

      const updatedApplication = {
        ...mockApplication,
        status: 'APPROVED' as const,
        reviewComments: 'Approved by admin',
      };

      const action = updateApplication(updatedApplication);
      const state = applicationReducer(previousState, action);

      expect(state.applications[0]).toEqual(updatedApplication);
      expect(state.applications[1]).toEqual(mockApplication2);
    });

    it('should not change state if application not found', () => {
      const previousState = {
        ...initialState,
        applications: [mockApplication2],
      };

      const nonExistentApplication = {
        ...mockApplication,
        id: 'non-existent',
      };

      const action = updateApplication(nonExistentApplication);
      const state = applicationReducer(previousState, action);

      expect(state.applications).toEqual([mockApplication2]);
    });
  });

  describe('setCurrentApplication', () => {
    it('should set the current application', () => {
      const action = setCurrentApplication(mockApplication);
      const state = applicationReducer(initialState, action);

      expect(state.currentApplication).toEqual(mockApplication);
    });

    it('should clear the current application when null is passed', () => {
      const previousState = {
        ...initialState,
        currentApplication: mockApplication,
      };

      const action = setCurrentApplication(null);
      const state = applicationReducer(previousState, action);

      expect(state.currentApplication).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      const action = setLoading(true);
      const state = applicationReducer(initialState, action);

      expect(state.isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      const previousState = {
        ...initialState,
        isLoading: true,
      };

      const action = setLoading(false);
      const state = applicationReducer(previousState, action);

      expect(state.isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const errorMessage = 'Failed to load applications';
      const action = setError(errorMessage);
      const state = applicationReducer(initialState, action);

      expect(state.error).toBe(errorMessage);
    });

    it('should clear error when null is passed', () => {
      const previousState = {
        ...initialState,
        error: 'Some error',
      };

      const action = setError(null);
      const state = applicationReducer(previousState, action);

      expect(state.error).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('should set filters', () => {
      const filters = {
        status: 'PENDING',
        passType: 'TEMPORARY',
      };

      const action = setFilters(filters);
      const state = applicationReducer(initialState, action);

      expect(state.filters).toEqual(filters);
    });

    it('should merge filters with existing ones', () => {
      const previousState = {
        ...initialState,
        filters: {
          status: 'APPROVED',
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        },
      };

      const newFilters = {
        passType: 'TEMPORARY',
      };

      const action = setFilters(newFilters);
      const state = applicationReducer(previousState, action);

      expect(state.filters).toEqual({
        status: 'APPROVED',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
        passType: 'TEMPORARY',
      });
    });
  });

  describe('clearFilters', () => {
    it('should clear all filters', () => {
      const previousState = {
        ...initialState,
        filters: {
          status: 'PENDING',
          passType: 'TEMPORARY',
          dateRange: {
            start: '2024-01-01',
            end: '2024-01-31',
          },
        },
      };

      const action = clearFilters();
      const state = applicationReducer(previousState, action);

      expect(state.filters).toEqual({});
    });
  });
});