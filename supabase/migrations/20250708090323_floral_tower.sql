/*
  # Create menu_items table

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `menu_id` (uuid, foreign key to menus.id)
      - `item_name` (text, not null)
      - `description` (text, nullable)
      - `price` (numeric, nullable)
      - `currency` (text, nullable)
      - `order_index` (integer, nullable)

  2. Security
    - Enable RLS on `menu_items` table
    - Add policies for users to manage items from their own menus
*/

-- Create the menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  description text,
  price numeric(10, 2),
  currency text DEFAULT 'USD',
  order_index integer
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS menu_items_menu_id_idx ON menu_items(menu_id);
CREATE INDEX IF NOT EXISTS menu_items_order_idx ON menu_items(menu_id, order_index);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read menu items from own menus"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert menu items to own menus"
  ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update menu items from own menus"
  ON menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete menu items from own menus"
  ON menu_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );