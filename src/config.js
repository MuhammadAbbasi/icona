// ICONA - software house providing ERP + CRM to small and medium construction companies.
// All site content lives here so components stay presentational.

const YEAR = new Date().getFullYear();

export const SITE_CONFIG = {
  company: {
    name: 'ICONA',
    tagline: 'The ERP + CRM built for construction',
    subTagline:
      'ICONA gives small and medium construction firms one connected system, from BOQ and budgeting to labour, subcontractors, and cash flow, on web and mobile.',
    domain: 'https://icona.app', // TODO: set the real domain
    appUrl: 'https://app.icona.app', // TODO: set the real ERP app URL (where clients log in)
  },

  nav: [
    { name: 'Modules', href: '#modules' },
    { name: 'Mobile', href: '#mobile' },
    { name: 'How it works', href: '#how' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ],

  hero: {
    badge: 'ERP + CRM for construction SMEs',
    title: 'Run your whole construction business in one place',
    highlight: 'one place',
    subtitle:
      'Stop stitching together spreadsheets. ICONA unifies estimating, project control, finance, labour, and subcontractors into a single ERP and CRM built for how construction firms actually work.',
    primaryCta: { label: 'Book a demo', href: '#contact' },
    secondaryCta: { label: 'Explore modules', href: '#modules' },
  },

  valueProps: [
    { label: 'ERP + CRM, unified' },
    { label: '7 core modules' },
    { label: 'Web + mobile' },
    { label: 'Built for construction' },
  ],

  modules: [
    {
      group: 'ERP',
      icon: 'Layers',
      title: 'BOQ & Estimation',
      description:
        'Hierarchical bills of quantities (Project to Domain to Task to priced line items) with automatic amount rollups and Excel or template import.',
    },
    {
      group: 'ERP',
      icon: 'FolderKanban',
      title: 'Project Control',
      description:
        'A structured project hierarchy with revisions, so every change to scope and price is tracked and never lost.',
    },
    {
      group: 'ERP',
      icon: 'Wallet',
      title: 'Finance & Cash Flow',
      description:
        'Record transactions, compare budget against actuals, and see cash flow per project and across the company.',
    },
    {
      group: 'ERP',
      icon: 'HardHat',
      title: 'Subcontractors',
      description:
        'Maintain a subcontractor registry and assign them to work at a fixed contract price, with clear accountability.',
    },
    {
      group: 'ERP',
      icon: 'ClipboardList',
      title: 'Labour & Attendance',
      description:
        'Daily labour logs, attendance sheets, and site-visit records captured from the field, not from memory.',
    },
    {
      group: 'ERP',
      icon: 'Landmark',
      title: 'Investors & Lenders',
      description:
        'Track lenders and investors and the funding tied to each project, so financing is always visible.',
    },
    {
      group: 'CRM',
      icon: 'Users',
      title: 'Clients & Leads',
      description:
        'Manage clients, enquiries, and proposals alongside the projects they belong to, in one shared record.',
    },
  ],

  mobile: {
    title: 'Your site office, in your pocket',
    subtitle:
      'Field teams do not sit at a desk. The ICONA mobile app puts the day-to-day site workflow on Android.',
    points: [
      'Log labour and mark attendance on site',
      'Record site visits with notes and photos',
      'Browse the live project hierarchy and BOQ',
      'Everything syncs back to the web ERP',
    ],
  },

  how: [
    {
      step: '01',
      title: 'Import your BOQ',
      description: 'Bring projects in via Excel or templates. ICONA builds the hierarchy and amount rollups for you.',
    },
    {
      step: '02',
      title: 'Run the site',
      description: 'Log labour, attendance, subcontractors, and site visits as the work happens, on web or mobile.',
    },
    {
      step: '03',
      title: 'Control the money',
      description: 'Record transactions and watch budget versus actual on every project in real time.',
    },
    {
      step: '04',
      title: 'Decide with clarity',
      description: 'Revisions and reports keep owners, investors, and lenders aligned on where each project stands.',
    },
  ],

  // TODO: confirm real pricing. Placeholder tiers.
  pricing: [
    {
      name: 'Starter',
      price: 'Custom',
      tagline: 'For a single small firm getting organised',
      features: ['Up to 5 active projects', 'BOQ, project control & finance', '3 team members', 'Email support'],
      cta: 'Book a demo',
      featured: false,
    },
    {
      name: 'Growth',
      price: 'Custom',
      tagline: 'For growing contractors running multiple sites',
      features: [
        'Unlimited projects',
        'All ERP modules + CRM',
        'Mobile app for field teams',
        'Priority support & onboarding',
      ],
      cta: 'Book a demo',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      tagline: 'For established firms that need it all',
      features: ['Everything in Growth', 'Investor & lender registry', 'Custom onboarding & training', 'Dedicated support'],
      cta: 'Talk to us',
      featured: false,
    },
  ],

  // TODO: replace with real, attributed testimonials.
  testimonials: [
    {
      quote:
        'We priced a full BOQ in an afternoon instead of a week, and the rollups just added up. No more broken spreadsheet formulas.',
      author: 'Project Director',
      role: 'Mid-size contracting firm',
    },
    {
      quote:
        'For the first time our site attendance and subcontractor costs land in the same place as the budget. We catch overruns early now.',
      author: 'Operations Manager',
      role: 'Residential builder',
    },
    {
      quote:
        'The mobile app means our supervisors log labour from the site itself. The head office finally sees reality, not last week.',
      author: 'Managing Partner',
      role: 'General contractor',
    },
  ],

  contact: {
    heading: 'Book a demo',
    subheading: 'See ICONA on your own projects. Tell us about your firm and we will set up a walkthrough.',
    email: 'hello@icona.app', // TODO: set real inbox
    phone: '+92 321 2379862', // TODO: confirm
    formspreeId: 'xykojjow', // TODO: confirm this Formspree inbox belongs to ICONA
    socials: {
      linkedin: '', // TODO
      instagram: '', // TODO
      facebook: '', // TODO
    },
  },

  footer: {
    blurb: 'ERP and CRM software for small and medium construction companies. One system for estimating, sites, and finance.',
    year: YEAR,
  },
};
