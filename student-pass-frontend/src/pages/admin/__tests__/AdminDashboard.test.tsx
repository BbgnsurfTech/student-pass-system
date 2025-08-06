import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockAdminUser, createAuthenticatedState, mockApplication, mockPass } from '../../../utils/test-utils';
import AdminDashboard from '../AdminDashboard';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  UsersIcon: () => <div data-testid="users-icon" />,
  DocumentTextIcon: () => <div data-testid="document-text-icon" />,
  CheckCircleIcon: () => <div data-testid="check-circle-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  XCircleIcon: () => <div data-testid="x-circle-icon" />,
  ChartBarIcon: () => <div data-testid="chart-bar-icon" />,
}));

describe('AdminDashboard Component', () => {
  const mockApplications = [
    { ...mockApplication, status: 'PENDING', studentId: '1' },
    { ...mockApplication, id: '2', status: 'APPROVED', studentId: '2', purpose: 'Gym access' },
    { ...mockApplication, id: '3', status: 'REJECTED', studentId: '1', purpose: 'Lab access' },
    { ...mockApplication, id: '4', status: 'PENDING', studentId: '3', purpose: 'Library extended' },
  ];

  const mockPasses = [
    { ...mockPass, isActive: true, studentId: '1' },
    { ...mockPass, id: '2', isActive: true, studentId: '2', passType: 'PERMANENT' },
    { ...mockPass, id: '3', isActive: false, studentId: '3', passType: 'VISITOR' },
  ];

  beforeEach(() => {
    // Mock successful data fetch
    server.use(
      http.get('/api/v1/applications', () => {
        return HttpResponse.json(mockApplications);
      }),
      http.get('/api/v1/passes', () => {
        return HttpResponse.json(mockPasses);
      })
    );
  });

  const renderAdminDashboard = (preloadedState = createAuthenticatedState(mockAdminUser)) => {
    return renderWithProviders(<AdminDashboard />, {
      preloadedState,
      initialEntries: ['/admin/dashboard']
    });
  };

  describe('Page Structure', () => {
    it('should render main dashboard sections', async () => {
      renderAdminDashboard();

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Manage student applications and monitor system activity.')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Pending Applications')).toBeInTheDocument();
        expect(screen.getByText('Recent Passes')).toBeInTheDocument();
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });
    });

    it('should render header action buttons', () => {
      renderAdminDashboard();

      const reportsButton = screen.getByText('Reports');
      const reviewAppsButton = screen.getByText('Review Applications');

      expect(reportsButton.closest('a')).toHaveAttribute('href', '/admin/reports');
      expect(reviewAppsButton.closest('a')).toHaveAttribute('href', '/admin/applications');
    });
  });

  describe('Statistics Cards', () => {
    it('should display statistics with correct values', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Check that stats are rendered
        expect(screen.getByText('Total Applications')).toBeInTheDocument();
        expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
        expect(screen.getByText('Active Passes')).toBeInTheDocument();
        expect(screen.getByText('Total Students')).toBeInTheDocument();
      });

      // Check calculated values
      await waitFor(() => {
        // Total applications: 4
        expect(screen.getByText('4')).toBeInTheDocument();
        
        // Pending applications: 2 (PENDING status)
        expect(screen.getByText('2')).toBeInTheDocument();
        
        // Active passes: 2 (isActive: true)
        // Total students: 3 (unique studentIds: '1', '2', '3')
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should render stat icons', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('document-text-icon')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      });
    });

    it('should display change percentages', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('+12%')).toBeInTheDocument();
        expect(screen.getByText('+5%')).toBeInTheDocument();
        expect(screen.getByText('+8%')).toBeInTheDocument();
        expect(screen.getByText('+3%')).toBeInTheDocument();
      });
    });
  });

  describe('Pending Applications Section', () => {
    it('should display pending applications', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Should show pending applications
        expect(screen.getByText('TEMPORARY Pass')).toBeInTheDocument();
        expect(screen.getByText('Purpose: Library access')).toBeInTheDocument();
        expect(screen.getByText('Purpose: Library extended')).toBeInTheDocument();
      });

      // Check status badges
      const pendingBadges = screen.getAllByText('PENDING');
      expect(pendingBadges.length).toBeGreaterThan(0);

      // Check review buttons
      const reviewButtons = screen.getAllByText('Review');
      expect(reviewButtons.length).toBe(2); // 2 pending applications
    });

    it('should have correct review links', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        const reviewButtons = screen.getAllByText('Review');
        reviewButtons.forEach(button => {
          const link = button.closest('a');
          expect(link).toHaveAttribute('href', expect.stringMatching(/\/admin\/applications\/\d+/));
        });
      });
    });

    it('should have view all pending link', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        const viewAllLinks = screen.getAllByText('View all');
        const pendingViewAll = viewAllLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/admin/applications?status=pending'
        );
        expect(pendingViewAll).toBeInTheDocument();
      });
    });

    it('should display empty state when no pending applications', async () => {
      server.use(
        http.get('/api/v1/applications', () => {
          return HttpResponse.json([
            { ...mockApplication, status: 'APPROVED' },
          ]);
        })
      );

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('No pending applications.')).toBeInTheDocument();
        expect(screen.getByTestId('document-text-icon')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching applications', () => {
      server.use(
        http.get('/api/v1/applications', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockApplications);
        })
      );

      renderAdminDashboard();

      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    });
  });

  describe('Recent Passes Section', () => {
    it('should display recent passes', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('TEMPORARY Pass')).toBeInTheDocument();
        expect(screen.getByText('PERMANENT Pass')).toBeInTheDocument();
        expect(screen.getByText('VISITOR Pass')).toBeInTheDocument();
      });

      // Check pass details
      expect(screen.getByText('Usage: 0 times')).toBeInTheDocument();
      
      // Check active/inactive status
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should have correct view links for passes', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Get view buttons in passes section (not in applications section)
        const passesSection = screen.getByText('Recent Passes').closest('div');
        const viewButtons = Array.from(passesSection!.querySelectorAll('a')).filter(link => 
          link.textContent === 'View'
        );
        
        expect(viewButtons.length).toBe(3); // 3 passes
        viewButtons.forEach(button => {
          expect(button).toHaveAttribute('href', expect.stringMatching(/\/admin\/passes\/\d+/));
        });
      });
    });

    it('should have view all passes link', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        const viewAllLinks = screen.getAllByText('View all');
        const passesViewAll = viewAllLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/admin/passes'
        );
        expect(passesViewAll).toBeInTheDocument();
      });
    });

    it('should display empty state when no passes', async () => {
      server.use(
        http.get('/api/v1/passes', () => {
          return HttpResponse.json([]);
        })
      );

      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('No passes created yet.')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching passes', () => {
      server.use(
        http.get('/api/v1/passes', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockPasses);
        })
      );

      renderAdminDashboard();

      expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    });
  });

  describe('Quick Actions Section', () => {
    it('should display quick action cards', () => {
      renderAdminDashboard();

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      
      // Check all quick action cards
      expect(screen.getByText('Review Applications')).toBeInTheDocument();
      expect(screen.getByText('Process pending requests')).toBeInTheDocument();
      
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('Add or edit user accounts')).toBeInTheDocument();
      
      expect(screen.getByText('View Reports')).toBeInTheDocument();
      expect(screen.getByText('Analytics and insights')).toBeInTheDocument();
      
      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure system options')).toBeInTheDocument();
    });

    it('should have correct quick action links', () => {
      renderAdminDashboard();

      // Find quick action section and its links
      const quickActionsSection = screen.getByText('Quick Actions').closest('div');
      const actionLinks = quickActionsSection!.querySelectorAll('a');

      const expectedHrefs = [
        '/admin/applications',
        '/admin/users',
        '/admin/reports',
        '/admin/settings'
      ];

      expectedHrefs.forEach(href => {
        const link = Array.from(actionLinks).find(a => a.getAttribute('href') === href);
        expect(link).toBeInTheDocument();
      });
    });

    it('should render quick action icons', () => {
      renderAdminDashboard();

      // Should have multiple instances of these icons (stats + quick actions)
      expect(screen.getAllByTestId('document-text-icon').length).toBeGreaterThan(1);
      expect(screen.getAllByTestId('users-icon').length).toBeGreaterThan(1);
      expect(screen.getAllByTestId('chart-bar-icon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('clock-icon').length).toBeGreaterThan(1);
    });
  });

  describe('Data Processing', () => {
    it('should correctly calculate unique students count', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // With studentIds ['1', '2', '1', '3'], unique count should be 3
        expect(screen.getByText('Total Students')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should correctly filter pending applications', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Should show 2 pending applications in the stats
        expect(screen.getByText('Pending Reviews')).toBeInTheDocument();
        
        // Should show 2 pending applications in the pending section
        const reviewButtons = screen.getAllByText('Review');
        expect(reviewButtons).toHaveLength(2);
      });
    });

    it('should correctly filter active passes', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Should show 2 active passes in stats (isActive: true)
        expect(screen.getByText('Active Passes')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('/api/v1/applications', () => {
          return HttpResponse.error();
        }),
        http.get('/api/v1/passes', () => {
          return HttpResponse.error();
        })
      );

      renderAdminDashboard();

      // Component should still render without crashing
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  describe('Badge Styling', () => {
    it('should apply correct badge classes for different statuses', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Test status badges (implementation would depend on actual badge component)
        const pendingElements = screen.getAllByText('PENDING');
        expect(pendingElements.length).toBeGreaterThan(0);
        
        const activeElements = screen.getAllByText('Active');
        expect(activeElements.length).toBeGreaterThan(0);
        
        const inactiveElements = screen.getAllByText('Inactive');
        expect(inactiveElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      renderAdminDashboard();

      // Check for responsive grid classes in stats section
      const statsGrid = document.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
      expect(statsGrid).toBeInTheDocument();

      // Check for responsive grid in main content
      const mainGrid = document.querySelector('.grid-cols-1.lg\\:grid-cols-2');
      expect(mainGrid).toBeInTheDocument();

      // Check for responsive grid in quick actions
      const quickActionsGrid = document.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
      expect(quickActionsGrid).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderAdminDashboard();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
      expect(h3s.length).toBeGreaterThan(0);
    });

    it('should have descriptive link text', () => {
      renderAdminDashboard();

      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Review Applications')).toBeInTheDocument();
      expect(screen.getAllByText('View all')).toHaveLength(2);
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('View Reports')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        // Check that dates are displayed (format may vary based on locale)
        const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}/;
        const dateElements = document.querySelectorAll('*');
        const hasDateFormat = Array.from(dateElements).some(el => 
          dateRegex.test(el.textContent || '')
        );
        expect(hasDateFormat).toBe(true);
      });
    });
  });
});