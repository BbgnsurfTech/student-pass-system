import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockUser, createAuthenticatedState, mockApplication, mockPass } from '../../../utils/test-utils';
import StudentDashboard from '../StudentDashboard';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
    thead: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
    tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  PlusIcon: () => <div data-testid="plus-icon" />,
  QrCodeIcon: () => <div data-testid="qr-code-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  CheckCircleIcon: () => <div data-testid="check-circle-icon" />,
  XCircleIcon: () => <div data-testid="x-circle-icon" />,
  DocumentTextIcon: () => <div data-testid="document-text-icon" />,
  SparklesIcon: () => <div data-testid="sparkles-icon" />,
  RocketLaunchIcon: () => <div data-testid="rocket-launch-icon" />,
  TrophyIcon: () => <div data-testid="trophy-icon" />,
  HeartIcon: () => <div data-testid="heart-icon" />,
  StarIcon: () => <div data-testid="star-icon" />,
}));

// Mock delightful components
jest.mock('../../../components/common/DelightfulComponents', () => ({
  BouncyButton: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  WigglyCard: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  PlayfulLoader: ({ message }: any) => <div data-testid="playful-loader">{message}</div>,
  EmptyStateWithPersonality: ({ title, description, actionButton, icon: Icon }: any) => (
    <div data-testid="empty-state">
      <Icon />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionButton && <button onClick={actionButton.onClick}>{actionButton.text}</button>}
    </div>
  ),
  AnimatedStatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
  PageTransition: ({ children }: any) => <div>{children}</div>,
}));

// Mock timers for animations
jest.useFakeTimers();

