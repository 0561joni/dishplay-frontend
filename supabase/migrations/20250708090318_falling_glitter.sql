/*
  # Create menus table

  1. New Tables
    - `menus`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users.id)
      - `original_image_url` (text, nullable)
      - `processed_at` (timestamp with timezone)
      - `status` (text, default 'processing')

  2. Security
    - Enable RLS on `menus` table
    - Add policies for users to manage their own menus
*/

-- Create the menus table
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_image_url text,
  processed_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')) NOT NULL
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS menus_user_id_idx ON menus(user_id);

-- Enable RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own menus"
  ON menus
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own menus"
  ON menus
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own menus"
  ON menus
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own menus"
  ON menus
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);