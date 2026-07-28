-- Community feature tables — run on DEV project (rzchgkkqkahchxxaekal)

-- Public profile fields
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Trees can be public (opt-in when posting)
ALTER TABLE trees ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Community posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tree_id uuid REFERENCES trees(id) ON DELETE SET NULL,
  photo_id uuid REFERENCES photos(id) ON DELETE SET NULL,
  text text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can read posts
CREATE POLICY "Anyone can read posts" ON community_posts FOR SELECT TO authenticated USING (true);
-- Users can create their own posts
CREATE POLICY "Users create own posts" ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Users can delete their own posts
CREATE POLICY "Users delete own posts" ON community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Likes
CREATE TABLE IF NOT EXISTS community_likes (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read likes" ON community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own likes" ON community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own likes" ON community_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own comments" ON community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Follows
CREATE TABLE IF NOT EXISTS community_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read follows" ON community_follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own follows" ON community_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users remove own follows" ON community_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_likes_post ON community_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_follower ON community_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_community_follows_following ON community_follows(following_id);
