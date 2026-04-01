import { PlacementJob } from '../hooks/usePlacement';

export const MOCK_PLACEMENT_JOBS: PlacementJob[] = [
    {
        "id": "67faafc5-a02c-4c7c-b38d-45038de87c7d",
        "recruiter_id": "545030ec-05a9-4644-8caa-d275ba380a4f",
        "role_title": "Systems Engineer",
        "role_description": "Backend development",
        "skills_required": [
            "Python",
            "Django",
            "SQL"
        ],
        "ctc_fixed": 450000,
        "ctc_variable": 50000,
        "ctc_total": 500000,
        "location": "Pune",
        "bond_details": null,
        "selection_rounds": [
            "Online Test",
            "Interview"
        ],
        "vacancies": 20,
        "eligible_branches": [
            "CSE",
            "IT",
            "ECE",
            "EEE"
        ],
        "eligible_years": [
            3,
            4
        ],
        "min_cgpa": 6.5,
        "deadline": "2026-03-04T14:00:12.987534+00:00",
        "posted_date": "2026-02-12T14:00:12.987534+00:00",
        "status": "approved",
        "rejection_reason": null,
        "hold_remarks": null,
        "ai_risk_level": "low",
        "total_applications": 78,
        "shortlisted_count": 25,
        "selected_count": 8,
        "created_at": "2026-02-12T14:00:12.987534+00:00",
        "updated_at": "2026-02-12T14:00:12.987534+00:00",
        "job_type": "full_time" as any,
        "recruiter": {
            "id": "545030ec-05a9-4644-8caa-d275ba380a4f",
            "name": "Priya Patel",
            "email": "priya@infosys.com",
            "phone": "+91 98765 43211",
            "rating": 3.8,
            "created_at": "2026-02-12T13:59:40.461739+00:00",
            "updated_at": "2026-02-12T13:59:40.461739+00:00",
            "designation": "Campus Lead",
            "is_verified": true,
            "trust_score": 78,
            "company_name": "Infosys",
            "linkedin_url": null,
            "company_website": "https://infosys.com",
            "company_industry": "IT Services",
            "company_location": "Bangalore",
            "company_logo_url": null
        }
    },
    {
        "id": "0c1144e8-8f1d-4228-bc8f-60057327fe9f",
        "recruiter_id": "ad4c2ecf-c154-4d4e-bc9b-766e191b1810",
        "role_title": "Junior Developer",
        "role_description": "Web development role",
        "skills_required": [
            "JavaScript",
            "Node.js"
        ],
        "ctc_fixed": 400000,
        "ctc_variable": 50000,
        "ctc_total": 450000,
        "location": "Hyderabad",
        "bond_details": "1 year bond",
        "selection_rounds": [
            "Aptitude",
            "Technical"
        ],
        "vacancies": 25,
        "eligible_branches": [
            "CSE",
            "IT",
            "ECE",
            "ME",
            "CE",
            "EEE"
        ],
        "eligible_years": [
            3,
            4
        ],
        "min_cgpa": 6.0,
        "deadline": "2026-03-09T14:00:12.987534+00:00",
        "posted_date": "2026-02-12T14:00:12.987534+00:00",
        "status": "approved",
        "rejection_reason": null,
        "hold_remarks": null,
        "ai_risk_level": "medium",
        "total_applications": 55,
        "shortlisted_count": 18,
        "selected_count": 5,
        "created_at": "2026-02-12T14:00:12.987534+00:00",
        "updated_at": "2026-02-12T14:00:12.987534+00:00",
        "job_type": "full_time" as any,
        "recruiter": {
            "id": "ad4c2ecf-c154-4d4e-bc9b-766e191b1810",
            "name": "Amit Kumar",
            "email": "amit@wipro.com",
            "phone": "+91 98765 43212",
            "rating": 3.5,
            "created_at": "2026-02-12T13:59:40.461739+00:00",
            "updated_at": "2026-02-12T13:59:40.461739+00:00",
            "designation": "Recruiter",
            "is_verified": false,
            "trust_score": 65,
            "company_name": "Wipro",
            "linkedin_url": null,
            "company_website": "https://wipro.com",
            "company_industry": "IT Services",
            "company_location": "Hyderabad",
            "company_logo_url": null
        }
    },
    {
        "id": "dececb49-1b49-481a-a14c-69ed66166818",
        "recruiter_id": "a204b864-ea6a-4c61-9b82-e7efeeccd12f",
        "role_title": "Software Engineer",
        "role_description": "Full stack development role",
        "skills_required": [
            "Java",
            "Spring",
            "React"
        ],
        "ctc_fixed": 500000,
        "ctc_variable": 100000,
        "ctc_total": 600000,
        "location": "Mumbai",
        "bond_details": "2 year bond",
        "selection_rounds": [
            "Aptitude",
            "Technical",
            "HR"
        ],
        "vacancies": 15,
        "eligible_branches": [
            "CSE",
            "IT",
            "ECE"
        ],
        "eligible_years": [
            3,
            4
        ],
        "min_cgpa": 7.0,
        "deadline": "2026-03-14T14:00:12.987534+00:00",
        "posted_date": "2026-02-12T14:00:12.987534+00:00",
        "status": "approved",
        "rejection_reason": null,
        "hold_remarks": null,
        "ai_risk_level": "low",
        "total_applications": 45,
        "shortlisted_count": 12,
        "selected_count": 0,
        "created_at": "2026-02-12T14:00:12.987534+00:00",
        "updated_at": "2026-02-12T16:55:07.592911+00:00",
        "job_type": "full_time" as any,
        "recruiter": {
            "id": "a204b864-ea6a-4c61-9b82-e7efeeccd12f",
            "name": "Rahul Sharma",
            "email": "rahul@tcs.com",
            "phone": "+91 98765 43210",
            "rating": 4.2,
            "created_at": "2026-02-12T13:59:40.461739+00:00",
            "updated_at": "2026-02-12T13:59:40.461739+00:00",
            "designation": "HR Manager",
            "is_verified": true,
            "trust_score": 85,
            "company_name": "TCS",
            "linkedin_url": null,
            "company_website": "https://tcs.com",
            "company_industry": "IT Services",
            "company_location": "Mumbai",
            "company_logo_url": null
        }
    },
    {
        "id": "fd29dffb-da8b-48c7-9c30-7e1b260ba993",
        "recruiter_id": "50416ee0-4563-46a9-a19a-140e0c919fc5",
        "role_title": "SDE Intern",
        "role_description": "Software Development Engineer",
        "skills_required": [
            "DSA",
            "System Design",
            "Problem Solving"
        ],
        "ctc_fixed": 1800000,
        "ctc_variable": 200000,
        "ctc_total": 2000000,
        "location": "Bangalore",
        "bond_details": null,
        "selection_rounds": [
            "Coding",
            "System Design",
            "Behavioral"
        ],
        "vacancies": 5,
        "eligible_branches": [
            "CSE",
            "IT"
        ],
        "eligible_years": [
            3,
            4
        ],
        "min_cgpa": 8.0,
        "deadline": "2026-02-27T14:00:12.987534+00:00",
        "posted_date": "2026-02-12T14:00:12.987534+00:00",
        "status": "approved",
        "rejection_reason": null,
        "hold_remarks": null,
        "ai_risk_level": "low",
        "total_applications": 120,
        "shortlisted_count": 30,
        "selected_count": 0,
        "created_at": "2026-02-12T14:00:12.987534+00:00",
        "updated_at": "2026-02-12T16:56:40.102301+00:00",
        "job_type": "full_time" as any,
        "recruiter": {
            "id": "50416ee0-4563-46a9-a19a-140e0c919fc5",
            "name": "Sarah Johnson",
            "email": "sarah@google.com",
            "phone": "+91 98765 43213",
            "rating": 4.9,
            "created_at": "2026-02-12T13:59:40.461739+00:00",
            "updated_at": "2026-02-12T13:59:40.461739+00:00",
            "designation": "Talent Acquisition",
            "is_verified": true,
            "trust_score": 95,
            "company_name": "Google",
            "linkedin_url": null,
            "company_website": "https://google.com",
            "company_industry": "Technology",
            "company_location": "Bangalore",
            "company_logo_url": null
        }
    },
    {
        "id": "77a366f9-cd82-4625-86c6-9341e7b56213",
        "recruiter_id": "2df4000d-e5e3-49e0-8b1b-10664d98a08a",
        "role_title": "Full Stack Developer",
        "role_description": "Startup role with equity",
        "skills_required": [
            "React",
            "Node.js",
            "MongoDB"
        ],
        "ctc_fixed": 600000,
        "ctc_variable": 200000,
        "ctc_total": 800000,
        "location": "Delhi",
        "bond_details": null,
        "selection_rounds": [
            "Coding",
            "Culture Fit"
        ],
        "vacancies": 3,
        "eligible_branches": [
            "CSE",
            "IT"
        ],
        "eligible_years": [
            3,
            4
        ],
        "min_cgpa": 7.5,
        "deadline": "2026-02-22T14:00:12.987534+00:00",
        "posted_date": "2026-02-12T14:00:12.987534+00:00",
        "status": "approved",
        "rejection_reason": null,
        "hold_remarks": null,
        "ai_risk_level": "high",
        "total_applications": 12,
        "shortlisted_count": 0,
        "selected_count": 0,
        "created_at": "2026-02-12T14:00:12.987534+00:00",
        "updated_at": "2026-02-20T09:08:51.666981+00:00",
        "job_type": "full_time" as any,
        "recruiter": {
            "id": "2df4000d-e5e3-49e0-8b1b-10664d98a08a",
            "name": "Deepak Verma",
            "email": "deepak@startup.com",
            "phone": "+91 98765 43214",
            "rating": 2.1,
            "created_at": "2026-02-12T13:59:40.461739+00:00",
            "updated_at": "2026-02-12T13:59:40.461739+00:00",
            "designation": "HR Executive",
            "is_verified": false,
            "trust_score": 35,
            "company_name": "TechStartup Inc",
            "linkedin_url": null,
            "company_website": "https://techstartup.com",
            "company_industry": "Fintech",
            "company_location": "Delhi",
            "company_logo_url": null
        }
    }
];

