import React, { useState } from "react";
import jobService, { CreateJobData } from "@/services/jobService";

interface JobForm extends CreateJobData {
  // Additional form-specific properties can be added here if needed
}

export default function AddJob() {
  const [form, setForm] = useState<JobForm>({
    company_id: "",
    title: "",
    description: "",
    employment_type: "full-time",
    experience_min_years: 0,
    locations: [],
    is_remote: false,
    min_salary: 0,
    max_salary: 0,
    currency: "INR",
    skills: [],
    notice_period: 0,
    education_level: "any",
    status: "draft",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm({ ...form, [name]: type === 'number' ? Number(value) : value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await jobService.createJob(form);
      alert("Job saved to database!");
    } catch (err) {
      alert("Error saving job!");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
      <h1>Add Job</h1>

      <input name="company_id" onChange={handleChange} value={form.company_id} placeholder="Company ID" />
      <br />

      <input name="title" onChange={handleChange} value={form.title} placeholder="Job Title" />
      <br />

      <input name="description" onChange={handleChange} value={form.description} placeholder="Description" />
      <br />

      <select name="employment_type" onChange={handleChange} value={form.employment_type}>
        <option value="full-time">Full Time</option>
        <option value="part-time">Part Time</option>
        <option value="contract">Contract</option>
        <option value="internship">Internship</option>
      </select>
      <br />

      <input name="experience_min_years" type="number" onChange={handleChange} value={form.experience_min_years} placeholder="Min Experience (years)" />
      <br />

      <input name="min_salary" type="number" onChange={handleChange} value={form.min_salary} placeholder="Min Salary" />
      <br />

      <input name="max_salary" type="number" onChange={handleChange} value={form.max_salary} placeholder="Max Salary" />
      <br />

      <button type="submit">Submit</button>
    </form>
  );
}