import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API client
vi.mock('../../services/api', () => ({
  apiClient: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logoutUser: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isLoading
          ? 'Loading'
          : isAuthenticated
            ? 'Authenticated'
            : 'Not Authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `User: ${user.email}` : 'No user'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides initial auth state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent(
      'Not Authenticated'
    );
    expect(screen.getByTestId('user-info')).toHaveTextContent('No user');
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
