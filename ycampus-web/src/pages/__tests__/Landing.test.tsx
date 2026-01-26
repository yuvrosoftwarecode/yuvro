import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import Landing from '../Landing';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{component}</AuthProvider>
    </BrowserRouter>
  );
};

describe('Landing', () => {
  it('renders the landing page', () => {
    renderWithProviders(<Landing />);

    expect(screen.getByText('Welcome to')).toBeInTheDocument();
    expect(screen.getByText('YC Full-Stack App')).toBeInTheDocument();
    expect(
      screen.getByText(/A modern full-stack application/)
    ).toBeInTheDocument();
  });

  it('shows sign in and sign up links when not authenticated', () => {
    renderWithProviders(<Landing />);

    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
    expect(screen.getByText('Get started')).toBeInTheDocument();
  });
});
