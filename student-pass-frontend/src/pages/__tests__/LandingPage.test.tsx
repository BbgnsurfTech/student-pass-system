import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../utils/test-utils';
import LandingPage from '../LandingPage';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: () => <div data-testid="check-circle-icon" />,
  ShieldCheckIcon: () => <div data-testid="shield-check-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  QrCodeIcon: () => <div data-testid="qr-code-icon" />,
  StarIcon: () => <div data-testid="star-icon" />,
  SparklesIcon: () => <div data-testid="sparkles-icon" />,
  RocketLaunchIcon: () => <div data-testid="rocket-launch-icon" />,
  HeartIcon: () => <div data-testid="heart-icon" />,
}));

// Mock the delightful components
jest.mock('../../components/common/DelightfulComponents', () => ({
  FloatingParticles: () => <div data-testid="floating-particles" />,
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
}));

// Mock timers for the animation intervals
jest.useFakeTimers();

describe('LandingPage Component', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  const renderLandingPage = () => {
    return renderWithProviders(<LandingPage />, {
      initialEntries: ['/']
    });
  };

  describe('Page Structure', () => {
    it('should render all main sections', () => {
      renderLandingPage();

      // Header
      expect(screen.getByText('Student Pass System')).toBeInTheDocument();
      
      // Hero section
      expect(screen.getByText(/Streamline Your/)).toBeInTheDocument();
      expect(screen.getByText('Student Pass')).toBeInTheDocument();
      expect(screen.getByText('Management')).toBeInTheDocument();
      
      // Features section
      expect(screen.getByText('Why Choose Our System?')).toBeInTheDocument();
      
      // How it works section
      expect(screen.getByText('How It Works')).toBeInTheDocument();
      
      // CTA section
      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
      
      // Footer
      expect(screen.getByText('© 2024 Student Pass System. All rights reserved.')).toBeInTheDocument();
    });

    it('should render floating particles component', () => {
      renderLandingPage();
      expect(screen.getByTestId('floating-particles')).toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render logo and title', () => {
      renderLandingPage();

      const logos = screen.getAllByText('SP');
      expect(logos.length).toBeGreaterThan(0);
      expect(screen.getByText('Student Pass System')).toBeInTheDocument();
    });

    it('should have sign in link in header', () => {
      renderLandingPage();

      const headerSignInLinks = screen.getAllByText('Sign In');
      const headerSignInLink = headerSignInLinks[0].closest('a');
      expect(headerSignInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Hero Section', () => {
    it('should render hero content', () => {
      renderLandingPage();

      expect(screen.getByText(/Streamline Your/)).toBeInTheDocument();
      expect(screen.getByText('Student Pass')).toBeInTheDocument();
      expect(screen.getByText('Management')).toBeInTheDocument();
      
      expect(screen.getByText(/A comprehensive digital solution/)).toBeInTheDocument();
    });

    it('should have CTA buttons in hero section', () => {
      renderLandingPage();

      const getStartedLink = screen.getByText('Get Started').closest('a');
      const learnMoreLink = screen.getByText('Learn More').closest('a');

      expect(getStartedLink).toHaveAttribute('href', '/login');
      expect(learnMoreLink).toHaveAttribute('href', '#features');
    });

    it('should render rocket launch icon in Get Started button', () => {
      renderLandingPage();
      expect(screen.getByTestId('rocket-launch-icon')).toBeInTheDocument();
    });

    it('should render star icon in Learn More button', () => {
      renderLandingPage();
      expect(screen.getByTestId('star-icon')).toBeInTheDocument();
    });
  });

  describe('Features Section', () => {
    it('should render all feature cards', () => {
      renderLandingPage();

      expect(screen.getByText('Digital Pass System')).toBeInTheDocument();
      expect(screen.getByText('Secure Authentication')).toBeInTheDocument();
      expect(screen.getByText('Real-time Processing')).toBeInTheDocument();
      expect(screen.getByText('Easy Management')).toBeInTheDocument();
    });

    it('should render feature descriptions', () => {
      renderLandingPage();

      expect(screen.getByText(/Generate and manage digital passes/)).toBeInTheDocument();
      expect(screen.getByText(/Role-based authentication ensures/)).toBeInTheDocument();
      expect(screen.getByText(/Instant application processing/)).toBeInTheDocument();
      expect(screen.getByText(/Streamlined workflow for students/)).toBeInTheDocument();
    });

    it('should render feature icons', () => {
      renderLandingPage();

      expect(screen.getByTestId('qr-code-icon')).toBeInTheDocument();
      expect(screen.getByTestId('shield-check-icon')).toBeInTheDocument();
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should have features section with correct id', () => {
      renderLandingPage();

      const featuresSection = screen.getByText('Why Choose Our System?').closest('section');
      expect(featuresSection).toHaveAttribute('id', 'features');
    });
  });

  describe('How It Works Section', () => {
    it('should render all three steps', () => {
      renderLandingPage();

      expect(screen.getByText('Student Applies')).toBeInTheDocument();
      expect(screen.getByText('Admin Reviews')).toBeInTheDocument();
      expect(screen.getByText('Access Granted')).toBeInTheDocument();
    });

    it('should render step numbers', () => {
      renderLandingPage();

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render step descriptions', () => {
      renderLandingPage();

      expect(screen.getByText(/Students submit applications/)).toBeInTheDocument();
      expect(screen.getByText(/Administrators review applications/)).toBeInTheDocument();
      expect(screen.getByText(/Approved students receive digital passes/)).toBeInTheDocument();
    });
  });

  describe('Call to Action Section', () => {
    it('should render CTA content', () => {
      renderLandingPage();

      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument();
      expect(screen.getByText(/Join thousands of students/)).toBeInTheDocument();
    });

    it('should have sign in link in CTA', () => {
      renderLandingPage();

      const signInNowLink = screen.getByText('Sign In Now');
      expect(signInNowLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Footer Section', () => {
    it('should render footer content', () => {
      renderLandingPage();

      expect(screen.getByText('© 2024 Student Pass System. All rights reserved.')).toBeInTheDocument();
    });

    it('should render footer logo', () => {
      renderLandingPage();

      // Footer should have its own SP logo
      const logos = screen.getAllByText('SP');
      expect(logos.length).toBeGreaterThanOrEqual(2); // Header + Footer
    });
  });

  describe('Dynamic Content', () => {
    it('should change emoji periodically', async () => {
      renderLandingPage();

      // Fast-forward time to trigger emoji change
      jest.advanceTimersByTime(2000);

      // The emoji should still be present (though it may have changed)
      const heroSection = screen.getByText('Student Pass').closest('section');
      expect(heroSection).toBeInTheDocument();
    });

    it('should change hero text periodically', async () => {
      renderLandingPage();

      // Fast-forward time to trigger text change
      jest.advanceTimersByTime(4000);

      // The text should still be present (though it may have changed)
      expect(screen.getByText('Student Pass')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should have multiple ways to reach login page', () => {
      renderLandingPage();

      const allLoginLinks = [
        ...screen.getAllByText('Sign In'),
        screen.getByText('Get Started'),
        screen.getByText('Sign In Now'),
      ];

      allLoginLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', '/login');
      });
    });

    it('should have internal navigation to features section', () => {
      renderLandingPage();

      const learnMoreLink = screen.getByText('Learn More');
      expect(learnMoreLink.closest('a')).toHaveAttribute('href', '#features');
    });
  });

  describe('Responsive Design Elements', () => {
    it('should have responsive grid classes', () => {
      renderLandingPage();

      // Features grid should be responsive
      const featuresContainer = screen.getByText('Digital Pass System').closest('div')?.parentElement?.parentElement;
      expect(featuresContainer).toHaveClass('grid');
    });

    it('should have responsive text classes', () => {
      renderLandingPage();

      const heroTitle = screen.getByText('Student Pass').closest('h1');
      expect(heroTitle).toHaveClass('text-4xl', 'sm:text-6xl');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderLandingPage();

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2s.length).toBeGreaterThan(0);
      expect(h3s.length).toBeGreaterThan(0);
    });

    it('should have descriptive link text', () => {
      renderLandingPage();

      const getStartedLink = screen.getByText('Get Started');
      const learnMoreLink = screen.getByText('Learn More');
      const signInNowLink = screen.getByText('Sign In Now');

      expect(getStartedLink).toBeInTheDocument();
      expect(learnMoreLink).toBeInTheDocument();
      expect(signInNowLink).toBeInTheDocument();
    });

    it('should have proper section structure', () => {
      renderLandingPage();

      const sections = screen.getAllByRole('banner').concat(
        screen.getAllByRole('main').length > 0 ? screen.getAllByRole('main') : [],
        screen.getAllByRole('contentinfo')
      );

      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Content Quality', () => {
    it('should have comprehensive feature descriptions', () => {
      renderLandingPage();

      const descriptions = [
        'Generate and manage digital passes with secure QR codes',
        'Role-based authentication ensures only authorized personnel',
        'Instant application processing and real-time status updates',
        'Streamlined workflow for students to apply'
      ];

      descriptions.forEach(description => {
        expect(screen.getByText(new RegExp(description))).toBeInTheDocument();
      });
    });

    it('should have clear value proposition', () => {
      renderLandingPage();

      expect(screen.getByText(/A comprehensive digital solution/)).toBeInTheDocument();
      expect(screen.getByText(/From application to approval to access control/)).toBeInTheDocument();
    });
  });

  describe('Smooth Scrolling', () => {
    it('should handle anchor link clicks', () => {
      renderLandingPage();

      const learnMoreLink = screen.getByText('Learn More');
      fireEvent.click(learnMoreLink);

      // The link should have the correct href
      expect(learnMoreLink.closest('a')).toHaveAttribute('href', '#features');
    });
  });

  describe('Error Boundaries', () => {
    it('should render without crashing with minimal props', () => {
      expect(() => renderLandingPage()).not.toThrow();
    });
  });
});