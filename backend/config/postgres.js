// PostgreSQL Configuration for Document Storage
const { Pool } = require('pg');

// PostgreSQL connection configuration
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'projectflow_documents',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: process.env.POSTGRES_PORT || 5432,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        task_id VARCHAR(50) NOT NULL,
        team_id VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(50) NOT NULL,
        team_id VARCHAR(50) NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        submission_text TEXT,
        status VARCHAR(20) DEFAULT 'submitted',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        graded_at TIMESTAMP,
        grade INTEGER,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create submission_documents table (many-to-many relationship)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS submission_documents (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_team_id ON documents(team_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);
    `);

    console.log('✅ PostgreSQL database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL database:', error);
  }
};

// Export the pool and initialization function
module.exports = {
  pool,
  initializeDatabase
};
