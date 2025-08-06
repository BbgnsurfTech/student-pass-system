import passReducer, {
  setPasses,
  addPass,
  updatePass,
  setCurrentPass,
  setAccessLogs,
  addAccessLog,
  setScanResult,
  clearScanResult,
  setLoading,
  setError,
  Pass,
  AccessLog,
} from '../passSlice';

const mockPass: Pass = {
  id: '1',
  applicationId: '1',
  studentId: '1',
  passType: 'TEMPORARY',
  qrCode: 'mock-qr-code',
  isActive: true,
  validFrom: '2024-01-01',
  validTo: '2024-01-31',
  permissions: ['LIBRARY_ACCESS'],
  usageCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockInactivePass: Pass = {
  ...mockPass,
  id: '2',
  isActive: false,
};

const mockAccessLog: AccessLog = {
  id: '1',
  passId: '1',
  studentId: '1',
  accessPoint: 'Main Library',
  accessType: 'ENTRY',
  timestamp: '2024-01-01T10:00:00Z',
  status: 'GRANTED',
};

describe('passSlice', () => {
  const initialState = {
    passes: [],
    activePasses: [],
    accessLogs: [],
    currentPass: null,
    isLoading: false,
    error: null,
    scanResult: null,
  };

  it('should return the initial state', () => {
    expect(passReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setPasses', () => {
    it('should set passes and filter active passes', () => {
      const passes = [mockPass, mockInactivePass];
      const action = setPasses(passes);
      const state = passReducer(initialState, action);

      expect(state.passes).toEqual(passes);
      expect(state.activePasses).toEqual([mockPass]); // Only active passes
    });

    it('should handle empty passes array', () => {
      const action = setPasses([]);
      const state = passReducer(initialState, action);

      expect(state.passes).toEqual([]);
      expect(state.activePasses).toEqual([]);
    });
  });

  describe('addPass', () => {
    it('should add active pass to both arrays', () => {
      const action = addPass(mockPass);
      const state = passReducer(initialState, action);

      expect(state.passes).toEqual([mockPass]);
      expect(state.activePasses).toEqual([mockPass]);
    });

    it('should add inactive pass only to passes array', () => {
      const action = addPass(mockInactivePass);
      const state = passReducer(initialState, action);

      expect(state.passes).toEqual([mockInactivePass]);
      expect(state.activePasses).toEqual([]);
    });
  });

  describe('updatePass', () => {
    it('should update pass in both arrays when pass becomes active', () => {
      const previousState = {
        ...initialState,
        passes: [mockInactivePass],
        activePasses: [],
      };

      const updatedPass = { ...mockInactivePass, isActive: true };
      const action = updatePass(updatedPass);
      const state = passReducer(previousState, action);

      expect(state.passes[0]).toEqual(updatedPass);
      expect(state.activePasses).toEqual([updatedPass]);
    });

    it('should update pass and remove from active passes when pass becomes inactive', () => {
      const previousState = {
        ...initialState,
        passes: [mockPass],
        activePasses: [mockPass],
      };

      const updatedPass = { ...mockPass, isActive: false };
      const action = updatePass(updatedPass);
      const state = passReducer(previousState, action);

      expect(state.passes[0]).toEqual(updatedPass);
      expect(state.activePasses).toEqual([]);
    });

    it('should update active pass that remains active', () => {
      const previousState = {
        ...initialState,
        passes: [mockPass],
        activePasses: [mockPass],
      };

      const updatedPass = { ...mockPass, usageCount: 5 };
      const action = updatePass(updatedPass);
      const state = passReducer(previousState, action);

      expect(state.passes[0]).toEqual(updatedPass);
      expect(state.activePasses[0]).toEqual(updatedPass);
    });

    it('should not change state if pass not found', () => {
      const previousState = {
        ...initialState,
        passes: [mockPass],
        activePasses: [mockPass],
      };

      const nonExistentPass = { ...mockPass, id: 'non-existent' };
      const action = updatePass(nonExistentPass);
      const state = passReducer(previousState, action);

      expect(state).toEqual(previousState);
    });
  });

  describe('setCurrentPass', () => {
    it('should set the current pass', () => {
      const action = setCurrentPass(mockPass);
      const state = passReducer(initialState, action);

      expect(state.currentPass).toEqual(mockPass);
    });

    it('should clear the current pass when null is passed', () => {
      const previousState = {
        ...initialState,
        currentPass: mockPass,
      };

      const action = setCurrentPass(null);
      const state = passReducer(previousState, action);

      expect(state.currentPass).toBeNull();
    });
  });

  describe('setAccessLogs', () => {
    it('should set the access logs', () => {
      const logs = [mockAccessLog];
      const action = setAccessLogs(logs);
      const state = passReducer(initialState, action);

      expect(state.accessLogs).toEqual(logs);
    });
  });

  describe('addAccessLog', () => {
    it('should add access log to the beginning of the array', () => {
      const previousState = {
        ...initialState,
        accessLogs: [mockAccessLog],
      };

      const newLog = { ...mockAccessLog, id: '2', timestamp: '2024-01-01T11:00:00Z' };
      const action = addAccessLog(newLog);
      const state = passReducer(previousState, action);

      expect(state.accessLogs).toEqual([newLog, mockAccessLog]);
    });
  });

  describe('setScanResult', () => {
    it('should set scan result for valid pass', () => {
      const scanResult = {
        isValid: true,
        message: 'Access granted',
        passData: mockPass,
      };

      const action = setScanResult(scanResult);
      const state = passReducer(initialState, action);

      expect(state.scanResult).toEqual(scanResult);
    });

    it('should set scan result for invalid pass', () => {
      const scanResult = {
        isValid: false,
        message: 'Invalid pass',
      };

      const action = setScanResult(scanResult);
      const state = passReducer(initialState, action);

      expect(state.scanResult).toEqual(scanResult);
    });
  });

  describe('clearScanResult', () => {
    it('should clear the scan result', () => {
      const previousState = {
        ...initialState,
        scanResult: {
          isValid: true,
          message: 'Access granted',
          passData: mockPass,
        },
      };

      const action = clearScanResult();
      const state = passReducer(previousState, action);

      expect(state.scanResult).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      const action = setLoading(true);
      const state = passReducer(initialState, action);

      expect(state.isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const errorMessage = 'Failed to load passes';
      const action = setError(errorMessage);
      const state = passReducer(initialState, action);

      expect(state.error).toBe(errorMessage);
    });

    it('should clear error when null is passed', () => {
      const previousState = {
        ...initialState,
        error: 'Some error',
      };

      const action = setError(null);
      const state = passReducer(previousState, action);

      expect(state.error).toBeNull();
    });
  });
});