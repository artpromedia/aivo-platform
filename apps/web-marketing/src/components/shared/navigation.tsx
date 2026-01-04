'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  Users,
  GraduationCap,
  School,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { NavAuthSection } from '@/components/cta';
import { AivoLogo } from '@/components/ui/aivo-logo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
  children?: {
    label: string;
    href: string;
    description?: string;
    icon?: React.ReactNode;
  }[];
}

const navItems: NavItem[] = [
  {
    label: 'Features',
    href: '#features',
    children: [
      {
        label: 'For Parents',
        href: '#for-parents',
        description: "Support your child's unique learning journey",
        icon: <Users className="w-5 h-5 text-coral-500" />,
      },
      {
        label: 'For Students',
        href: '#for-students',
        description: 'Learn at your own pace with AI support',
        icon: <GraduationCap className="w-5 h-5 text-theme-primary-500" />,
      },
      {
        label: 'For Teachers',
        href: '#for-teachers',
        description: 'Differentiate instruction effortlessly',
        icon: <School className="w-5 h-5 text-mint-500" />,
      },
    ],
  },
  {
    label: 'AIVO Pad',
    href: '/aivo-pad',
    badge: 'New',
  },
  {
    label: 'How It Works',
    href: '#how-it-works',
  },
  {
    label: 'Pricing',
    href: '#pricing',
  },
  {
    label: 'About',
    href: '/about',
  },
  {
    label: 'Contact',
    href: '/contact',
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeDropdown, setActiveDropdown] = React.useState<string | null>(null);

  // Handle scroll detection
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        const offset = 80;
        const top = element.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-soft border-b border-gray-100'
            : 'bg-transparent'
        )}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <AivoLogo size="md" variant="horizontal-dark" href="/" className="shrink-0" />

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => {
                    if (item.children) setActiveDropdown(item.label);
                  }}
                  onMouseLeave={() => {
                    setActiveDropdown(null);
                  }}
                >
                  {item.children ? (
                    <>
                      <button
                        className={cn(
                          'flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                          activeDropdown === item.label
                            ? 'text-theme-primary-600 bg-theme-primary-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            activeDropdown === item.label && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      <AnimatePresence>
                        {activeDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-soft-lg border border-gray-100 overflow-hidden"
                          >
                            <div className="p-2">
                              {item.children.map((child) => (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  onClick={() => {
                                    handleNavClick(child.href);
                                  }}
                                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                >
                                  <div className="shrink-0 mt-0.5">{child.icon}</div>
                                  <div>
                                    <div className="font-medium text-gray-900 group-hover:text-theme-primary-600 transition-colors">
                                      {child.label}
                                    </div>
                                    {child.description && (
                                      <div className="text-sm text-gray-500 mt-0.5">
                                        {child.description}
                                      </div>
                                    )}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => {
                        handleNavClick(item.href);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                        'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                      {...(item.external && {
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      })}
                    >
                      {item.label}
                      {item.badge && (
                        <Badge variant="success" size="sm" pulse>
                          {item.badge}
                        </Badge>
                      )}
                      {item.external && <ExternalLink className="w-3 h-3" />}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <NavAuthSection />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="lg:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => {
                setIsMobileMenuOpen(false);
              }}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <AivoLogo size="md" variant="horizontal-dark" href="/" />
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className="p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <div key={item.label}>
                      {item.children ? (
                        <div className="py-2">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                            {item.label}
                          </div>
                          <div className="space-y-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.label}
                                href={child.href}
                                onClick={() => {
                                  handleNavClick(child.href);
                                }}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                {child.icon}
                                <span className="font-medium text-gray-700">{child.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => {
                            handleNavClick(item.href);
                          }}
                          className="flex items-center gap-2 px-3 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          {item.label}
                          {item.badge && (
                            <Badge variant="success" size="sm">
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile CTAs */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <NavAuthSection
                    mobile
                    onAction={() => {
                      setIsMobileMenuOpen(false);
                    }}
                  />
                </div>

                {/* Trust Indicators */}
                <div className="mt-8 p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-theme-primary-500" />
                    <span>Trusted by 150+ families in pilot program</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
