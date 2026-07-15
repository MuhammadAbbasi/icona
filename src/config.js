// Partner logos loaded from static public paths to avoid WebAssembly squoosh build errors

export const SITE_CONFIG = {

  company: {
    name: "ICON Services",
    established: 1997,
    yearsOfExcellence: new Date().getFullYear() - 1997,
    pecCategory: "PEC Category C-4 Registered Contractor",
    tagline: "Building Excellence with Purpose",
    subTagline: "From visionary design to turnkey construction, we bring your most ambitious projects to life.",
  },
  images: {
    hero: "/assets/hero_architecture_premium.png",
    legacy: "/assets/NewTechArchitecturalDesign.jpeg",
  },
  contact: {
    phone: "+92 321 2379862",
    email: "muhammadabbasi.llm@gmail.com",
    address: "Office number 312, City Center, Shahrah Faisal, Karachi",
    // Paste your Formspree Form ID here (e.g. "mqkrpnye") to receive real emails.
    // If empty, the form will run in high-fidelity simulated mode.
    formspreeId: "xykojjow",
    socials: {
      linkedin: "https://linkedin.com/iconserviceskhi",
      instagram: "https://instagram.com/iconserviceskhi",
      facebook: "https://facebook.com/iconserviceskhi",
    }
  },
  navLinks: [
    { name: "About Us", href: "#about" },
    { name: "Our Services", href: "#services" },
    { name: "Our Projects", href: "#projects" },
    { name: "Contact Us", href: "#contact" },
  ],
  milestones: [
    { value: 29, suffix: "+", label: "Years of Experience" },
    { value: 500, suffix: "+", label: "Projects Completed" },
    { value: 100, suffix: "%", label: "Client Satisfaction" },
  ],
  services: [
    {
      id: "design",
      title: "Architectural Design",
      description: "Custom architectural and structural planning tailored to your visionary needs.",
      icon: "PenTool", // Represents a Lucide icon
    },
    {
      id: "construction",
      title: "Construction Management",
      description: "High-quality execution and robust site management ensuring precision at every step.",
      icon: "HardHat",
    },
    {
      id: "turnkey",
      title: "Turnkey Solutions",
      description: "Seamless, ready-to-use project delivery from the initial concept to the final keys.",
      icon: "Key",
    }
  ],
  projects: [
    {
      id: 1,
      title: "DHA City Farmhouse & Pool",
      category: "Residential",
      image: "/assets/extracted/image_p14_1.jpeg",
      location: "Karachi",
      description: "Exquisite farmhouse construction with standard luxury swimming pool in DHA City.",
      client: "DHA City Karachi"
    },
    {
      id: 2,
      title: "Bank Islami - Raju Khanani Branch",
      category: "Commercial",
      image: "/assets/extracted/image_p17_1.jpeg",
      location: "Sindh",
      description: "Full-scope commercial construction and premium branch interior layout.",
      client: "Bank Islami Pakistan"
    },
    {
      id: 3,
      title: "Bank Islami - Head Office (9th Floor)",
      category: "Commercial",
      image: "/assets/extracted/image_p21_1.jpeg",
      location: "Karachi",
      description: "High-end executive corporate interior design and execution proposal.",
      client: "Bank Islami Pakistan"
    },
    {
      id: 4,
      title: "Larkana Luxury Bungalow",
      category: "Residential",
      image: "/assets/extracted/image_p28_1.jpeg",
      location: "Larkana",
      description: "Modern architectural planning, design, and turnkey build of a premium bungalow.",
      client: "N.I.C. Group"
    },
    {
      id: 5,
      title: "Gwadar Coastal Bungalow",
      category: "Residential",
      image: "/assets/extracted/image_p32_7.jpeg",
      location: "Gwadar",
      description: "Elite architectural structure, construction, and full luxury furnishing.",
      client: "Private Client"
    },
    {
      id: 6,
      title: "DHA Phase 8 Bungalow Renovation",
      category: "Residential",
      image: "/assets/extracted/image_p34_1.jpeg",
      location: "Karachi",
      description: "Full structural renovation and elegant interior upgrade of a DHA Phase 8 bungalow.",
      client: "Private Investor"
    },
    {
      id: 7,
      title: "DOHS / Generals Society",
      category: "Residential",
      image: "/assets/extracted/image_p44_1.jpeg",
      location: "Karachi",
      description: "General contracting, construction, design & build with premium materials.",
      client: "DHA Karachi"
    },
    {
      id: 8,
      title: "Murtaza Flour Mills Head Office",
      category: "Commercial",
      image: "/assets/extracted/image_p40_1.jpeg",
      location: "Karachi",
      description: "Corporate office interior design and construction for Ashrafi Aata HQ.",
      client: "Murtaza Flour Mills"
    },
    {
      id: 9,
      title: "Maqbool & Co. Industrial Project",
      category: "Commercial",
      image: "/assets/extracted/image_p37_1.jpeg",
      location: "Karachi",
      description: "Heavy-duty commercial structure and robust infrastructure execution.",
      client: "Maqbool & Co."
    }
  ],
  cityFootprint: [
    {
      id: "karachi",
      cityName: "Karachi",
      projectCount: 80,
      x: 36, // south coast, matches printed 'Karachi' label
      y: 82,
      commercial: 10,
      residential: 70,
      highlights: [
        "Bank Islami Head Office Interior & Planning",
        "DHA Phase 8 Luxury Turnkey Bungalow",
        "Murtaza Flour Mills Executive HQ",
        "Maqbool & Co. Industrial Layout & Execution"
      ]
    },
    {
      id: "gwadar",
      cityName: "Gwadar",
      projectCount: 16,
      x: 15, // southwestern coastal point
      y: 80,
      commercial: 4,
      residential: 12,
      highlights: [
        "Gwadar Coastal Luxury Bungalow Construction",
        "Port-View Commercial Infrastructure Outposts"
      ]
    },
    {
      id: "hyderabad",
      cityName: "Hyderabad",
      projectCount: 8,
      x: 42, // inland Sindh, northeast of Karachi
      y: 78,
      commercial: 6,
      residential: 2,
      highlights: [
        "Bank Islami - Raju Khanani Branch Construction",
        "Sindh Agriculture University Complex Planning"
      ]
    },
    {
      id: "larkana",
      cityName: "Larkana",
      projectCount: 18,
      x: 40, // northern Sindh, along river veins
      y: 66,
      commercial: 4,
      residential: 14,
      highlights: [
        "Larkana Luxury Bungalow Engineering & Turnkey Build",
        "Northern Sindh Government Infrastructure & Layout"
      ]
    },
    {
      id: "lahore",
      cityName: "Lahore",
      projectCount: 5,
      x: 71, // Eastern Punjab bulge, matches printed 'Lahore' label
      y: 43.5,
      commercial: 2,
      residential: 3,
      highlights: [
        "Punjab Corporate Executive Offices Execution",
        "Model Town Residential Luxury Estates Design & Build"
      ]
    },
    {
      id: "islamabad",
      cityName: "Islamabad",
      projectCount: 12,
      x: 62.5, // Northern region, matches printed 'Islamabad' label
      y: 33.5,
      commercial: 4,
      residential: 8,
      highlights: [
        "Capital Commercial Hub Architectural Foundations",
        "Margalla Hills Premium Residential Estate Development"
      ]
    }
  ],
  processSteps: [
    { number: "01", title: "Discovery & Analysis", description: "We understand your vision and analyze site potential." },
    { number: "02", title: "Design & Strategy", description: "Our architects draft visionary blueprints and strategic plans." },
    { number: "03", title: "Construction & Execution", description: "We bring the design to life with unparalleled craftsmanship." },
    { number: "04", title: "Final Delivery", description: "A seamless handover of your completed, ready-to-use project." },
  ],
  testimonials: [
    {
      quote: "ICON Services transformed our conceptual ideas into a stunning corporate reality. Their turnkey approach saved us immense time.",
      author: "Irshad Ahmed Abbasi",
      designation: "Managing Director, NIC",
    },
    {
      quote: "The precision and architectural elegance of our new headquarters is unmatched. 29 years of legacy truly shows in their work.",
      author: "Suhail Ahmed",
      designation: "Executive Director, Adamjee Durabuilt",
    },
    {
      quote: "From discovery to final delivery, the team at ICON was professional, transparent, and absolutely brilliant.",
      author: "Farhan Khan",
      designation: "Project Lead, DHA City",
    }
  ],
  partners: [
    { name: "Bank Islami Pakistan", logo: "/assets/Bankislami-Logo.png", industry: "Banking Partner" },
    { name: "United Bank Limited (UBL)", logo: "/assets/UBL-Logo.svg", industry: "Banking Client" },
    { name: "Adamjee Durabuilt", logo: "/assets/Adamjee-logo.jpg", industry: "Corporate / Interior" },
    { name: "Murtaza Flour Mills", industry: "Industrial Client" },
    { name: "Maqbool & Co.", industry: "Infrastructure" },
    { name: "DHA City Karachi", logo: "/assets/DCK-LOGO.png", industry: "Residential Authority" }
  ]
};
