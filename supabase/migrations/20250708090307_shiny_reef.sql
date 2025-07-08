/*
  # Create users table and authentication setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key, matches auth.users.id)
      - `email` (text, unique, indexed)
      - `first_name` (text, nullable)
      - `last_name` (text, nullable)
      - `birthday` (date, nullable)
      - `gender` (text, nullable)
      - `credits` (integer, default 50)
      - `created_at` (timestamp with timezone)
      - `updated_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users to manage their own data
    - Create trigger for automatic updated_at timestamp
    - Create trigger for automatic user creation on auth signup

  3. Functions
    - `update_updated_at_column()` - Updates the updated_at timestamp
    - `handle_new_user()` - Creates user profile on auth signup
*/

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  birthday date,
  gender text CHECK (gender IN ('Male', 'Female', 'Other')),
  credits integer DEFAULT 50 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on email for faster queries
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, credits)
  VALUES (NEW.id, NEW.email, 50);
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();