import { CompanyRecord } from './types';

export const initialCompanies: CompanyRecord[] = [
  {
    id: '1', companyName: 'TCS', companyType: 'Service', headcount: '500,000+', location: 'Mumbai',
    website: 'https://tcs.com', about: 'Tata Consultancy Services is an Indian multinational IT services and consulting company. Part of the Tata Group, TCS operates in 150+ locations across 46 countries.',
    hiringFocus: 'Full-stack development, Cloud computing, Data Science',
    rolesOffered: ['Software Engineer', 'Data Analyst', 'Cloud Architect', 'Business Analyst'],
    recruiterName: 'Priya Sharma', recruiterEmail: 'priya.sharma@tcs.com', recruiterDesignation: 'HR Manager',
    status: 'connected', chatMessages: [
      { id: 'm1', sender: 'placement_officer', text: 'Hi Priya, we would like to invite TCS for campus placement this year.', timestamp: '2026-03-18 10:00' },
      { id: 'm2', sender: 'recruiter', text: 'Sure! We are interested. Please share the student data.', timestamp: '2026-03-18 10:30' },
    ]
  },
  {
    id: '2', companyName: 'Infosys', companyType: 'Service', headcount: '300,000+', location: 'Bengaluru',
    website: 'https://infosys.com', about: 'Infosys Limited is an Indian multinational corporation that provides business consulting, IT and outsourcing services.',
    hiringFocus: 'Java Development, SAP, AI/ML',
    rolesOffered: ['Systems Engineer', 'Senior Software Engineer', 'Technology Analyst'],
    recruiterName: 'Rahul Verma', recruiterEmail: 'rahul.v@infosys.com', recruiterDesignation: 'Campus Lead',
    status: 'connected', chatMessages: [
      { id: 'm3', sender: 'placement_officer', text: 'Hello Rahul, would Infosys be interested in our campus drive?', timestamp: '2026-03-17 09:00' },
      { id: 'm4', sender: 'recruiter', text: 'Yes, let us schedule a call to discuss details.', timestamp: '2026-03-17 11:00' },
    ]
  },
  {
    id: '3', companyName: 'Wipro', companyType: 'Service', headcount: '250,000+', location: 'Bengaluru',
    website: 'https://wipro.com', about: 'Wipro Limited is an Indian multinational corporation providing IT, consulting and business process services.',
    hiringFocus: 'Full-stack, DevOps, Testing',
    rolesOffered: ['Project Engineer', 'Software Developer', 'QA Engineer'],
    recruiterName: 'Sneha Gupta', recruiterEmail: 'sneha.g@wipro.com', recruiterDesignation: 'Talent Acquisition',
    status: 'applied', chatMessages: []
  },
  {
    id: '4', companyName: 'Zoho', companyType: 'Product', headcount: '15,000+', location: 'Chennai',
    website: 'https://zoho.com', about: 'Zoho Corporation is an Indian multinational technology company known for its suite of online productivity tools and SaaS applications.',
    hiringFocus: 'Product Engineering, Mobile Development',
    rolesOffered: ['Member Technical Staff', 'UI Developer', 'Backend Engineer'],
    recruiterName: 'Karthik R', recruiterEmail: 'karthik@zoho.com', recruiterDesignation: 'HR Head',
    status: 'not_connected', chatMessages: []
  },
  {
    id: '5', companyName: 'Freshworks', companyType: 'Product', headcount: '5,000+', location: 'Chennai',
    website: 'https://freshworks.com', about: 'Freshworks Inc. is a SaaS company providing business software solutions including CRM, helpdesk and IT service management.',
    hiringFocus: 'SaaS Product Development, Customer Success Engineering',
    rolesOffered: ['Software Development Engineer', 'Product Analyst', 'SRE'],
    recruiterName: 'Anita Desai', recruiterEmail: 'anita@freshworks.com', recruiterDesignation: 'University Relations',
    status: 'not_connected', chatMessages: []
  },
  {
    id: '6', companyName: 'Razorpay', companyType: 'Startup', headcount: '3,000+', location: 'Bengaluru',
    website: 'https://razorpay.com', about: 'Razorpay is an Indian fintech company providing payment gateway solutions for online merchants in India.',
    hiringFocus: 'Fintech, Payments Infrastructure, Security',
    rolesOffered: ['Backend Engineer', 'Frontend Engineer', 'DevOps Engineer'],
    recruiterName: 'Vikram Singh', recruiterEmail: 'vikram@razorpay.com', recruiterDesignation: 'People Ops',
    status: 'connected', chatMessages: [
      { id: 'm5', sender: 'placement_officer', text: 'Hi Vikram, interested in hosting a drive?', timestamp: '2026-03-15 14:00' },
      { id: 'm6', sender: 'recruiter', text: 'Yes, but for Q3. Can we talk about requirements?', timestamp: '2026-03-15 16:30' },
      { id: 'm7', sender: 'placement_officer', text: 'Great, sharing the proposal document.', timestamp: '2026-03-16 09:00' },
    ]
  },
  {
    id: '7', companyName: 'Accenture', companyType: 'Service', headcount: '700,000+', location: 'Hyderabad',
    website: 'https://accenture.com', about: 'Accenture is a global professional services company providing strategy, consulting, digital, technology and operations services.',
    hiringFocus: 'Consulting, Digital Transformation, Cloud',
    rolesOffered: ['Associate Software Engineer', 'Analyst', 'Consultant'],
    recruiterName: 'Meera Nair', recruiterEmail: 'meera@accenture.com', recruiterDesignation: 'Campus Hiring',
    status: 'not_connected', chatMessages: []
  },
  {
    id: '8', companyName: 'Swiggy', companyType: 'Startup', headcount: '6,000+', location: 'Bengaluru',
    website: 'https://swiggy.com', about: 'Swiggy is an Indian online food ordering and delivery platform, also offering grocery delivery and other services.',
    hiringFocus: 'Logistics Tech, ML, Mobile Apps',
    rolesOffered: ['SDE-1', 'Data Scientist', 'Product Manager'],
    recruiterName: 'Deepak Kumar', recruiterEmail: 'deepak@swiggy.com', recruiterDesignation: 'TA Manager',
    status: 'applied', chatMessages: []
  },
];
