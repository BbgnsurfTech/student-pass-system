import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUser, mockAdminUser, createAuthenticatedState } from '../../../utils/test-utils';
import Layout from '../Layout';

// Mock the icons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
  DocumentTextIcon: () => <div data-testid="document-icon" />,
  UserIcon: () => <div data-testid="user-icon" />,
  CogIcon: () => <div data-testid="cog-icon" />,
  LogoutIcon: () => <div data-testid="logout-icon" />,
  MenuIcon: () => <div data-testid="menu-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Layout Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderLayout = (preloadedState = {}) => {
    return renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>,
      { preloadedState }
    );
  };

  describe('Authenticated Student User', () => {
    const studentState = createAuthenticatedState(mockUser);

    it('should render layout with student navigation', () => {
      renderLayout(studentState);

      expect(screen.getByText('Student Pass')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should display user information in sidebar', () => {
      renderLayout(studentState);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('STUDENT')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // User initials
    });

    it('should have correct navigation links for student', () => {
      renderLayout(studentState);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const applicationsLink = screen.getByRole('link', { name: /applications/i });
      const profileLink = screen.getByRole('link', { name: /profile/i });

      expect(dashboardLink).toHaveAttribute('href', '/student/dashboard');
      expect(applicationsLink).toHaveAttribute('href', '/student/applications');
      expect(profileLink).toHaveAttribute('href', '/student/profile');
    });
  });

  describe('Authenticated Admin User', () => {
    const adminState = createAuthenticatedState(mockAdminUser);

    it('should render layout with admin navigation', () => {
      renderLayout(adminState);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should have correct navigation links for admin', () => {
      renderLayout(adminState);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const applicationsLink = screen.getByRole('link', { name: /applications/i });
      const usersLink = screen.getByRole('link', { name: /users/i });
      const reportsLink = screen.getByRole('link', { name: /reports/i });

      expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
      expect(applicationsLink).toHaveAttribute('href', '/admin/applications');
      expect(usersLink).toHaveAttribute('href', '/admin/users');
      expect(reportsLink).toHaveAttribute('href', '/admin/reports');
    });
  });

  describe('Active Navigation State', () => {
    it('should highlight active navigation item', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      // Simulate being on dashboard page
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('bg-primary-100', 'text-primary-700');
    });
  });

  describe('Mobile Sidebar', () => {
    it('should show mobile menu button on small screens', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const menuButton = screen.getByTestId('menu-icon').closest('button');
      expect(menuButton).toBeInTheDocument();
    });

    it('should toggle sidebar when mobile menu button is clicked', async () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const menuButton = screen.getByTestId('menu-icon').closest('button');
      
      // Initially sidebar should be hidden (mobile)
      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('-translate-x-full');

      // Click menu button
      fireEvent.click(menuButton!);

      // Sidebar should now be visible
      await waitFor(() => {
        expect(sidebar).toHaveClass('translate-x-0');
      });
    });

    it('should close sidebar when clicking on navigation item', async () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      // Open sidebar first
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);

      const sidebar = screen.getByRole('navigation').closest('div');
      await waitFor(() => {
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Click on a navigation item
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      fireEvent.click(dashboardLink);

      // Sidebar should close
      await waitFor(() => {
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('should close sidebar when clicking close button', async () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      // Open sidebar first
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);

      const sidebar = screen.getByRole('navigation').closest('div');
      await waitFor(() => {
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Click close button
      const closeButton = screen.getByTestId('x-icon').closest('button');
      fireEvent.click(closeButton!);

      // Sidebar should close
      await waitFor(() => {
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });

    it('should close sidebar when clicking overlay', async () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      // Open sidebar first
      const menuButton = screen.getByTestId('menu-icon').closest('button');
      fireEvent.click(menuButton!);

      const sidebar = screen.getByRole('navigation').closest('div');
      await waitFor(() => {
        expect(sidebar).toHaveClass('translate-x-0');
      });

      // Click overlay
      const overlay = document.querySelector('.bg-gray-600.bg-opacity-75');
      fireEvent.click(overlay!);

      // Sidebar should close
      await waitFor(() => {
        expect(sidebar).toHaveClass('-translate-x-full');
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should handle logout when logout button is clicked', async () => {
      const studentState = createAuthenticatedState(mockUser);
      const { store } = renderLayout(studentState);

      const logoutButton = screen.getByTestId('logout-icon').closest('button');
      fireEvent.click(logoutButton!);

      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.token).toBeNull();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('User Display', () => {
    it('should display user initials correctly', () => {
      const userWithCustomName = {
        ...mockUser,
        firstName: 'Alice',
        lastName: 'Smith',
      };
      const customState = createAuthenticatedState(userWithCustomName);
      renderLayout(customState);

      expect(screen.getByText('AS')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should handle missing user names gracefully', () => {
      const userWithoutNames = {
        ...mockUser,
        firstName: '',
        lastName: '',
      };
      const customState = createAuthenticatedState(userWithoutNames);
      renderLayout(customState);

      // Should still render the component without crashing
      expect(screen.getByText('Student Pass')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      const menuButton = screen.getByTestId('menu-icon').closest('button');
      expect(menuButton).toBeInTheDocument();

      const logoutButton = screen.getByTestId('logout-icon').closest('button');
      expect(logoutButton).toHaveAttribute('title', 'Logout');
    });

    it('should support keyboard navigation', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      dashboardLink.focus();
      expect(document.activeElement).toBe(dashboardLink);
    });
  });

  describe('Responsive Design', () => {
    it('should hide sidebar on mobile by default', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    it('should show sidebar on desktop (lg screens)', () => {
      const studentState = createAuthenticatedState(mockUser);
      renderLayout(studentState);

      const sidebar = screen.getByRole('navigation').closest('div');
      expect(sidebar).toHaveClass('lg:translate-x-0');
    });
  });
});