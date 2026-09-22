CREATE TABLE workouts (
                          id UUID PRIMARY KEY,
                          user_id VARCHAR(128) NOT NULL,
                          name VARCHAR(150) NOT NULL,
                          description VARCHAR(1000),
                          workout_date DATE NOT NULL,
                          duration_minutes INTEGER,
                          calories_burned INTEGER,
                          created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                          updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

                          CONSTRAINT chk_workout_duration
                              CHECK (
                                  duration_minutes IS NULL
                                      OR duration_minutes > 0
                                  ),

                          CONSTRAINT chk_workout_calories
                              CHECK (
                                  calories_burned IS NULL
                                      OR calories_burned >= 0
                                  )
);

CREATE INDEX idx_workouts_user_id
    ON workouts(user_id);

CREATE INDEX idx_workouts_user_date
    ON workouts(user_id, workout_date);