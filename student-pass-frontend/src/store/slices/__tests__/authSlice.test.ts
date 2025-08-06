import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearError,
  User,
} from '../authSlice';

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'STUDENT',
};

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    // Clear localStorage mock before each test
    (localStorage.setItem as jest.Mock).mockClear();
    (localStorage.removeItem as jest.Mock).mockClear();
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('loginStart', () => {
    it('should set loading to true and clear error', () => {
      const previousState = {
        ...initialState,
        error: 'Some error',
      };

      const action = loginStart();
      const state = authReducer(previousState, action);

      expect(state).toEqual({
        ...previousState,
        isLoading: true,
        error: null,
      });
    });
  });

  describe('loginSuccess', () => {
    it('should set user, token, authenticated state and clear loading', () => {
      const previousState = {
        ...initialState,
        isLoading: true,
      };

      const payload = {
        user: mockUser,
        token: 'mock-token',
      };

      const action = loginSuccess(payload);
      const state = authReducer(previousState, action);

      expect(state).toEqual({
        user: mockUser,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Check that localStorage.setItem was called
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
    });
  });

  describe('loginFailure', () => {
    it('should set error, clear user data and stop loading', () => {
      const previousState = {
        user: mockUser,
        token: 'old-token',
        isAuthenticated: true,
        isLoading: true,
        error: null,
      };

      const action = loginFailure('Login failed');
      const state = authReducer(previousState, action);

      expect(state).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Login failed',
      });

      // Check that localStorage.removeItem was called
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('logout', () => {
    it('should clear all user data and authentication state', () => {
      const previousState = {
        user: mockUser,
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const action = logout();
      const state = authReducer(previousState, action);

      expect(state).toEqual({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      // Check that localStorage.removeItem was called
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      const previousState = {
        ...initialState,
        error: 'Some error',
      };

      const action = clearError();
      const state = authReducer(previousState, action);

      expect(state).toEqual({
        ...previousState,
        error: null,
      });
    });
  });

  describe('localStorage integration', () => {
    it('should initialize with token from localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('stored-token');
      
      // Import the slice again to get the initial state with localStorage
      const authSlice = require('../authSlice').default;
      const initialStateWithToken = authSlice(undefined, { type: 'unknown' });
      
      expect(initialStateWithToken.token).toBe('stored-token');
    });
  });
});