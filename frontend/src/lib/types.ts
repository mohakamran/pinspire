export type User = {
  id: number;
  name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  email?: string;
  followers_count?: number;
  following_count?: number;
  pins_count?: number;
  is_following?: boolean;
  is_me: boolean;
};

export type Pin = {
  id: number;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string;
  image_width: number;
  image_height: number;
  dominant_color: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  is_liked: boolean;
  is_saved: boolean;
  is_owner: boolean;
  user?: User;
  created_at: string;
};

export type Board = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_private: boolean;
  pins_count?: number;
  cover_images?: string[];
  has_pin?: boolean;
  is_owner: boolean;
  user?: User;
  updated_at: string;
};

export type Comment = {
  id: number;
  body: string;
  user?: User;
  can_delete: boolean;
  created_at: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};
