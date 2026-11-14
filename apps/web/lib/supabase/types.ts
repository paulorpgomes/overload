/**
 * Hand-maintained mirror of `supabase/migrations`. Regenerate with
 * `supabase gen types typescript --local` once the CLI is wired up.
 */

export type Goal = "lose_fat" | "gain_muscle" | "maintain" | "performance"

export type ExerciseCategory =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "cardio"
  | "full_body"

export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  goal: Goal | null
  height_cm: number | null
  weight_kg: number | null
  birth_date: string | null
  calorie_target: number | null
  protein_target_g: number | null
  carb_target_g: number | null
  fat_target_g: number | null
  onboarded_at: string | null
  created_at: string
}

export type Exercise = {
  id: string
  name: string
  category: ExerciseCategory
  equipment: string | null
  created_by: string | null
  is_public: boolean
  created_at: string
}

export type Workout = {
  id: string
  user_id: string
  performed_on: string
  name: string | null
  notes: string | null
  duration_min: number | null
  created_at: string
}

export type WorkoutSet = {
  id: string
  workout_id: string
  exercise_id: string
  user_id: string
  performed_on: string
  set_number: number
  reps: number
  weight_kg: number
  rpe: number | null
  is_warmup: boolean
  created_at: string
}

export type Meal = {
  id: string
  user_id: string
  eaten_on: string
  meal_type: MealType
  name: string | null
  created_at: string
}

export type MealItem = {
  id: string
  meal_id: string
  user_id: string
  name: string
  quantity_g: number | null
  calories: number
  protein_g: number
  carb_g: number
  fat_g: number
  food_catalog_id: string | null
  entry_source: "manual" | "photo_catalog" | "photo_manual"
  created_at: string
}

export type FoodCatalog = {
  id: string
  source_code: string
  name: string
  synonyms: string[]
  calories_per_100g: number
  protein_per_100g: number
  carb_per_100g: number
  fat_per_100g: number
  source_name: string
  source_url: string
  source_version: string
  created_at: string
}

export type PhotoMealSubmission = {
  id: string
  user_id: string
  request_id: string
  meal_id: string
  eaten_on: string
  created_at: string
}

export type PhotoAnalysisRequest = {
  id: number
  user_id: string
  created_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string | null
  image_path: string | null
  workout_id: string | null
  created_at: string
}

export type PostLike = {
  post_id: string
  user_id: string
  created_at: string
}

export type PostComment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

export type ExerciseProgressionRow = {
  performed_on: string
  top_weight_kg: number
  est_one_rm: number
  total_volume_kg: number
  total_sets: number
  total_reps: number
}

export type DailyNutritionRow = {
  calories: number
  protein_g: number
  carb_g: number
  fat_g: number
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        Partial<Profile> & Pick<Profile, "id">,
        Partial<Profile>
      >
      exercises: Table<
        Exercise,
        Pick<Exercise, "name" | "category"> & Partial<Exercise>
      >
      workouts: Table<Workout, Pick<Workout, "user_id"> & Partial<Workout>>
      workout_sets: Table<
        WorkoutSet,
        Pick<WorkoutSet, "workout_id" | "exercise_id" | "set_number" | "reps"> &
          Partial<WorkoutSet>
      >
      meals: Table<Meal, Pick<Meal, "user_id" | "meal_type"> & Partial<Meal>>
      meal_items: Table<
        MealItem,
        Pick<MealItem, "meal_id" | "name"> & Partial<MealItem>
      >
      food_catalog: Table<
        FoodCatalog,
        Pick<
          FoodCatalog,
          | "source_code"
          | "name"
          | "calories_per_100g"
          | "protein_per_100g"
          | "carb_per_100g"
          | "fat_per_100g"
          | "source_name"
          | "source_url"
          | "source_version"
        > &
          Partial<FoodCatalog>
      >
      photo_meal_submissions: Table<PhotoMealSubmission>
      photo_analysis_requests: Table<PhotoAnalysisRequest>
      posts: Table<Post, Pick<Post, "user_id"> & Partial<Post>>
      post_likes: Table<PostLike, Pick<PostLike, "post_id" | "user_id">>
      post_comments: Table<
        PostComment,
        Pick<PostComment, "post_id" | "user_id" | "content"> &
          Partial<PostComment>
      >
    }
    Views: Record<never, never>
    Functions: {
      exercise_progression: {
        Args: { p_exercise_id: string; p_limit?: number }
        Returns: ExerciseProgressionRow[]
      }
      daily_nutrition: {
        Args: { p_day?: string }
        Returns: DailyNutritionRow[]
      }
      reserve_photo_analysis: {
        Args: Record<never, never>
        Returns: boolean
      }
      save_photo_meal: {
        Args: {
          p_request_id: string
          p_eaten_on: string
          p_meal_type: MealType
          p_items: unknown
        }
        Returns: string
      }
    }
    Enums: {
      goal: Goal
      exercise_category: ExerciseCategory
      meal_type: MealType
    }
    CompositeTypes: Record<never, never>
  }
}