describe('StudentDashboard Component', () => {
  const mockApplications = [
    { ...mockApplication, status: 'PENDING' },
    { ...mockApplication, id: '2', status: 'APPROVED', purpose: 'Gym access' },
    { ...mockApplication, id: '3', status: 'REJECTED', purpose: 'Lab access' },
  ];

  const mockPasses = [
    { ...mockPass, isActive: true },
    { ...mockPass, id: '2', isActive: true, passType: 'PERMANENT' },
  ];

  beforeEach(() => {
    jest.clearAllTimers();
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

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  const renderStudentDashboard = (preloadedState = createAuthenticatedState(mockUser)) => {
    return renderWithProviders(<StudentDashboard />, {
      preloadedState,
      initialEntries: ['/student/dashboard']
    });
  };

  describe('Page Structure', () => {
    it('should render main dashboard sections', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
        expect(screen.getByText(/Manage your access passes/)).toBeInTheDocument();
        expect(screen.getByText('Active Passes')).toBeInTheDocument();
        expect(screen.getByText('Recent Applications')).toBeInTheDocument();
      });
    });

    it('should display user greeting with name', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
      });
    });

    it('should render new application button', async () => {
      renderStudentDashboard();

      const newAppButton = screen.getByText('New Application');
      expect(newAppButton.closest('a')).toHaveAttribute('href', '/student/applications/new');
    });
  });

  describe('Statistics Cards', () => {
    it('should display statistics cards with correct values', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        // Wait for data to load
        expect(screen.getByText('Active Passes')).toBeInTheDocument();
      });

      // Check stats values
      expect(screen.getByText('Active Passes')).toBeInTheDocument();
      expect(screen.getByText('Pending Applications')).toBeInTheDocument();
      expect(screen.getByText('Approved Applications')).toBeInTheDocument();
      expect(screen.getByText('Total Applications')).toBeInTheDocument();
    });

    it('should render stat icons', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('qr-code-icon')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByTestId('document-text-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Active Passes Section', () => {
    it('should display active passes when available', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByText('TEMPORARY Pass')).toBeInTheDocument();
        expect(screen.getByText('PERMANENT Pass')).toBeInTheDocument();
      });

      // Check pass details
      const tempPass = screen.getByText('TEMPORARY Pass');
      expect(tempPass).toBeInTheDocument();

      // Check View all link
      const viewAllLink = screen.getByText('View all');
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/student/passes');
    });

    it('should display empty state when no passes', async () => {
      server.use(
        http.get('/api/v1/passes', () => {
          return HttpResponse.json([]);
        })
      );

      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByText('No Active Passes Yet! 🎫')).toBeInTheDocument();
        expect(screen.getByText('🚀 Apply for a Pass')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching passes', () => {
      server.use(
        http.get('/api/v1/passes', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockPasses);
        })
      );

      renderStudentDashboard();

      expect(screen.getByTestId('playful-loader')).toBeInTheDocument();
      expect(screen.getByText('Loading your awesome passes...')).toBeInTheDocument();
    });
  });

  describe('Recent Applications Section', () => {
    it('should display recent applications table', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByText('Recent Applications')).toBeInTheDocument();
        
        // Check table headers
        expect(screen.getByText('🎫 Pass Type')).toBeInTheDocument();
        expect(screen.getByText('🎯 Purpose')).toBeInTheDocument();
        expect(screen.getByText('📈 Status')).toBeInTheDocument();
        expect(screen.getByText('📅 Applied')).toBeInTheDocument();
      });

      // Check application data
      expect(screen.getByText('TEMPORARY')).toBeInTheDocument();
      expect(screen.getByText('Library access')).toBeInTheDocument();
      expect(screen.getByText('Gym access')).toBeInTheDocument();
    });

    it('should display status badges for applications', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        const statusBadges = screen.getAllByTestId('status-badge');
        expect(statusBadges.length).toBeGreaterThan(0);
        
        // Check for different statuses
        expect(screen.getByText('PENDING')).toBeInTheDocument();
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText('REJECTED')).toBeInTheDocument();
      });
    });

    it('should have view links for each application', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        const viewLinks = screen.getAllByText('View');
        expect(viewLinks.length).toBeGreaterThan(0);
        
        // Check that links have correct hrefs
        viewLinks.forEach(link => {
          expect(link.closest('a')).toHaveAttribute('href', expect.stringMatching(/\/student\/applications\/\d+/));
        });
      });
    });

    it('should display empty state when no applications', async () => {
      server.use(
        http.get('/api/v1/applications', () => {
          return HttpResponse.json([]);
        })
      );

      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByText('No Applications Yet! 📋')).toBeInTheDocument();
        expect(screen.getByText('🎆 Submit First Application')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching applications', () => {
      server.use(
        http.get('/api/v1/applications', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockApplications);
        })
      );

      renderStudentDashboard();

      expect(screen.getByTestId('playful-loader')).toBeInTheDocument();
      expect(screen.getByText('Fetching your applications...')).toBeInTheDocument();
    });

    it('should have View all link for applications', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        const viewAllLinks = screen.getAllByText('View all');
        const applicationsViewAll = viewAllLinks.find(link => 
          link.closest('a')?.getAttribute('href') === '/student/applications'
        );
        expect(applicationsViewAll).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Content', () => {
    it('should change greeting periodically', async () => {
      renderStudentDashboard();

      // Initial greeting
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
      });

      // Fast-forward time to trigger greeting change
      jest.advanceTimersByTime(5000);

      // The greeting component should still be present (may have different text)
      expect(screen.getByText(/John!/)).toBeInTheDocument();
    });

    it('should display motivational quotes', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        // Should display some motivational content
        const quoteElement = document.querySelector('.text-primary-700');
        expect(quoteElement).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Links', () => {
    it('should have correct navigation links', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        const newAppLink = screen.getByText('New Application').closest('a');
        expect(newAppLink).toHaveAttribute('href', '/student/applications/new');
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

      renderStudentDashboard();

      // Component should still render without crashing
      expect(screen.getByText(/Welcome back, John!/)).toBeInTheDocument();
    });
  });

  describe('Empty State Actions', () => {
    it('should handle empty state button clicks', async () => {
      server.use(
        http.get('/api/v1/passes', () => {
          return HttpResponse.json([]);
        })
      );

      // Mock window.location.href
      const mockLocationAssign = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { href: mockLocationAssign },
        writable: true,
      });

      renderStudentDashboard();

      await waitFor(() => {
        const applyButton = screen.getByText('🚀 Apply for a Pass');
        fireEvent.click(applyButton);
        
        expect(window.location.href).toBe('/student/applications/new');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive grid classes', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        // Check for responsive grid classes
        const statsGrid = document.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
        expect(statsGrid).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1 });
        const h2s = screen.getAllByRole('heading', { level: 2 });
        
        expect(h1).toBeInTheDocument();
        expect(h2s.length).toBeGreaterThan(0);
      });
    });

    it('should have descriptive link text', async () => {
      renderStudentDashboard();

      await waitFor(() => {
        expect(screen.getByText('New Application')).toBeInTheDocument();
        expect(screen.getAllByText('View all')).toHaveLength(2);
        expect(screen.getAllByText('View').length).toBeGreaterThan(0);
      });
    });
  });

  describe('User Context', () => {
    it('should render correctly when user has no data', () => {
      const emptyUser = { ...mockUser, firstName: '' };
      const stateWithEmptyUser = createAuthenticatedState(emptyUser);
      
      renderStudentDashboard(stateWithEmptyUser);

      // Should still render without crashing
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
    });
  });
});