export const MOCK_STUDENT_APPLICATIONS = [
    { id: '1', student_name: 'Rahul Sharma', student_id: 'CS2021001', branch: 'CSE', cgpa: 8.5, previous_offer: false, highest_ctc: 0, pi: 79, ps: 93, pri: 86 },
    { id: '2', student_name: 'Priya Patel', student_id: 'CS2021002', branch: 'CSE', cgpa: 9.1, previous_offer: true, highest_ctc: 600000, pi: 88, ps: 92, pri: 90 },
    { id: '3', student_name: 'Amit Kumar', student_id: 'EC2021003', branch: 'ECE', cgpa: 7.8, previous_offer: false, highest_ctc: 0, pi: 55, ps: 60, pri: 58 },
    { id: '4', student_name: 'Sneha Reddy', student_id: 'CS2021004', branch: 'CSE', cgpa: 8.9, previous_offer: true, highest_ctc: 800000, pi: 92, ps: 85, pri: 89 },
    { id: '5', student_name: 'Vikram Singh', student_id: 'ME2021005', branch: 'MECH', cgpa: 7.2, previous_offer: false, highest_ctc: 0, pi: 90, ps: 80, pri: 85 },
    { id: '6', student_name: 'Ananya Gupta', student_id: 'CS2021006', branch: 'CSE', cgpa: 9.4, previous_offer: true, highest_ctc: 1200000, pi: 95, ps: 96, pri: 96 },
    { id: '7', student_name: 'Karthik Nair', student_id: 'IT2021007', branch: 'IT', cgpa: 8.0, previous_offer: true, highest_ctc: 550000, pi: 79, ps: 93, pri: 86 },
    { id: '8', student_name: 'Divya Menon', student_id: 'CS2021008', branch: 'CSE', cgpa: 8.7, previous_offer: false, highest_ctc: 0, pi: 82, ps: 85, pri: 84 },
    { id: '9', student_name: 'Rohan Das', student_id: 'EC2021009', branch: 'ECE', cgpa: 7.5, previous_offer: false, highest_ctc: 0, pi: 60, ps: 62, pri: 61 },
    { id: '10', student_name: 'Meera Joshi', student_id: 'CS2021010', branch: 'CSE', cgpa: 9.2, previous_offer: true, highest_ctc: 1000000, pi: 94, ps: 90, pri: 92 },
    { id: '11', student_name: 'Arjun Rao', student_id: 'IT2021011', branch: 'IT', cgpa: 8.3, previous_offer: false, highest_ctc: 0, pi: 89, ps: 83, pri: 86 },
    { id: '12', student_name: 'Pooja Iyer', student_id: 'CS2021012', branch: 'CSE', cgpa: 8.1, previous_offer: true, highest_ctc: 700000, pi: 62, ps: 65, pri: 64 },
    { id: '13', student_name: 'Siddharth Verma', student_id: 'ME2021013', branch: 'MECH', cgpa: 7.0, previous_offer: false, highest_ctc: 0, pi: 58, ps: 60, pri: 59 },
    { id: '14', student_name: 'Kavya Bhatt', student_id: 'CS2021014', branch: 'CSE', cgpa: 9.0, previous_offer: true, highest_ctc: 350000, pi: 94, ps: 78, pri: 86 },
    { id: '15', student_name: 'Nikhil Saxena', student_id: 'EC2021015', branch: 'ECE', cgpa: 7.9, previous_offer: false, highest_ctc: 0, pi: 65, ps: 62, pri: 63 },
];
