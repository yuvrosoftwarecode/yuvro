import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import authService from '../services/authService';
import { ApiError } from '../utils/RestApiUtil';

export type UserRole = 'admin' | 'instructor' | 'college_admin' | 'principal' | 'hod' | 'faculty' | 'recruiter' | 'placement_officer' | 'student';

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  date_joined?: string;
  last_login?: string;
  profile?: {
    about?: string;
    avatar?: string;
  };
  college_name?: string;
  college_id?: string;
  department_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

const getInitialState = (): AuthState => {
  const accessToken = localStorage.getItem('access');
  const storedUser = localStorage.getItem('user');

  // Robust check for token validity
  const isValidToken = accessToken && accessToken !== 'undefined' && accessToken !== 'null';

  let user = null;
  if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
    try {
      user = JSON.parse(storedUser);
    } catch (e) {
      console.warn('Failed to parse stored user data:', e);
      localStorage.removeItem('user');
    }
  }

  if (isValidToken) {
    return {
      user,
      token: accessToken,
      isLoading: true,
      isAuthenticated: true,
    };
  }
  return {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, getInitialState());

  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      const currentStorageToken = localStorage.getItem('access');
      // ONLY set if it's different to avoid triggering unnecessary cycles 
      // AND ensure we don't overwrite a potentially fresher token from another tab/process
      if (currentStorageToken !== state.token) {
        localStorage.setItem('access', state.token);
      }
      authService.setAuthToken(state.token);
    } else if (!state.isAuthenticated && !state.isLoading) {
      // Only clear if we are explicitly not authenticated and NOT just loading
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
  }, [state.isAuthenticated, state.token, state.isLoading]);

  useEffect(() => {
    const accessToken = localStorage.getItem('access');

    if (accessToken) {
      authService.setAuthToken(accessToken);
      authService.initializeFromStorage();

      authService.getCurrentUser()
        .then((user) => {
          // If we got a user, the session is active. 
          // Use the latest token from authService (which might have refreshed)
          const currentToken = authService.getAuthToken() || accessToken;
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token: currentToken }
          });
          localStorage.setItem('user', JSON.stringify(user));
        })
        .catch((error) => {
          console.error('Failed to get current user:', error);
          if (error.status === 401) {
            console.warn('Session invalid, logging out...');
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            localStorage.removeItem('user');
            dispatch({ type: 'LOGIN_FAILURE' });
          } else {
            console.warn('Could not fetch user data, but keeping authentication for now');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        });
    }
  }, []);


  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(email, password);

      localStorage.setItem('user', JSON.stringify(response.user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.access },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };


  const loginWithGoogle = async (): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      throw new ApiError('Google OAuth not implemented yet', 501);
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string
  ): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register({
        email,
        username,
        password,
        password_confirm: password
      });

      localStorage.setItem('user', JSON.stringify(response.user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.access },
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = (): void => {
    authService.logoutUser().finally(() => {
      localStorage.clear();
      dispatch({ type: 'LOGOUT' });
    });
  };

  const updateUser = (user: User): void => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithGoogle,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};