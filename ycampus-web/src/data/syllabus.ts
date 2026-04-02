// JNTUH Syllabus Data Structure

export interface SubTopic {
  id: string;
  title: string;
}

export interface Topic {
  id: string;
  title: string;
  children?: SubTopic[];
}

export interface SubjectSyllabus {
  [key: string]: Topic[];
}

export const syllabus: SubjectSyllabus = {
  "matrices-calculus": [
    {
      id: "unit1",
      title: "Unit I: Matrices",
      children: [
        { id: "1.1", title: "Rank of a Matrix" },
        { id: "1.2", title: "Echelon Form" },
        { id: "1.3", title: "Normal Form" },
        { id: "1.4", title: "Linear Equations - Consistency" },
        { id: "1.5", title: "Linear Transformations" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Calculus - Differentiation",
      children: [
        { id: "2.1", title: "Limit and Continuity" },
        { id: "2.2", title: "Differentiation" },
        { id: "2.3", title: "Successive Differentiation" },
        { id: "2.4", title: "Leibnitz's Theorem" },
        { id: "2.5", title: "Partial Derivatives" },
        { id: "2.6", title: "Euler's Theorem" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Calculus - Integration",
      children: [
        { id: "3.1", title: "Definite Integrals" },
        { id: "3.2", title: "Beta and Gamma Functions" },
        { id: "3.3", title: "Double Integrals" },
        { id: "3.4", title: "Change of Variables" },
        { id: "3.5", title: "Applications of Integration" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Differential Equations",
      children: [
        { id: "4.1", title: "First Order Differential Equations" },
        { id: "4.2", title: "Linear Differential Equations" },
        { id: "4.3", title: "Bernoulli's Equation" },
        { id: "4.4", title: "Second Order Differential Equations" },
        { id: "4.5", title: "Applications of Differential Equations" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Vector Calculus",
      children: [
        { id: "5.1", title: "Vector Differentiation" },
        { id: "5.2", title: "Gradient, Divergence, Curl" },
        { id: "5.3", title: "Directional Derivatives" },
        { id: "5.4", title: "Line Integrals" },
        { id: "5.5", title: "Green's Theorem" },
      ]
    },
  ],
  "physics": [
    {
      id: "unit1",
      title: "Unit I: Oscillations",
      children: [
        { id: "1.1", title: "Simple Harmonic Motion" },
        { id: "1.2", title: "Damped Oscillations" },
        { id: "1.3", title: "Forced Oscillations" },
        { id: "1.4", title: "Coupled Oscillations" },
        { id: "1.5", title: "Resonance" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Wave Optics",
      children: [
        { id: "2.1", title: "Interference" },
        { id: "2.2", title: "Young's Double Slit Experiment" },
        { id: "2.3", title: "Newton's Rings" },
        { id: "2.4", title: "Diffraction" },
        { id: "2.5", title: "Polarization" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Lasers and Fiber Optics",
      children: [
        { id: "3.1", title: "Characteristics of Lasers" },
        { id: "3.2", title: "Einstein's Coefficients" },
        { id: "3.3", title: "Types of Lasers" },
        { id: "3.4", title: "Optical Fibers" },
        { id: "3.5", title: "Applications of Lasers" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Quantum Mechanics",
      children: [
        { id: "4.1", title: "Wave-Particle Duality" },
        { id: "4.2", title: "Uncertainty Principle" },
        { id: "4.3", title: "Schrödinger Equation" },
        { id: "4.4", title: "Quantum Tunneling" },
        { id: "4.5", title: "Hydrogen Atom" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Semiconductors",
      children: [
        { id: "5.1", title: "Band Theory of Solids" },
        { id: "5.2", title: "Intrinsic Semiconductors" },
        { id: "5.3", title: "Extrinsic Semiconductors" },
        { id: "5.4", title: "P-N Junction Diode" },
        { id: "5.5", title: "Transistors" },
      ]
    },
  ],
  "chemistry": [
    {
      id: "unit1",
      title: "Unit I: Molecular Structure and Theories of Bonding",
      children: [
        { id: "1.1", title: "Ionic Bonding" },
        { id: "1.2", title: "Covalent Bonding" },
        { id: "1.3", title: "VSEPR Theory" },
        { id: "1.4", title: "Molecular Orbital Theory" },
        { id: "1.5", title: "Hybridization" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Polymers",
      children: [
        { id: "2.1", title: "Classification of Polymers" },
        { id: "2.2", title: "Polymerization Techniques" },
        { id: "2.3", title: "Properties of Polymers" },
        { id: "2.4", title: "Conducting Polymers" },
        { id: "2.5", title: "Biodegradable Polymers" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Water and its Treatment",
      children: [
        { id: "3.1", title: "Hardness of Water" },
        { id: "3.2", title: "Estimation of Hardness" },
        { id: "3.3", title: "Water Softening Methods" },
        { id: "3.4", title: "Boiler Troubles" },
        { id: "3.5", title: "Desalination" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Electrochemistry and Corrosion",
      children: [
        { id: "4.1", title: "Electrochemical Cells" },
        { id: "4.2", title: "Electrode Potential" },
        { id: "4.3", title: "Batteries" },
        { id: "4.4", title: "Corrosion Types" },
        { id: "4.5", title: "Corrosion Prevention" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Fuels and Combustion",
      children: [
        { id: "5.1", title: "Classification of Fuels" },
        { id: "5.2", title: "Calorific Value" },
        { id: "5.3", title: "Coal and Petroleum" },
        { id: "5.4", title: "Combustion of Fuels" },
        { id: "5.5", title: "Alternative Fuels" },
      ]
    },
  ],
  "english": [
    {
      id: "unit1",
      title: "Unit I: Reading Comprehension",
      children: [
        { id: "1.1", title: "Skimming and Scanning" },
        { id: "1.2", title: "Critical Reading" },
        { id: "1.3", title: "Inference Making" },
        { id: "1.4", title: "Summarizing" },
        { id: "1.5", title: "Note-taking" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Writing Skills",
      children: [
        { id: "2.1", title: "Essay Writing" },
        { id: "2.2", title: "Report Writing" },
        { id: "2.3", title: "Letter Writing" },
        { id: "2.4", title: "Resume Preparation" },
        { id: "2.5", title: "Email Etiquette" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Grammar and Usage",
      children: [
        { id: "3.1", title: "Parts of Speech" },
        { id: "3.2", title: "Tenses" },
        { id: "3.3", title: "Active and Passive Voice" },
        { id: "3.4", title: "Direct and Indirect Speech" },
        { id: "3.5", title: "Common Errors" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Presentation Skills",
      children: [
        { id: "4.1", title: "Public Speaking" },
        { id: "4.2", title: "Body Language" },
        { id: "4.3", title: "Visual Aids" },
        { id: "4.4", title: "Group Discussions" },
        { id: "4.5", title: "Interviews" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Vocabulary and Phonetics",
      children: [
        { id: "5.1", title: "Word Formation" },
        { id: "5.2", title: "Idioms and Phrases" },
        { id: "5.3", title: "Pronunciation" },
        { id: "5.4", title: "Stress and Intonation" },
        { id: "5.5", title: "Technical Vocabulary" },
      ]
    },
  ],
  "programming": [
    {
      id: "unit1",
      title: "Unit I: Introduction to C Programming",
      children: [
        { id: "1.1", title: "History of C" },
        { id: "1.2", title: "Structure of C Program" },
        { id: "1.3", title: "Data Types and Variables" },
        { id: "1.4", title: "Operators and Expressions" },
        { id: "1.5", title: "Input/Output Functions" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Control Structures",
      children: [
        { id: "2.1", title: "Decision Making - if, if-else" },
        { id: "2.2", title: "Switch Statement" },
        { id: "2.3", title: "Loops - for, while, do-while" },
        { id: "2.4", title: "Break and Continue" },
        { id: "2.5", title: "Nested Loops" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Arrays and Strings",
      children: [
        { id: "3.1", title: "One Dimensional Arrays" },
        { id: "3.2", title: "Multi-dimensional Arrays" },
        { id: "3.3", title: "String Operations" },
        { id: "3.4", title: "String Functions" },
        { id: "3.5", title: "Array of Strings" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Functions and Pointers",
      children: [
        { id: "4.1", title: "Function Definition and Declaration" },
        { id: "4.2", title: "Function Call and Return" },
        { id: "4.3", title: "Recursion" },
        { id: "4.4", title: "Pointers Basics" },
        { id: "4.5", title: "Pointers and Arrays" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Structures and File Handling",
      children: [
        { id: "5.1", title: "Structures and Unions" },
        { id: "5.2", title: "Array of Structures" },
        { id: "5.3", title: "File Operations" },
        { id: "5.4", title: "File Handling Functions" },
        { id: "5.5", title: "Dynamic Memory Allocation" },
      ]
    },
  ],
  "engineering-drawing": [
    {
      id: "unit1",
      title: "Unit I: Engineering Curves",
      children: [
        { id: "1.1", title: "Conic Sections" },
        { id: "1.2", title: "Ellipse Construction" },
        { id: "1.3", title: "Parabola Construction" },
        { id: "1.4", title: "Hyperbola Construction" },
        { id: "1.5", title: "Cycloidal Curves" },
      ]
    },
    {
      id: "unit2",
      title: "Unit II: Orthographic Projections",
      children: [
        { id: "2.1", title: "Principles of Projection" },
        { id: "2.2", title: "First Angle Projection" },
        { id: "2.3", title: "Third Angle Projection" },
        { id: "2.4", title: "Projection of Points" },
        { id: "2.5", title: "Projection of Lines" },
      ]
    },
    {
      id: "unit3",
      title: "Unit III: Projections of Planes",
      children: [
        { id: "3.1", title: "Planes in Different Positions" },
        { id: "3.2", title: "Traces of Planes" },
        { id: "3.3", title: "Perpendicular to Planes" },
        { id: "3.4", title: "Parallel to Planes" },
        { id: "3.5", title: "Angle between Planes" },
      ]
    },
    {
      id: "unit4",
      title: "Unit IV: Projections of Solids",
      children: [
        { id: "4.1", title: "Projections of Prisms" },
        { id: "4.2", title: "Projections of Pyramids" },
        { id: "4.3", title: "Projections of Cylinders" },
        { id: "4.4", title: "Projections of Cones" },
        { id: "4.5", title: "Sections of Solids" },
      ]
    },
    {
      id: "unit5",
      title: "Unit V: Isometric Projections",
      children: [
        { id: "5.1", title: "Isometric Scale" },
        { id: "5.2", title: "Isometric Views" },
        { id: "5.3", title: "Isometric of Simple Objects" },
        { id: "5.4", title: "Isometric of Complex Objects" },
        { id: "5.5", title: "Conversion of Views" },
      ]
    },
  ],
};
