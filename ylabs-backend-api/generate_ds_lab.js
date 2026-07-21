const fs = require('fs');
const path = require('path');

const YCODE_TOPICS_DIR = path.join(__dirname, '../ycode-backend-api/course/fixtures/dev/data_structures/topics');
const YLABS_LAB_DIR = path.join(__dirname, 'lab/fixtures/dev/data_structures_lab');
const YLABS_SPRINTS_DIR = path.join(YLABS_LAB_DIR, 'sprints');

// Ensure output directories exist
if (!fs.existsSync(YLABS_LAB_DIR)) {
  fs.mkdirSync(YLABS_LAB_DIR, { recursive: true });
}
if (!fs.existsSync(YLABS_SPRINTS_DIR)) {
  fs.mkdirSync(YLABS_SPRINTS_DIR, { recursive: true });
}

// 1. Generate lab.json
const labData = {
  labs: [
    {
      title: "Data Structures Lab",
      type: "ALGO",
      description: "Master Data Structures by solving essential algorithmic challenges. Learn Arrays, Strings, Linked Lists, Trees, Graphs and more.",
      difficulty: "ADVANCED",
      icon: "Algorithm"
    }
  ]
};
fs.writeFileSync(path.join(YLABS_LAB_DIR, 'lab.json'), JSON.stringify(labData, null, 2));
console.log('Created lab.json');

// 2. Process each topic file to generate sprints
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const files = fs.readdirSync(YCODE_TOPICS_DIR).filter(f => f.endsWith('.json'));

let sprintIndex = 1;

for (const file of files) {
  const filePath = path.join(YCODE_TOPICS_DIR, file);
  const topicData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const sprintTitle = `Sprint ${sprintIndex} — ${topicData.name}`;
  const sprintDescription = `Master ${topicData.name} through hand-picked algorithmic challenges.`;
  
  // Extract 5-7 coding questions
  const codingQuestions = (topicData.questions || []).filter(q => q.type === 'coding');
  
  if (codingQuestions.length === 0) {
    console.warn(`No coding questions found in ${file}. Skipping.`);
    continue;
  }
  
  const selectedQuestions = codingQuestions.slice(0, 7); // Max 7 questions
  
  let xpPool = 0;
  const tickets = selectedQuestions.map((q, qIndex) => {
    let description = q.content;
    if (q.inputFormat) description += `\n\n**Input Format:**\n${q.inputFormat}`;
    if (q.outputFormat) description += `\n\n**Output Format:**\n${q.outputFormat}`;
    if (q.examples && q.examples.length > 0) {
      description += `\n\n**Examples:**\n`;
      q.examples.forEach((ex, exIdx) => {
        description += `*Example ${exIdx + 1}:*\nInput:\n\`\`\`\n${ex.input}\n\`\`\`\nOutput:\n\`\`\`\n${ex.expected_output}\n\`\`\`\n`;
        if (ex.explanation) description += `Explanation: ${ex.explanation}\n`;
      });
    }

    const testCasesBasic = q.test_cases_basic || [];
    const testCasesAdvanced = q.test_cases_advanced || [];
    const allTestCases = [...testCasesBasic, ...testCasesAdvanced];
    
    const tasks = allTestCases.map((tc, tcIdx) => ({
      title: `Test Case ${tcIdx + 1}${tcIdx >= testCasesBasic.length ? ' (Hidden/Advanced)' : ''}`,
      task_slug: `task-${slugify(q.title)}-${tcIdx + 1}`,
      description: `Validate your code against test case ${tcIdx + 1}.`,
      points: tc.weight || 10,
      input: tc.input,
      expected_output: tc.expected_output,
      order_index: tcIdx + 1
    }));
    
    const xpReward = q.marks ? q.marks * 20 : 100;
    xpPool += xpReward;
    
    let rawSlug = `ticket-${slugify(q.title)}`;
    if (rawSlug.length > 32) {
      rawSlug = rawSlug.substring(0, 32);
      // Remove any trailing dash that might have been left from substring
      rawSlug = rawSlug.replace(/-+$/, '');
    }

    return {
      title: `Ticket ${qIndex + 1} — ${q.title}`,
      ticket_slug: rawSlug,
      description: description,
      xp_reward: xpReward,
      ticket_type: "algo",
      difficulty: q.difficulty ? q.difficulty.toUpperCase() : "MEDIUM",
      order_index: qIndex + 1,
      tasks: tasks
    };
  });
  
  const sprintData = {
    title: sprintTitle,
    description: sprintDescription,
    xp_pool: xpPool,
    tickets: tickets
  };
  
  const sprintFileName = `sprint_${sprintIndex}.json`;
  fs.writeFileSync(path.join(YLABS_SPRINTS_DIR, sprintFileName), JSON.stringify(sprintData, null, 2));
  console.log(`Created ${sprintFileName} for ${topicData.name} with ${tickets.length} tickets and ${tickets.reduce((sum, t) => sum + t.tasks.length, 0)} test case tasks.`);
  
  sprintIndex++;
}

console.log('Finished generating Data Structures lab.');
