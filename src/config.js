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
    appUrl: '', // resolved locally in dev/prod
    signupPath: '/signup', // TODO: confirm once the ERP signup wizard ships
    loginPath: '/login',
  },

  nav: [
    { name: 'Modules', href: '#modules' },
    { name: 'Product', href: '#product' },
    { name: 'How it works', href: '#how' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Guides', href: '#guides' },
    { name: 'FAQ', href: '#faq' },
  ],

  hero: {
    badge: 'Built for construction SMEs in Pakistan & beyond',
    title: 'Run your whole construction business in one place',
    highlight: 'one place',
    subtitle:
      'Stop stitching together spreadsheets. ICONA unifies estimating, project control, labour, subcontractors, and the complete ledger into one ERP + CRM, priced for small and medium firms.',
    primaryCta: { label: 'Start now', href: 'signup' }, // 'signup' resolves to appUrl + signupPath
    secondaryCta: { label: 'Book a demo', href: '#contact' },
    footnote: 'Monthly plans from $25. Pay annually and get 2 months free.',
  },

  // Real product facts, not vanity numbers.
  stats: [
    { value: '7', label: 'connected modules' },
    { value: '2', label: 'platforms: web + mobile' },
    { value: '4', label: 'user roles with data rights' },
    { value: '1', label: 'ledger for the whole firm' },
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
      title: 'Finance & Ledger',
      description:
        'Record every transaction, compare budget against actuals, and see cash flow per project and across the company in one complete ledger.',
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
        'Daily labour logs, attendance sheets, salaries, and site-visit records captured from the field, not from memory.',
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

  // "Screenshots" section: CSS product mocks with captions (no real screenshots yet).
  product: {
    heading: 'See ICONA at work',
    subheading:
      'From the priced BOQ to the daily attendance sheet, every screen reads from the same live data.',
    captions: [
      {
        title: 'BOQ that adds itself up',
        text: 'Import from Excel, price line items, and watch rollups update through the whole hierarchy.',
      },
      {
        title: 'Budget vs actual, live',
        text: 'Every site expense lands against its project, so overruns show up in days, not at handover.',
      },
      {
        title: 'Attendance from the site',
        text: 'Supervisors mark labour on the mobile app; payroll and the ledger see it instantly.',
      },
    ],
  },

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
      title: 'Sign up & set up',
      description: 'Create your firm, add your team with the right roles, and import projects via Excel or templates.',
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

  billing: {
    annualMonthsFree: 2, // pay for 10 months, get 12
    note: 'Prices in USD. Local PKR billing available - talk to us.',
    limitNote:
      'Every plan has clear limits. When your firm reaches one, ICONA asks you to upgrade - you never pay for headroom you are not using.',
  },

  pricing: [
    {
      name: 'Starter',
      monthly: 25,
      tagline: 'For a single small firm getting organised',
      limits: ['5 active projects', '3 team members'],
      features: ['BOQ, project control & finance', 'Complete ledger & cash flow', 'Labour & attendance sheets', 'Email support'],
      cta: 'Start with Starter',
      ctaHref: 'signup',
      featured: false,
    },
    {
      name: 'Growth',
      monthly: 50,
      tagline: 'For growing contractors running multiple sites',
      limits: ['25 active projects', '15 team members'],
      features: [
        'All ERP modules + CRM',
        'Mobile app for field teams',
        'Subcontractor management',
        'Priority support & onboarding',
      ],
      cta: 'Start with Growth',
      ctaHref: 'signup',
      featured: true,
    },
    {
      name: 'Enterprise',
      monthly: 75,
      tagline: 'For established firms that need it all',
      limits: ['Unlimited projects', 'Unlimited team members'],
      features: ['Everything in Growth', 'Investor & lender registry', 'Custom onboarding & training', 'Dedicated support'],
      cta: 'Talk to us',
      ctaHref: '#contact',
      featured: false,
    },
  ],

  // TODO: replace with real, attributed testimonials (with permission) before launch.
  testimonials: [
    {
      quote:
        'We priced a full BOQ in an afternoon instead of a week, and the rollups just added up. No more broken spreadsheet formulas.',
      author: 'Project Director',
      role: 'Contracting firm, Lahore',
    },
    {
      quote:
        'For the first time our site attendance and subcontractor costs land in the same place as the budget. We catch overruns early now.',
      author: 'Operations Manager',
      role: 'Residential builder, Karachi',
    },
    {
      quote:
        'The mobile app means our supervisors log labour from the site itself. The head office finally sees reality, not last week.',
      author: 'Managing Partner',
      role: 'General contractor, Islamabad',
    },
  ],

  guides: {
    heading: 'Get productive in your first week',
    subheading: 'Short, practical walkthroughs. Ask for any of them in your demo, or follow along in the app.',
    items: [
      {
        icon: 'FileSpreadsheet',
        title: 'Import your first BOQ',
        minutes: 10,
        steps: ['Export your BOQ to Excel', 'Map columns in the import preview', 'Review rollups and publish'],
      },
      {
        icon: 'UserCheck',
        title: 'Set up labour & attendance',
        minutes: 15,
        steps: ['Add workers and daily rates', 'Give supervisors the mobile app', 'Mark the first attendance sheet'],
      },
      {
        icon: 'BookOpenCheck',
        title: 'Run your monthly ledger',
        minutes: 20,
        steps: ['Record income and expenses', 'Reconcile cash on hand', 'Read the budget-vs-actual report'],
      },
      {
        icon: 'ShieldCheck',
        title: 'Set roles & data rights',
        minutes: 10,
        steps: ['Invite admins, managers, employees', 'Scope clients to their projects', 'Check who sees finance data'],
      },
    ],
  },

  faq: [
    {
      q: 'How does the annual discount work?',
      a: 'Pay for 10 months up front and use ICONA for 12 - two months free on any plan. Monthly billing stays flexible: upgrade, downgrade, or cancel at the end of any month.',
    },
    {
      q: 'What happens when I reach my plan limit?',
      a: 'Nothing breaks and no data is lost. When you hit your plan’s project or member limit, ICONA prompts you to upgrade to the next tier before you can add more. You only pay more when your firm actually grows.',
    },
    {
      q: 'Can I pay in Pakistani Rupees?',
      a: 'Yes. Prices are listed in USD, and we support local PKR billing via bank transfer for firms in Pakistan. Contact us and we will set it up.',
    },
    {
      q: 'Who can see our financial data?',
      a: 'Only the roles you allow. ICONA has admin, manager, employee, and client roles - finance and ledger screens are visible only to roles you grant, and clients see only their own projects.',
    },
    {
      q: 'Do my site teams need laptops?',
      a: 'No. Supervisors and site engineers use the Android app for attendance, labour logs, site visits, and the BOQ - it works with patchy connectivity and syncs when back online.',
    },
    {
      q: 'How long does onboarding take?',
      a: 'Most firms are running their first project within a week: import a BOQ, add the team, and start logging from the site. Growth and Enterprise plans include guided onboarding.',
    },
  ],

  contact: {
    heading: 'Start today, or see it first',
    subheading:
      'Sign up and set up your firm in minutes, or tell us about your projects and we will walk you through ICONA on your own numbers.',
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
    blurb: 'ERP and CRM software for small and medium construction companies. One system for estimating, sites, staff, and the complete ledger.',
    year: YEAR,
  },
};

// Resolve a CTA href: 'signup' / 'login' map into the ERP app, anything else is a normal href.
export const resolveCta = (href) => {
  const { appUrl, signupPath, loginPath } = SITE_CONFIG.company;
  if (href === 'signup') return `${appUrl}${signupPath}`;
  if (href === 'login') return `${appUrl}${loginPath}`;
  return href;
};

// Annual = pay (12 - annualMonthsFree) months for a year.
export const annualPrice = (monthly) => monthly * (12 - SITE_CONFIG.billing.annualMonthsFree);
