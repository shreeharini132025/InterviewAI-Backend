-- Smart Interview Platform schema

-- Tables

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('candidate', 'admin') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('hr', 'technical', 'behavioral') NOT NULL,
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
  question_text TEXT NOT NULL,
  expected_keywords TEXT,
  ideal_answer TEXT,
  time_limit INT NOT NULL DEFAULT 120,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_questions_category (category),
  KEY idx_questions_difficulty (difficulty)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interview_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interview_type ENUM('hr', 'technical', 'behavioral') NOT NULL,
  status ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  total_score DECIMAL(5,2) NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_status (status),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  answer_text TEXT,
  score DECIMAL(5,2) NOT NULL DEFAULT 0,
  feedback TEXT,
  keywords_matched TEXT,
  time_taken INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_answers_session (session_id),
  KEY idx_answers_question (question_id),
  CONSTRAINT fk_answers_session
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  overall_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  communication_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  technical_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  clarity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  strengths TEXT,
  weaknesses TEXT,
  recommendations TEXT,
  detailed_feedback TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_evaluations_session (session_id),
  CONSTRAINT fk_evaluations_session
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
