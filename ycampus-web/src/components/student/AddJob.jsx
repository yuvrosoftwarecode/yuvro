import { useState } from "react";
import jobService from "@/services/jobService";


export default function AddJob() {
  const [form, setForm] = useState({
    title: "",
    company: "",
    salary: "",
    location: "",
    skills: "",
    experience_level: "",
    description: "",

  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
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

      <input name="title" onChange={handleChange} value={form.title} placeholder="Job Title" />
      <br />

      <input name="company" onChange={handleChange} value={form.company} placeholder="Company" />
      <br />

      <input name="salary" onChange={handleChange} value={form.salary} placeholder="Salary" />
      <br />

      <input name="location" onChange={handleChange} value={form.location} placeholder="Location" />
      <br />

      <input name="skills" onChange={handleChange} value={form.skills} placeholder="Skills" />
      <br />

      <input name="description" onChange={handleChange} value={form.description} placeholder="description" />
      <br />

       <input name="experience_level" onChange={handleChange} value={form.experience_level} placeholder="experience_level" />
      <br />

      <button type="submit">Submit1</button>
    </form>
  );
}
