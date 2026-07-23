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
    { name: 'How it works', href: '#how' },
    { name: 'Why teams switch', href: '#why' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Guides', href: '#guides' },
    { name: 'FAQ', href: '#faq' },
  ],

  hero: {
    badge: 'The all-in-one portal for construction SMEs',
    title: 'Build your vision. Manage the reality.',
    highlight: 'Manage the reality.',
    subtitle:
      'One unified portal for your whole construction firm: Kanban workflows, project tracking, the complete ledger, and a client portal - on web and on site.',
    primaryCta: { label: 'Get Started', href: 'signup' }, // 'signup' resolves to appUrl + signupPath
    secondaryCta: { label: 'Book a demo', href: '#contact' },
    footnote: 'Monthly plans from $25. Pay annually and get 2 months free.',
    scrollHint: 'Scroll to open',
  },

  // Four umbrella modules (zigzag layout); each absorbs the underlying ERP areas.
  modules: [
    {
      icon: 'Workflow',
      title: 'Workflow Management',
      description:
        'Run every project on a Kanban board your whole team understands - from first enquiry to handover, with roles and approvals built in.',
      features: ['Kanban project board with custom columns', 'Admin / manager / employee / client roles', 'Salary runs with approval flows', 'Teams and assignments'],
      snapshot: 'kanban',
    },
    {
      icon: 'HardHat',
      title: 'Project Tracking',
      description:
        'The BOQ is the backbone: import it from Excel, track quantities and revisions, and watch progress roll up from the site to the summary.',
      features: ['BOQ & estimation with automatic rollups', 'Revisions / variation orders, never lost', 'Site attendance, labour logs & photos', 'Value-weighted progress tracking'],
      snapshot: 'boq',
    },
    {
      icon: 'Wallet',
      title: 'Financial Management',
      description:
        'A complete double-entry ledger under every project: budget vs actual, cash position, loans and investor funding - live, not month-end.',
      features: ['Complete ledger & cash flow', 'Budget vs actual per project', 'Overheads, salaries & vendor payments', 'Investors, lenders & loan tracking'],
      snapshot: 'budget',
    },
    {
      icon: 'Users',
      title: 'Client Collaboration Portal',
      description:
        'Give every client their own login: they see their projects, progress, and documents - and nothing else. No more status-call Fridays.',
      features: ['Scoped client logins per company', 'Live progress & BOQ visibility', 'Proposals, enquiries & shared documents', 'Read-only exports in the original layout'],
      snapshot: 'client',
    },
  ],

  // The user journey: win the bid -> run the board -> bill the client.
  how: [
    {
      step: '01',
      title: 'Win the bid',
      description:
        'Import the BOQ from Excel, price every line, and send a proposal you can defend - rollups add themselves up.',
      snapshot: 'boq',
    },
    {
      step: '02',
      title: 'Organize the board',
      description:
        'The project lands on the Kanban board. Site teams log attendance, photos, and progress from the mobile app.',
      snapshot: 'kanban',
    },
    {
      step: '03',
      title: 'Bill the client',
      description:
        'Every expense already sits on the ledger. Track budget vs actual live and invoice from real numbers, not memory.',
      snapshot: 'budget',
    },
  ],

  whySwitch: {
    heading: 'Why teams switch to ICONA',
    subheading: 'Construction firms do not fail at building. They fail at fragmented paperwork.',
    pains: [
      'Estimates in Excel, actuals in WhatsApp, invoices in a drawer',
      'Nobody knows today’s real cash position',
      'Progress reported from memory at Friday meetings',
      'Client calls interrupting the site all week',
    ],
    gains: [
      'One chain from BOQ to ledger - nothing falls between tools',
      'Live cash position and budget vs actual on every project',
      'Progress rolls up from site logs, not opinions',
      'Clients check their own portal instead of calling you',
    ],
  },

  billing: {
    annualMonthsFree: 2, // pay for 10 months, get 12
    note: 'Prices in USD & localized PKR equivalent available.',
    limitNote:
      'Every plan has clear limits. When your firm reaches one, ICONA asks you to upgrade - you never pay for headroom you are not using.',
  },

  pricing: [
    {
      name: 'Starter',
      monthly: 25,
      monthlyPkr: '9,999',
      annualPkr: '99,990',
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
      monthlyPkr: '14,999',
      annualPkr: '1,49,990',
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
      monthly: null,
      customPricingLabel: 'Contact Sales for Custom Pricing',
      tagline: 'For established firms that need custom configuration & dedicated support',
      limits: ['Unlimited projects', 'Unlimited team members'],
      features: [
        'Everything in Growth',
        'Free ICONA AI Copilot included ($10/mo value)',
        'Investor & lender registry',
        'Custom onboarding & dedicated support',
      ],
      cta: 'Contact Sales',
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
