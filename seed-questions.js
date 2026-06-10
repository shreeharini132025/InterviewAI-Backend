const db = require('./config/db');

const DEFAULT_QUESTIONS = [
  // Technical
  {
    category: 'technical',
    difficulty: 'easy',
    question_text: 'Explain the difference between == and === in JavaScript.',
    expected_keywords: 'type coercion,strict equality,loose equality',
    ideal_answer: '== performs type coercion before comparing values, while === compares both type and value without coercion. Prefer === for predictable comparisons.',
    time_limit: 120,
  },
  {
    category: 'technical',
    difficulty: 'easy',
    question_text: 'What is a REST API and what are common HTTP methods used in REST?',
    expected_keywords: 'resource,stateless,GET,POST,PUT,PATCH,DELETE',
    ideal_answer: 'REST is an architectural style that models data as resources accessed via URIs. It is stateless and uses HTTP methods like GET (read), POST (create), PUT/PATCH (update), and DELETE (remove).',
    time_limit: 150,
  },
  {
    category: 'technical',
    difficulty: 'medium',
    question_text: 'Explain what a database index is and when it helps (and hurts) performance.',
    expected_keywords: 'index,B-tree,lookup,write overhead,selectivity',
    ideal_answer: 'An index is a data structure (often a B-tree) that speeds up lookups and sorting by maintaining an ordered reference to rows. It improves read queries with good selectivity but adds overhead to inserts/updates/deletes and uses extra storage.',
    time_limit: 180,
  },
  {
    category: 'technical',
    difficulty: 'medium',
    question_text: 'What is the difference between authentication and authorization?',
    expected_keywords: 'identity,permissions,JWT,roles,access control',
    ideal_answer: 'Authentication verifies who a user is (identity). Authorization determines what the user can do (permissions/roles) after they are authenticated.',
    time_limit: 120,
  },
  {
    category: 'technical',
    difficulty: 'hard',
    question_text: 'Describe how you would design a scalable system for real-time chat (high level).',
    expected_keywords: 'WebSocket,message queue,scale,outbox,persistence,fanout',
    ideal_answer: 'Use WebSockets for real-time delivery, a stateless gateway tier behind a load balancer, persist messages in a database, and use a message broker/queue for fan-out and offline delivery. Partition by conversation/user and add caching and backpressure handling.',
    time_limit: 240,
  },
  {
    category: 'technical',
    difficulty: 'hard',
    question_text: 'What is Big-O notation and why is it useful?',
    expected_keywords: 'time complexity,space complexity,growth rate,asymptotic',
    ideal_answer: 'Big-O describes the asymptotic upper bound on growth of time/space with input size. It helps compare algorithms independent of hardware and constants, focusing on scalability.',
    time_limit: 150,
  },

  // HR
  {
    category: 'hr',
    difficulty: 'easy',
    question_text: 'Tell me about yourself.',
    expected_keywords: 'summary,experience,strengths,role',
    ideal_answer: 'Give a concise professional summary: present role, key strengths, relevant achievements, and why you are interested in this role.',
    time_limit: 120,
  },
  {
    category: 'hr',
    difficulty: 'medium',
    question_text: 'What are your strengths and weaknesses?',
    expected_keywords: 'strength,weakness,improvement,example',
    ideal_answer: 'Share 1-2 strengths with examples and 1 weakness along with concrete steps you are taking to improve.',
    time_limit: 150,
  },

  // Behavioral
  {
    category: 'behavioral',
    difficulty: 'medium',
    question_text: 'Describe a time you faced a conflict in a team and how you handled it.',
    expected_keywords: 'STAR,communication,collaboration,resolution',
    ideal_answer: 'Use STAR: explain the situation, your task, actions (listen, align on goal, propose options), and the result. Emphasize respectful communication and outcome.',
    time_limit: 180,
  },
];

async function seedQuestions() {
  try {
    const [[{ c }]] = await db.query('SELECT COUNT(*) AS c FROM questions');
    if (Number(c || 0) > 0) {
      console.log('Questions already exist; skipping seed.');
      process.exit(0);
    }

    console.log(`Seeding ${DEFAULT_QUESTIONS.length} default questions...`);

    for (const q of DEFAULT_QUESTIONS) {
      // eslint-disable-next-line no-await-in-loop
      await db.query(
        `INSERT INTO questions (category, difficulty, question_text, expected_keywords, ideal_answer, time_limit)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          q.category,
          q.difficulty,
          q.question_text,
          q.expected_keywords || '',
          q.ideal_answer || '',
          q.time_limit || 120,
        ]
      );
    }

    console.log('✅ Default questions inserted.');
  } catch (err) {
    console.error('❌ Failed to seed questions:', err);
  } finally {
    process.exit(0);
  }
}

seedQuestions();
