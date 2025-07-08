/*
  # Create item_images table

  1. New Tables
    - `item_images`
      - `id` (uuid, primary key)
      - `menu_item_id` (uuid, foreign key to menu_items.id)
      - `image_url` (text, not null)
      - `source` (text, default 'google_cse')
      - `is_primary` (boolean, default false)

  2. Security
    - Enable RLS on `item_images` table
    - Add policies for users to manage images from their own menu items
*/

-- Create the item_images table
CREATE TABLE IF NOT EXISTS item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source text DEFAULT 'google_cse',
  is_primary boolean DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS item_images_menu_item_id_idx ON item_images(menu_item_id);
CREATE INDEX IF NOT EXISTS item_images_is_primary_idx ON item_images(menu_item_id, is_primary);

-- Enable RLS
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read images from own menu items"
  ON item_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items 
      JOIN menus ON menus.id = menu_items.menu_id
      WHERE menu_items.id = item_images.menu_item_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert images to own menu items"
  ON item_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items 
      JOIN menus ON menus.id = menu_items.menu_id
      WHERE menu_items.id = item_images.menu_item_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update images from own menu items"
  ON item_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items 
      JOIN menus ON menus.id = menu_items.menu_id
      WHERE menu_items.id = item_images.menu_item_id 
      AND menus.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items 
      JOIN menus ON menus.id = menu_items.menu_id
      WHERE menu_items.id = item_images.menu_item_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from own menu items"
  ON item_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items 
      JOIN menus ON menus.id = menu_items.menu_id
      WHERE menu_items.id = item_images.menu_item_id 
      AND menus.user_id = auth.uid()
    )
  );